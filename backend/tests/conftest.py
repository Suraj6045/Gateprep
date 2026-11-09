import pytest
from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend

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


@pytest.fixture(autouse=True)
def _reset_response_cache():
    """FastAPICache.init() is a no-op once initialised, so without this the
    in-memory cache (and anything cached by @cache routes such as /tests)
    would leak between tests in the same process. InMemoryBackend also keeps
    its store as a class attribute, so reset() alone does not empty it."""
    FastAPICache.reset()
    InMemoryBackend._store.clear()
    yield
    FastAPICache.reset()
    InMemoryBackend._store.clear()
