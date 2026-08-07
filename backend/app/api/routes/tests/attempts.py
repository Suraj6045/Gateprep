from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import require_aspirant
from app.core.database import get_db
from app.models.models import Question, Test, TestAttempt, TestStatus, UserAnswer
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
from app.api.routes.tests.schemas import BulkAnswerSubmit, ViolationUpdate
from app.api.routes.tests.result_builder import _evaluate_submission, _result_payload

router = APIRouter()


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


def _enforce_reattempt_limit(progress: dict) -> None:
    """Raise if the user has exhausted their allowed attempts."""
    if progress["total_used"] >= MAX_REATTEMPTS + 1:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum attempts ({MAX_REATTEMPTS + 1}) reached for this test.",
        )


def _delete_leftover_attempts(db: Session, user_id: int, test_id: int) -> None:
    """Delete any in-progress attempts and their child answers.

    Bulk-delete child UserAnswers first because the ORM cascade is
    "delete-orphan" but the DB FK on user_answers.attempt_id has no
    ON DELETE CASCADE — skipping the child delete would orphan
    user_answers rows and break FK integrity.
    """
    leftover_attempt_ids = (
        db.query(TestAttempt.id)
        .filter(
            TestAttempt.user_id == user_id,
            TestAttempt.test_id == test_id,
            TestAttempt.status == TestStatus.in_progress,
        )
        .scalar_subquery()
    )
    db.query(UserAnswer).filter(UserAnswer.attempt_id.in_(leftover_attempt_ids)).delete(
        synchronize_session=False
    )
    db.query(TestAttempt).filter(
        TestAttempt.user_id == user_id,
        TestAttempt.test_id == test_id,
        TestAttempt.status == TestStatus.in_progress,
    ).delete(synchronize_session=False)
    db.commit()


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


def _upsert_answers(attempt: TestAttempt, answers: list) -> List[UserAnswer]:
    """Update existing UserAnswers in place; return list of new ones to add."""
    existing = {a.question_id: a for a in attempt.answers}
    new_answers = []
    for ans in answers:
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


@router.post("/{test_id}/start")
def start_test(
    test_id: int, db: Session = Depends(get_db), current_user=Depends(require_aspirant)
):
    test = (
        db.query(Test).filter(Test.id == test_id, Test.is_published.is_(True)).first()
    )
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    progress = _attempt_progress(db, current_user.id, test_id)
    _enforce_reattempt_limit(progress)
    _delete_leftover_attempts(db, current_user.id, test_id)
    attempt = _create_fresh_attempt(db, current_user.id, test_id)

    attempt_number = progress["total_used"] + 1
    max_attempts = MAX_REATTEMPTS + 1

    return {
        **_attempt_out(attempt),
        "attempt_number": attempt_number,
        "max_attempts": max_attempts,
    }


@router.get("/{test_id}/attempt/{attempt_id}/questions")
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


@router.patch("/{test_id}/attempt/{attempt_id}/violations")
def update_violations(
    test_id: int,
    attempt_id: int,
    payload: ViolationUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_aspirant),
):
    attempt = _require_active_attempt(db, current_user.id, test_id, attempt_id)

    if payload.tab_violations is not None:
        attempt.tab_violations = payload.tab_violations
    if payload.fullscreen_violations is not None:
        attempt.fullscreen_violations = payload.fullscreen_violations
    db.commit()
    return {"message": "Updated"}


@router.post("/{test_id}/attempt/{attempt_id}/save")
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

    new_answers = _upsert_answers(attempt, payload.answers)
    if new_answers:
        db.add_all(new_answers)
    db.commit()
    return {"message": "Saved"}


@router.post("/{test_id}/attempt/{attempt_id}/submit")
def submit_test(
    test_id: int,
    attempt_id: int,
    payload: BulkAnswerSubmit,
    db: Session = Depends(get_db),
    current_user=Depends(require_aspirant),
):
    attempt = _get_user_attempt(db, current_user.id, test_id, attempt_id)
    if attempt.status == TestStatus.submitted:
        raise HTTPException(status_code=400, detail="Already submitted")

    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    db.query(UserAnswer).filter(UserAnswer.attempt_id == attempt_id).delete()

    score, total_marks, answer_details = _evaluate_submission(test, payload.answers)
    previous_submission_count = _submitted_attempts_query(
        db, current_user.id, test_id
    ).count()
    is_first = previous_submission_count == 0
    submitted_at = datetime.now(timezone.utc)

    if is_first:
        return _persist_first_submission(
            db, attempt, answer_details, score, total_marks, submitted_at
        )

    return _handle_practice_submission(
        db, current_user, test, attempt, test_id, attempt_id,
        answer_details, score, total_marks, submitted_at,
        previous_submission_count,
    )
