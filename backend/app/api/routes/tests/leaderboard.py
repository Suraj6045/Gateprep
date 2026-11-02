from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi_cache.decorator import cache
from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session, joinedload

from app.api.deps import require_aspirant
from app.core.database import get_db
from app.models.models import Test, TestAttempt, TestStatus
from app.api.routes.tests.schemas import LeaderboardResponse

router = APIRouter()
DEFAULT_PAGE_SIZE = 50
MAX_PAGE_SIZE = 100


def _leaderboard_cache_key_builder(
    func, namespace="", *, request=None, response=None, args=None, kwargs=None
):
    args = args or ()
    kwargs = kwargs or {}

    test_id = kwargs.get("test_id")
    current_user = kwargs.get("current_user")

    if test_id is None and request is not None:
        test_id = request.path_params.get("test_id")
    if test_id is None and args:
        test_id = args[0]
    if current_user is None:
        current_user = next((arg for arg in args if hasattr(arg, "id")), None)
    user_id = getattr(current_user, "id", "unknown")
    query_params = getattr(request, "query_params", {})
    limit = kwargs.get("limit", query_params.get("limit", DEFAULT_PAGE_SIZE))
    offset = kwargs.get("offset", query_params.get("offset", 0))
    return (
        f"{namespace}:{func.__module__}:{func.__name__}:test:{test_id}:user:{user_id}"
        f":limit:{limit}:offset:{offset}"
    )


@router.get("/{test_id}/leaderboard", response_model=LeaderboardResponse)
@cache(expire=60, key_builder=_leaderboard_cache_key_builder)
def get_leaderboard(
    test_id: int,
    limit: int = Query(default=DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user=Depends(require_aspirant),
):
    test = (
        db.query(Test)
        .filter(Test.id == test_id, Test.is_published.is_(True))
        .first()
    )
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    first_attempt_ids = (
        db.query(func.min(TestAttempt.id).label("attempt_id"))
        .filter(
            TestAttempt.test_id == test_id,
            TestAttempt.status == TestStatus.submitted,
        )
        .group_by(TestAttempt.user_id)
        .subquery()
    )
    first_attempts = db.query(TestAttempt).join(
        first_attempt_ids, TestAttempt.id == first_attempt_ids.c.attempt_id
    )
    total_participants = (
        db.query(func.count()).select_from(first_attempt_ids).scalar() or 0
    )
    page_attempts = (
        first_attempts.options(joinedload(TestAttempt.user))
        .order_by(func.coalesce(TestAttempt.score, 0.0).desc(), TestAttempt.id.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    current_attempt = (
        first_attempts.filter(TestAttempt.user_id == current_user.id).first()
    )
    current_user_rank = None
    if current_attempt:
        current_score = current_attempt.score or 0.0
        score_before = func.coalesce(TestAttempt.score, 0.0)
        current_user_rank = (
            first_attempts.filter(
                or_(
                    score_before > current_score,
                    and_(
                        score_before == current_score,
                        TestAttempt.id < current_attempt.id,
                    ),
                )
            ).count()
            + 1
        )

    leaderboard = []
    for rank, attempt in enumerate(page_attempts, offset + 1):
        score = attempt.score or 0.0
        pct = round(score / attempt.total_marks * 100, 1) if attempt.total_marks else 0
        leaderboard.append(
            {
                "rank": rank,
                "user_id": attempt.user_id,
                "full_name": attempt.user.full_name,
                "score": attempt.score,
                "total_marks": attempt.total_marks,
                "percentage": pct,
                "submitted_at": attempt.submitted_at,
                "tab_violations": attempt.tab_violations,
                "is_current_user": attempt.user_id == current_user.id,
            }
        )

    return {
        "test_id": test_id,
        "test_title": test.title,
        "total_participants": total_participants,
        "current_user_rank": current_user_rank,
        "limit": limit,
        "offset": offset,
        "leaderboard": leaderboard,
    }
