from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from app.core.database import get_db
from app.api.deps import require_aspirant, get_current_user
from app.models.models import Test, Question, TestAttempt, UserAnswer, TestStatus, OTPToken
from app.services.scoring import evaluate_answer

router = APIRouter(prefix="/tests", tags=["Tests"])

MAX_REATTEMPTS = 5  # max reattempts per test (6 total including first)


# ── Schemas ───────────────────────────────────────────────────────

class AnswerSubmit(BaseModel):
    question_id: int
    selected_answer: Optional[str] = None
    time_spent_seconds: int = 0

class BulkAnswerSubmit(BaseModel):
    answers: List[AnswerSubmit]

class ViolationUpdate(BaseModel):
    tab_violations: Optional[int] = None
    fullscreen_violations: Optional[int] = None


# ── Background task: clean expired OTPs ──────────────────────────

def cleanup_expired_otps(db: Session):
    """Delete all OTP tokens older than 1 hour. Runs as background task."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=1)
    deleted = db.query(OTPToken).filter(OTPToken.expires_at < cutoff).delete()
    db.commit()
    if deleted > 0:
        print(f"[Cleanup] Deleted {deleted} expired OTP tokens")


# ── Tests ─────────────────────────────────────────────────────────

@router.get("")
def list_tests(db: Session = Depends(get_db), _=Depends(require_aspirant)):
    tests = db.query(Test).filter(Test.is_published == True).order_by(Test.created_at.desc()).all()
    return [{
        "id": t.id, "title": t.title, "description": t.description,
        "duration_minutes": t.duration_minutes, "total_marks": t.total_marks,
        "question_count": len(t.questions), "series_id": t.series_id,
        "created_at": t.created_at,
        "category": t.category, "series_name": t.series_name,
        "test_type": t.test_type, "subject": t.subject
    } for t in tests]


@router.get("/{test_id}")
def get_test(test_id: int, db: Session = Depends(get_db), _=Depends(require_aspirant)):
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    return {
        "id": test.id, "title": test.title, "description": test.description,
        "duration_minutes": test.duration_minutes, "total_marks": test.total_marks,
        "question_count": len(test.questions), "series_id": test.series_id,
        "created_at": test.created_at
    }


# ── Attempt ───────────────────────────────────────────────────────

@router.post("/{test_id}/start")
def start_test(
    test_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user=Depends(require_aspirant)
):
    test = db.query(Test).filter(Test.id == test_id, Test.is_published == True).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    # Count existing SUBMITTED attempts only
    attempt_count = db.query(TestAttempt).filter(
        TestAttempt.user_id == current_user.id,
        TestAttempt.test_id == test_id,
        TestAttempt.status == TestStatus.submitted
    ).count()

    # Enforce reattempt limit
    if attempt_count > MAX_REATTEMPTS:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum attempts ({MAX_REATTEMPTS + 1}) reached for this test."
        )

    # Delete any leftover in-progress attempt (user exited without submitting)
    db.query(TestAttempt).filter(
        TestAttempt.user_id == current_user.id,
        TestAttempt.test_id == test_id,
        TestAttempt.status == TestStatus.in_progress
    ).delete()
    db.commit()

    # Always create a fresh attempt
    attempt = TestAttempt(
        user_id=current_user.id,
        test_id=test_id,
        status=TestStatus.in_progress,
        started_at=datetime.now(timezone.utc)
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    # Clean up expired OTPs in background (runs async, doesn't slow response)
    background_tasks.add_task(cleanup_expired_otps, db)

    # attempt_number = previous submitted + 1 (this new attempt)
    attempt_number  = attempt_count + 1
    max_attempts    = MAX_REATTEMPTS + 1

    return {
        **_attempt_out(attempt),
        "attempt_number": attempt_number,
        "max_attempts": max_attempts
    }


def _attempt_out(a: TestAttempt) -> dict:
    return {
        "id": a.id, "test_id": a.test_id, "status": a.status,
        "started_at": a.started_at, "submitted_at": a.submitted_at,
        "score": a.score, "total_marks": a.total_marks,
        "tab_violations": a.tab_violations, "fullscreen_violations": a.fullscreen_violations
    }


def _is_first_attempt(attempt_id: int, user_id: int, test_id: int, db: Session) -> bool:
    """Check if this is the user's first attempt at this test."""
    first = db.query(TestAttempt).filter(
        TestAttempt.user_id == user_id,
        TestAttempt.test_id == test_id
    ).order_by(TestAttempt.id.asc()).first()
    return first and first.id == attempt_id


