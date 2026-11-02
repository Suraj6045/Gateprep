from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.models import TestAttempt, TestStatus
from app.api.routes.tests.helpers import (
    MAX_REATTEMPTS,
    _attempt_progress,
    _first_submitted_attempt,
    _percentage,
    _submitted_attempts_query,
)
from app.api.routes.tests.schemas import HistoryResponse, MyAttemptResponse

router = APIRouter()


def _as_utc(value: datetime | None) -> datetime:
    if value is None:
        return datetime.min.replace(tzinfo=timezone.utc)
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


@router.get("/{test_id}/my-attempts", response_model=list[MyAttemptResponse])
def my_attempts(
    test_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)
):
    first_attempt = _first_submitted_attempt(db, current_user.id, test_id)
    if not first_attempt:
        return []

    submitted_count = _submitted_attempts_query(db, current_user.id, test_id).count()
    progress = _attempt_progress(db, current_user.id, test_id, submitted_count)

    return [
        {
            "attempt_id": first_attempt.id,
            "attempt_number": 1,
            "counts_for_leaderboard": True,
            "is_first": True,
            "status": first_attempt.status,
            "score": first_attempt.score,
            "total_marks": first_attempt.total_marks,
            "percentage": _percentage(
                first_attempt.score, first_attempt.total_marks, 1
            ),
            "started_at": first_attempt.started_at,
            "submitted_at": first_attempt.submitted_at,
            "attempts_remaining": max(0, MAX_REATTEMPTS + 1 - progress["total_used"]),
        }
    ]


@router.get("/my/history", response_model=list[HistoryResponse])
def my_history(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    attempts = (
        db.query(TestAttempt)
        .filter(
            TestAttempt.user_id == current_user.id,
            TestAttempt.status == TestStatus.submitted,
        )
        .order_by(TestAttempt.id.asc())
        .all()
    )

    first_by_test: dict[int, TestAttempt] = {}
    for attempt in attempts:
        first_by_test.setdefault(attempt.test_id, attempt)

    first_attempts = sorted(
        first_by_test.values(),
        key=lambda a: _as_utc(a.started_at or a.submitted_at),
        reverse=True,
    )

    return [
        {
            "id": a.id,
            "test_id": a.test_id,
            "status": a.status,
            "started_at": a.started_at,
            "submitted_at": a.submitted_at,
            "score": a.score,
            "total_marks": a.total_marks,
            "tab_violations": a.tab_violations,
            "fullscreen_violations": a.fullscreen_violations,
        }
        for a in first_attempts
    ]
