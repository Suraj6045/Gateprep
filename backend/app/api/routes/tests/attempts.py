from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import require_aspirant
from app.core.database import get_db
from app.models.models import Question, Test, TestAttempt, TestStatus, User, UserAnswer
from app.services.cloudinary_service import (
    optimize_delivery_image_url,
    optimize_delivery_image_urls,
)
from app.api.routes.tests.helpers import (
    MAX_REATTEMPTS,
    _attempt_out,
    _attempt_progress,
    _has_previous_submission,
    _set_practice_count,
    _submitted_attempts_query,
)
from app.api.routes.tests.schemas import (
    AttemptStartResponse,
    BulkAnswerSubmit,
    MessageResponse,
    SubmitResponse,
    TestQuestionResponse,
    ViolationUpdate,
)
from app.api.routes.tests.result_builder import _evaluate_submission, _result_payload

router = APIRouter()

SUBMISSION_GRACE_PERIOD = timedelta(seconds=5)


# ---------------------------------------------------------------------------
# Shared helpers — extracted to reduce cyclomatic complexity in route handlers
# ---------------------------------------------------------------------------


def _get_user_attempt(
    db: Session, user_id: int, test_id: int, attempt_id: int
) -> TestAttempt:
    """Fetch a user's attempt, raising 404 if it doesn't exist."""
    attempt = (
        db.query(TestAttempt)
        .filter(
            TestAttempt.id == attempt_id,
            TestAttempt.user_id == user_id,
            TestAttempt.test_id == test_id,
        )
        .first()
    )
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    return attempt


def _require_active_attempt(
    db: Session, user_id: int, test_id: int, attempt_id: int
) -> TestAttempt:
    """Fetch attempt; raise 404 if missing, 400 if already submitted."""
    attempt = _get_user_attempt(db, user_id, test_id, attempt_id)
    if attempt.status == TestStatus.submitted:
        raise HTTPException(status_code=400, detail="Invalid attempt")
    return attempt


def _attempt_deadline(attempt: TestAttempt, test: Test) -> datetime:
    started_at = attempt.started_at
    if started_at is None:
        raise HTTPException(status_code=400, detail="Attempt start time is unavailable")
    if started_at.tzinfo is None:
        # SQLite may return timezone-aware columns as naive datetimes.
        started_at = started_at.replace(tzinfo=timezone.utc)
    else:
        started_at = started_at.astimezone(timezone.utc)
    return (
        started_at
        + timedelta(minutes=test.duration_minutes)
        + SUBMISSION_GRACE_PERIOD
    )


def _is_attempt_expired(
    attempt: TestAttempt, test: Test, now: datetime | None = None
) -> bool:
    return (now or datetime.now(timezone.utc)) > _attempt_deadline(attempt, test)


def _enforce_reattempt_limit(progress: dict) -> None:
    """Raise if the user has exhausted their allowed attempts."""
    if progress["total_used"] >= MAX_REATTEMPTS + 1:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum attempts ({MAX_REATTEMPTS + 1}) reached for this test.",
        )


