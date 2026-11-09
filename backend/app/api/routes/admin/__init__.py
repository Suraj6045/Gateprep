from fastapi import APIRouter, Depends

from app.core.cache_utils import clear_catalog_cache_after_write

from .users import router as users_router
from .tests import router as tests_router
from .questions import router as questions_router

router = APIRouter(prefix="/admin", tags=["Admin"])

router.include_router(users_router)
# Test/question writes change the cached student catalog (titles, publish
# state, question_count, total_marks), so they invalidate it.
_invalidate_catalog = [Depends(clear_catalog_cache_after_write)]
router.include_router(tests_router, dependencies=_invalidate_catalog)
router.include_router(questions_router, dependencies=_invalidate_catalog)
