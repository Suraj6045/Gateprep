import asyncio

import pytest
from sqlalchemy.exc import ArgumentError

import app.main as main_module
from app.core.config import (
    PASSWORD_URL_ENCODING_MESSAGE,
    _is_local_origin,
    normalize_database_url,
)


def test_normalize_database_url_raises_helpful_error_for_malformed_url(monkeypatch):
    malformed_url = "postgresql://user:pass@localhost:5432/db"

    def fake_make_url(_raw_url):
        raise ArgumentError("malformed URL")

    monkeypatch.setattr("app.core.config.make_url", fake_make_url)

    with pytest.raises(ValueError, match="DATABASE_URL appears malformed") as exc_info:
        normalize_database_url(malformed_url)

    assert str(exc_info.value) == PASSWORD_URL_ENCODING_MESSAGE


@pytest.mark.parametrize(
    "origin",
    [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://[::1]:5173",
    ],
)
def test_is_local_origin_matches_exact_loopback_hosts(origin):
    assert _is_local_origin(origin)


@pytest.mark.parametrize(
    "origin",
    [
        "http://localhost.attacker.com",
        "http://127.0.0.1.attacker.com",
    ],
)
def test_is_local_origin_rejects_hosts_containing_loopback_names(origin):
    assert not _is_local_origin(origin)


def test_remote_redis_host_containing_localhost_does_not_use_memory_fallback(
    monkeypatch,
):
    class UnavailableRedis:
        async def ping(self):
            raise ConnectionError("unavailable")

        async def close(self):
            pass

    monkeypatch.setattr(
        main_module.aioredis,
        "from_url",
        lambda *args, **kwargs: UnavailableRedis(),
    )
    monkeypatch.setattr(
        main_module.settings,
        "REDIS_URL",
        "redis://localhost.attacker.com:6379/0",
    )

    async def start_app():
        with pytest.raises(RuntimeError, match="Redis cache unavailable"):
            async with main_module.lifespan(main_module.app):
                pass

    asyncio.run(start_app())
