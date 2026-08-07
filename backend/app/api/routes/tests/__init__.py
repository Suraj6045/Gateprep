from fastapi import APIRouter

from .attempts import (
    save_answers,
    start_test,
    submit_test,
)
from .history import my_history
from .results import get_result
from .schemas import AnswerSubmit, BulkAnswerSubmit

from .catalog import list_tests, get_test
from .attempts import router as attempts_router
from .results import router as results_router
from .leaderboard import router as leaderboard_router
from .history import router as history_router

router = APIRouter(prefix="/tests", tags=["Tests"])

router.add_api_route("", list_tests, methods=["GET"])
router.add_api_route("/{test_id}", get_test, methods=["GET"])
router.include_router(attempts_router)
router.include_router(results_router)
router.include_router(leaderboard_router)
router.include_router(history_router)

# Re-exports for tests/test_attempt_persistence.py
__all__ = [
    "AnswerSubmit",
    "BulkAnswerSubmit",
    "get_result",
    "my_history",
    "save_answers",
    "start_test",
    "submit_test",
]
