from fastapi import APIRouter, Depends, HTTPException
from fastapi_cache.decorator import cache
from sqlalchemy.orm import Session

from app.api.deps import require_aspirant
from app.core.database import get_db
from app.models.models import Test
from app.api.routes.tests.helpers import _get_first_attempts

router = APIRouter()


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
    if current_user is None and len(args) >= 3:
        current_user = args[2]

    user_id = getattr(current_user, "id", "unknown")
    return (
        f"{namespace}:{func.__module__}:{func.__name__}:test:{test_id}:user:{user_id}"
    )


@router.get("/{test_id}/leaderboard")
@cache(expire=60, key_builder=_leaderboard_cache_key_builder)
def get_leaderboard(
    test_id: int, db: Session = Depends(get_db), current_user=Depends(require_aspirant)
):
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    first_attempts = _get_first_attempts(test_id, db)

    leaderboard = []
    current_user_rank = None
    for rank, attempt in enumerate(first_attempts, 1):
        score = attempt.score or 0.0
        pct = round(score / attempt.total_marks * 100, 1) if attempt.total_marks else 0
        if attempt.user_id == current_user.id:
            current_user_rank = rank
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
        "total_participants": len(leaderboard),
        "current_user_rank": current_user_rank,
        "leaderboard": leaderboard,
    }
