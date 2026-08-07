from fastapi import APIRouter

from .users import router as users_router
from .tests import router as tests_router
from .questions import router as questions_router

router = APIRouter(prefix="/admin", tags=["Admin"])

router.include_router(users_router)
router.include_router(tests_router)
router.include_router(questions_router)
