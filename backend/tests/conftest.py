import pytest

import app.core.csrf as csrf_module
from app.core.limiter import limiter


@pytest.fixture(autouse=True)
def _disable_rate_limiter():
    """Disable rate limiting during tests to prevent cross-test 429 errors."""
    limiter.enabled = False
    yield
    limiter.enabled = True


@pytest.fixture(autouse=True)
def _disable_csrf_check():
    """Disable CSRF header check during tests so test clients don't need
    to send X-Requested-With on every POST/PATCH/DELETE."""
    csrf_module.csrf_enabled = False
    yield
    csrf_module.csrf_enabled = True