@router.get("/{test_id}/attempt/{attempt_id}/questions")
def get_questions(
    test_id: int, attempt_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_aspirant)
):
    attempt = db.query(TestAttempt).filter(
        TestAttempt.id == attempt_id,
        TestAttempt.user_id == current_user.id
    ).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt.status == TestStatus.submitted:
        raise HTTPException(status_code=400, detail="Test already submitted")

    questions = db.query(Question).filter(
        Question.test_id == test_id
    ).order_by(Question.order_index).all()

    return [{
        "id": q.id, "question_type": q.question_type,
        "question_text": q.question_text, "question_image_url": q.question_image_url,
        "options": q.options, "option_images": q.option_images,
        "order_index": q.order_index, "marks": q.marks,
        "negative_marks": q.negative_marks, "subject": q.subject, "topic": q.topic
    } for q in questions]


@router.patch("/{test_id}/attempt/{attempt_id}/violations")
def update_violations(
    test_id: int, attempt_id: int,
    payload: ViolationUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_aspirant)
):
    attempt = db.query(TestAttempt).filter(
        TestAttempt.id == attempt_id,
        TestAttempt.user_id == current_user.id
    ).first()
    if not attempt or attempt.status == TestStatus.submitted:
        raise HTTPException(status_code=400, detail="Invalid attempt")

    if payload.tab_violations is not None:
        attempt.tab_violations = payload.tab_violations
    if payload.fullscreen_violations is not None:
        attempt.fullscreen_violations = payload.fullscreen_violations
    db.commit()
    return {"message": "Updated"}


@router.post("/{test_id}/attempt/{attempt_id}/save")
def save_answers(
    test_id: int, attempt_id: int,
    payload: BulkAnswerSubmit,
    db: Session = Depends(get_db),
    current_user=Depends(require_aspirant)
):
    attempt = db.query(TestAttempt).filter(
        TestAttempt.id == attempt_id,
        TestAttempt.user_id == current_user.id
    ).first()
    if not attempt or attempt.status == TestStatus.submitted:
        raise HTTPException(status_code=400, detail="Invalid attempt")

    existing = {a.question_id: a for a in attempt.answers}
    for ans in payload.answers:
        if ans.question_id in existing:
            existing[ans.question_id].selected_answer = ans.selected_answer
            existing[ans.question_id].time_spent_seconds = ans.time_spent_seconds
        else:
            db.add(UserAnswer(
                attempt_id=attempt_id,
                question_id=ans.question_id,
                selected_answer=ans.selected_answer,
                time_spent_seconds=ans.time_spent_seconds
            ))
    db.commit()
    return {"message": "Saved"}


@router.post("/{test_id}/attempt/{attempt_id}/submit")
def submit_test(
    test_id: int, attempt_id: int,
    payload: BulkAnswerSubmit,
    db: Session = Depends(get_db),
    current_user=Depends(require_aspirant)
):
    attempt = db.query(TestAttempt).filter(
        TestAttempt.id == attempt_id,
        TestAttempt.user_id == current_user.id
    ).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt.status == TestStatus.submitted:
        raise HTTPException(status_code=400, detail="Already submitted")

    questions = {q.id: q for q in db.query(Question).filter(Question.test_id == test_id).all()}
    db.query(UserAnswer).filter(UserAnswer.attempt_id == attempt_id).delete()

    total_marks = sum(q.marks for q in questions.values())
    earned = 0.0

    is_first = _is_first_attempt(attempt_id, current_user.id, test_id, db)

    for ans in payload.answers:
        q = questions.get(ans.question_id)
        if not q:
            continue

        is_correct, marks = evaluate_answer(q, ans.selected_answer)
        earned += marks

        # KEY OPTIMIZATION:
        # First attempt → store full answer data (needed for result review + leaderboard)
        # Reattempts → only store if answered (skip nulls to save DB space)
        if is_first:
            # Always store for first attempt (even skipped, for result review)
            db.add(UserAnswer(
                attempt_id=attempt_id,
                question_id=ans.question_id,
                selected_answer=ans.selected_answer,
                is_correct=is_correct,
                marks_awarded=marks,
                time_spent_seconds=ans.time_spent_seconds
            ))
        else:
            # Reattempt: only store answered questions (skip nulls → saves storage)
            if ans.selected_answer is not None:
                db.add(UserAnswer(
                    attempt_id=attempt_id,
                    question_id=ans.question_id,
                    selected_answer=ans.selected_answer,
                    is_correct=is_correct,
                    marks_awarded=marks,
                    time_spent_seconds=ans.time_spent_seconds
                ))

    attempt.status = TestStatus.submitted
    attempt.submitted_at = datetime.now(timezone.utc)
    attempt.score = max(0.0, round(earned, 2))
    attempt.total_marks = total_marks
    db.commit()
    db.refresh(attempt)
    return _attempt_out(attempt)


