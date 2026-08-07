from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload, selectinload

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.models import Test, TestAttempt, TestStatus
from app.api.routes.tests.helpers import (
    MAX_REATTEMPTS,
    _attempt_progress,
    _submitted_attempts_query,
)
from app.api.routes.tests.result_builder import _attempt_answer_details, _result_payload

router = APIRouter()


@router.get("/attempt/{attempt_id}/result")
def get_result(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    attempt = (
        db.query(TestAttempt)
        .options(
            joinedload(TestAttempt.test).selectinload(Test.questions),
            selectinload(TestAttempt.answers),
        )
        .filter(TestAttempt.id == attempt_id, TestAttempt.user_id == current_user.id)
        .first()
    )
    if not attempt or attempt.status != TestStatus.submitted:
        raise HTTPException(status_code=404, detail="Result not found")

    test = attempt.test
    all_user_attempts = (
        _submitted_attempts_query(db, current_user.id, test.id)
        .order_by(TestAttempt.id.asc())
        .all()
    )
    attempt_number = next(
        (i + 1 for i, a in enumerate(all_user_attempts) if a.id == attempt_id), 1
    )
    is_first = attempt_number == 1

    progress = _attempt_progress(db, current_user.id, test.id, len(all_user_attempts))
    total_marks = attempt.total_marks or sum(q.marks for q in test.questions)

    return _result_payload(
        attempt_id=attempt_id,
        client_result_id=None,
        attempt_number=attempt_number,
        attempts_remaining=max(0, MAX_REATTEMPTS + 1 - progress["total_used"]),
        counts_for_leaderboard=is_first,
        persisted=True,
        test=test,
        score=attempt.score or 0,
        total_marks=total_marks,
        submitted_at=attempt.submitted_at,
        tab_violations=attempt.tab_violations,
        answer_details=_attempt_answer_details(test, attempt.answers),
        current_user=current_user,
        db=db,
    )