def _create_fresh_attempt(db: Session, user_id: int, test_id: int) -> TestAttempt:
    """Create and return a new in-progress TestAttempt."""
    attempt = TestAttempt(
        user_id=user_id,
        test_id=test_id,
        status=TestStatus.in_progress,
        started_at=datetime.now(timezone.utc),
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    return attempt


def _upsert_answers(
    db: Session, attempt: TestAttempt, answers: list
) -> List[UserAnswer]:
    """Reconcile a complete answer snapshot and return newly created rows."""
    answers_by_question = {answer.question_id: answer for answer in answers}
    question_ids = set(answers_by_question)
    if question_ids:
        valid_question_ids = {
            row[0]
            for row in db.query(Question.id)
            .filter(
                Question.test_id == attempt.test_id,
                Question.id.in_(question_ids),
            )
            .all()
        }
        if question_ids - valid_question_ids:
            raise HTTPException(
                status_code=400,
                detail="One or more questions do not belong to this test",
            )

    stale_answers = db.query(UserAnswer).filter(UserAnswer.attempt_id == attempt.id)
    if question_ids:
        stale_answers = stale_answers.filter(UserAnswer.question_id.notin_(question_ids))
    stale_answers.delete(synchronize_session=False)

    existing = {a.question_id: a for a in attempt.answers}
    new_answers = []
    for ans in answers_by_question.values():
        if ans.question_id in existing:
            row = existing[ans.question_id]
            row.selected_answer = ans.selected_answer
            row.time_spent_seconds = ans.time_spent_seconds
        else:
            new_answers.append(
                UserAnswer(
                    attempt_id=attempt.id,
                    question_id=ans.question_id,
                    selected_answer=ans.selected_answer,
                    time_spent_seconds=ans.time_spent_seconds,
                )
            )
    return new_answers


def _persist_first_submission(
    db: Session,
    attempt: TestAttempt,
    answer_details: list,
    score: float,
    total_marks: float,
    submitted_at: datetime,
) -> dict:
    """Write scored UserAnswer rows and finalise the attempt for the leaderboard."""
    db.add_all(
        UserAnswer(
            attempt_id=attempt.id,
            question_id=detail["question_id"],
            selected_answer=detail["selected_answer"],
            is_correct=detail["is_correct"],
            marks_awarded=detail["marks_awarded"],
            time_spent_seconds=detail["time_spent_seconds"],
        )
        for detail in answer_details
    )
    attempt.status = TestStatus.submitted
    attempt.submitted_at = submitted_at
    attempt.score = score
    attempt.total_marks = total_marks
    db.commit()
    db.refresh(attempt)
    return {**_attempt_out(attempt), "persisted": True}


def _handle_practice_submission(
    db: Session,
    current_user,
    test: Test,
    attempt: TestAttempt,
    test_id: int,
    attempt_id: int,
    answer_details: list,
    score: float,
    total_marks: float,
    submitted_at: datetime,
    previous_submission_count: int,
) -> dict:
    """Build a practice result payload, bump the practice counter, and delete the attempt."""
    progress_before = _attempt_progress(
        db, current_user.id, test_id, previous_submission_count
    )
    attempt_number = progress_before["total_used"] + 1
    attempts_remaining = max(0, MAX_REATTEMPTS + 1 - attempt_number)
    client_result_id = f"practice-{attempt_id}"

    result = _result_payload(
        attempt_id=client_result_id,
        client_result_id=client_result_id,
        attempt_number=attempt_number,
        attempts_remaining=attempts_remaining,
        counts_for_leaderboard=False,
        persisted=False,
        test=test,
        score=score,
        total_marks=total_marks,
        submitted_at=submitted_at,
        tab_violations=attempt.tab_violations,
        answer_details=answer_details,
        current_user=current_user,
        db=db,
    )

    _set_practice_count(
        db, current_user.id, test_id, progress_before["practice_count"] + 1
    )
    db.delete(attempt)
    db.commit()

    return {"id": client_result_id, "persisted": False, "result": result}


# ---------------------------------------------------------------------------
# Route handlers
# ---------------------------------------------------------------------------


@router.post("/{test_id}/start", response_model=AttemptStartResponse)
def start_test(
    test_id: int, db: Session = Depends(get_db), current_user=Depends(require_aspirant)
):
    test = (
        db.query(Test).filter(Test.id == test_id, Test.is_published.is_(True)).first()
    )
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    db.query(User).filter(User.id == current_user.id).with_for_update().one()
    progress = _attempt_progress(db, current_user.id, test_id)
    attempt = (
        db.query(TestAttempt)
        .filter(
            TestAttempt.user_id == current_user.id,
            TestAttempt.test_id == test_id,
            TestAttempt.status == TestStatus.in_progress,
        )
        .with_for_update()
        .order_by(TestAttempt.id.desc())
        .first()
    )
    if attempt is not None and _is_attempt_expired(attempt, test):
        db.delete(attempt)
        db.flush()
        attempt = None
    if attempt is None:
        _enforce_reattempt_limit(progress)
        attempt = _create_fresh_attempt(db, current_user.id, test_id)

    saved_answers = (
        db.query(UserAnswer)
        .filter(UserAnswer.attempt_id == attempt.id)
        .order_by(UserAnswer.question_id)
        .all()
    )

    attempt_number = progress["total_used"] + 1
    max_attempts = MAX_REATTEMPTS + 1

    return {
        **_attempt_out(attempt),
        "server_time": datetime.now(timezone.utc),
        "answers": [
            {
                "question_id": answer.question_id,
                "selected_answer": answer.selected_answer,
                "time_spent_seconds": answer.time_spent_seconds,
            }
            for answer in saved_answers
        ],
        "attempt_number": attempt_number,
        "max_attempts": max_attempts,
    }


@router.get(
    "/{test_id}/attempt/{attempt_id}/questions",
    response_model=list[TestQuestionResponse],
)
def get_questions(
    test_id: int,
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_aspirant),
):
    attempt = _get_user_attempt(db, current_user.id, test_id, attempt_id)
    if attempt.status == TestStatus.submitted:
        raise HTTPException(status_code=400, detail="Test already submitted")

    questions = (
        db.query(Question)
        .filter(Question.test_id == test_id)
        .order_by(Question.order_index)
        .all()
    )

    return [
        {
            "id": q.id,
            "question_type": q.question_type,
            "question_text": q.question_text,
            "question_image_url": optimize_delivery_image_url(q.question_image_url),
            "options": q.options,
            "option_images": optimize_delivery_image_urls(q.option_images),
            "order_index": q.order_index,
            "marks": q.marks,
            "negative_marks": q.negative_marks,
            "subject": q.subject,
            "topic": q.topic,
        }
        for q in questions
    ]