# ── Result ────────────────────────────────────────────────────────

@router.get("/attempt/{attempt_id}/result")
def get_result(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    attempt = db.query(TestAttempt).filter(
        TestAttempt.id == attempt_id,
        TestAttempt.user_id == current_user.id
    ).first()
    if not attempt or attempt.status != TestStatus.submitted:
        raise HTTPException(status_code=404, detail="Result not found")

    test = attempt.test
    answers = attempt.answers
    questions = {q.id: q for q in test.questions}

    correct = sum(1 for a in answers if a.is_correct is True)
    incorrect = sum(1 for a in answers if a.is_correct is False)
    answered_count = len(answers)
    skipped = len(questions) - answered_count
    pct = round(attempt.score / attempt.total_marks * 100, 2) if attempt.total_marks else 0

    # Stats from first attempts only
    first_attempts = _get_first_attempts(test.id, db)
    avg_score = round(
        sum(a.score for a in first_attempts if a.score is not None) / len(first_attempts), 2
    ) if first_attempts else 0
    avg_pct = round(avg_score / attempt.total_marks * 100, 2) if attempt.total_marks else 0

    # Topper
    sorted_attempts = sorted(first_attempts, key=lambda a: a.score or 0, reverse=True)
    topper = sorted_attempts[0] if sorted_attempts else None
    topper_data = None
    topper_answers_map = {}
    if topper:
        topper_answers_map = {ua.question_id: ua for ua in topper.answers}
        topper_data = {
            "user_id": topper.user_id,
            "full_name": topper.user.full_name,
            "score": topper.score,
            "total_marks": topper.total_marks,
            "percentage": round(topper.score / topper.total_marks * 100, 2) if topper.total_marks else 0,
        }

    # User rank
    rank = next((i + 1 for i, a in enumerate(sorted_attempts) if a.user_id == current_user.id), None)

    # Attempt number
    all_user_attempts = db.query(TestAttempt).filter(
        TestAttempt.user_id == current_user.id,
        TestAttempt.test_id == test.id,
        TestAttempt.status == TestStatus.submitted
    ).order_by(TestAttempt.id.asc()).all()
    attempt_number = next((i + 1 for i, a in enumerate(all_user_attempts) if a.id == attempt_id), 1)
    is_first = attempt_number == 1

    # Remaining attempts
    total_attempts_used = len(all_user_attempts)
    attempts_remaining = max(0, MAX_REATTEMPTS + 1 - total_attempts_used)

    # Answer details (full for first attempt, limited for reattempts)
    answers_map = {a.question_id: a for a in answers}
    answer_details = []
    for q in sorted(test.questions, key=lambda x: x.order_index):
        ua = answers_map.get(q.id)
        topper_ua = topper_answers_map.get(q.id)
        answer_details.append({
            "question_id": q.id,
            "question_text": q.question_text,
            "question_type": q.question_type,
            "question_image_url": q.question_image_url,
            "options": q.options,
            "option_images": q.option_images,
            "correct_answer": q.correct_answer,
            "selected_answer": ua.selected_answer if ua else None,
            "is_correct": ua.is_correct if ua else None,
            "marks_awarded": ua.marks_awarded if ua else 0,
            "marks": q.marks,
            "negative_marks": q.negative_marks,
            "time_spent_seconds": ua.time_spent_seconds if ua else 0,
            "topper_answer": topper_ua.selected_answer if topper_ua else None,
            "topper_time_seconds": topper_ua.time_spent_seconds if topper_ua else 0,
        })

    return {
        "attempt_id": attempt_id,
        "attempt_number": attempt_number,
        "attempts_remaining": attempts_remaining,
        "max_attempts": MAX_REATTEMPTS + 1,
        "counts_for_leaderboard": is_first,
        "test_id": test.id,
        "test_title": test.title,
        "score": attempt.score,
        "total_marks": attempt.total_marks,
        "percentage": pct,
        "correct": correct,
        "incorrect": incorrect,
        "skipped": skipped,
        "submitted_at": attempt.submitted_at,
        "tab_violations": attempt.tab_violations,
        "rank": rank,
        "total_participants": len(first_attempts),
        "average_score": avg_score,
        "average_percentage": avg_pct,
        "topper": topper_data,
        "answers": answer_details
    }


def _get_first_attempts(test_id: int, db: Session) -> list:
    all_submitted = (
        db.query(TestAttempt)
        .filter(TestAttempt.test_id == test_id, TestAttempt.status == TestStatus.submitted)
        .order_by(TestAttempt.id.asc())
        .all()
    )
    seen = set()
    first = []
    for a in all_submitted:
        if a.user_id not in seen:
            seen.add(a.user_id)
            first.append(a)
    return first


# ── Leaderboard ───────────────────────────────────────────────────

@router.get("/{test_id}/leaderboard")
def get_leaderboard(test_id: int, db: Session = Depends(get_db), current_user=Depends(require_aspirant)):
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    first_attempts = _get_first_attempts(test_id, db)
    first_attempts.sort(key=lambda a: a.score or 0, reverse=True)

    leaderboard = []
    current_user_rank = None
    for rank, attempt in enumerate(first_attempts, 1):
        pct = round(attempt.score / attempt.total_marks * 100, 1) if attempt.total_marks else 0
        if attempt.user_id == current_user.id:
            current_user_rank = rank
        leaderboard.append({
            "rank": rank,
            "user_id": attempt.user_id,
            "full_name": attempt.user.full_name,
            "score": attempt.score,
            "total_marks": attempt.total_marks,
            "percentage": pct,
            "submitted_at": attempt.submitted_at,
            "tab_violations": attempt.tab_violations,
            "is_current_user": attempt.user_id == current_user.id
        })

    avg = round(sum(a.score or 0 for a in first_attempts) / len(first_attempts), 2) if first_attempts else 0

    return {
        "test_id": test_id,
        "test_title": test.title,
        "total_participants": len(leaderboard),
        "current_user_rank": current_user_rank,
        "average_score": avg,
        "leaderboard": leaderboard
    }


# ── My attempts ───────────────────────────────────────────────────

@router.get("/{test_id}/my-attempts")
def my_attempts(test_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    attempts = db.query(TestAttempt).filter(
        TestAttempt.user_id == current_user.id,
        TestAttempt.test_id == test_id,
        TestAttempt.status == TestStatus.submitted  # only submitted
    ).order_by(TestAttempt.id.asc()).all()

    total = len(attempts)
    return [{
        "attempt_id": a.id,
        "attempt_number": i + 1,
        "counts_for_leaderboard": i == 0,
        "is_first": i == 0,
        "status": a.status,
        "score": a.score,
        "total_marks": a.total_marks,
        "percentage": round(a.score / a.total_marks * 100, 1) if a.total_marks and a.score else 0,
        "started_at": a.started_at,
        "submitted_at": a.submitted_at,
        "attempts_remaining": max(0, MAX_REATTEMPTS + 1 - total)
    } for i, a in enumerate(attempts)]


@router.get("/my/history")
def my_history(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    # Only return submitted attempts — in-progress are ignored
    return db.query(TestAttempt).filter(
        TestAttempt.user_id == current_user.id,
        TestAttempt.status == TestStatus.submitted
    ).order_by(TestAttempt.started_at.desc()).all()
