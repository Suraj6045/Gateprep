import pytest
from sqlalchemy.exc import ArgumentError

from app.core.config import (
    PASSWORD_URL_ENCODING_MESSAGE,
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