@router.patch(
    "/{test_id}/attempt/{attempt_id}/violations",
    response_model=MessageResponse,
)
def update_violations(
    test_id: int,
    attempt_id: int,
    payload: ViolationUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_aspirant),
):
    attempt = _require_active_attempt(db, current_user.id, test_id, attempt_id)

    if payload.tab_violations is not None:
        attempt.tab_violations = max(attempt.tab_violations, payload.tab_violations)
    if payload.fullscreen_violations is not None:
        attempt.fullscreen_violations = max(
            attempt.fullscreen_violations, payload.fullscreen_violations
        )
    db.commit()
    return {"message": "Updated"}


@router.post(
    "/{test_id}/attempt/{attempt_id}/save",
    response_model=MessageResponse,
)
def save_answers(
    test_id: int,
    attempt_id: int,
    payload: BulkAnswerSubmit,
    db: Session = Depends(get_db),
    current_user=Depends(require_aspirant),
):
    attempt = _require_active_attempt(db, current_user.id, test_id, attempt_id)

    if _has_previous_submission(db, current_user.id, test_id, attempt_id):
        return {"message": "Practice answers are kept in browser until submit"}

    new_answers = _upsert_answers(db, attempt, payload.answers)
    if new_answers:
        db.add_all(new_answers)
    db.commit()
    return {"message": "Saved"}


@router.post(
    "/{test_id}/attempt/{attempt_id}/submit",
    response_model=SubmitResponse,
)
def submit_test(
    test_id: int,
    attempt_id: int,
    payload: BulkAnswerSubmit,
    db: Session = Depends(get_db),
    current_user=Depends(require_aspirant),
):
    attempt = (
        db.query(TestAttempt)
        .filter(
            TestAttempt.id == attempt_id,
            TestAttempt.user_id == current_user.id,
            TestAttempt.test_id == test_id,
        )
        .with_for_update()
        .first()
    )
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt.status == TestStatus.submitted:
        raise HTTPException(status_code=400, detail="Already submitted")

    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    submitted_at = datetime.now(timezone.utc)
    if _is_attempt_expired(attempt, test, now=submitted_at):
        db.delete(attempt)
        db.commit()
        raise HTTPException(
            status_code=400,
            detail="Test attempt expired. Please start a new attempt.",
        )

    db.query(UserAnswer).filter(UserAnswer.attempt_id == attempt_id).delete()

    score, total_marks, answer_details = _evaluate_submission(test, payload.answers)
    previous_submission_count = _submitted_attempts_query(
        db, current_user.id, test_id
    ).count()
    _enforce_reattempt_limit(
        _attempt_progress(db, current_user.id, test_id, previous_submission_count)
    )
    is_first = previous_submission_count == 0
    if is_first:
        return _persist_first_submission(
            db, attempt, answer_details, score, total_marks, submitted_at
        )

    return _handle_practice_submission(
        db, current_user, test, attempt, test_id, attempt_id,
        answer_details, score, total_marks, submitted_at,
        previous_submission_count,
    )
