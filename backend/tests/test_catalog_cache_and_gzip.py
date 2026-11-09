"""GZip compression + student catalog caching / invalidation.

Uses an isolated in-memory SQLite DB via a get_db override (never the real DB).
Entering TestClient(app) runs the lifespan, which initialises a fresh
in-memory FastAPICache, so every test starts with an empty cache.
"""
import secrets
from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.core.database import Base, get_db
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models.models import Question, Test, TestSeries, User, UserRole


@pytest.fixture
def env():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    app.dependency_overrides[get_db] = lambda: session

    def make_user(email, role):
        user = User(
            email=email,
            full_name=email.split("@")[0],
            hashed_password=hash_password("pass12345"),
            role=role,
            is_active=True,
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        return user

    admin = make_user("cache-admin@test.com", UserRole.admin)
    aspirant = make_user("cache-aspirant@test.com", UserRole.aspirant)
    pending = make_user("cache-pending@test.com", UserRole.user)

    test = Test(
        title="Original title",
        description=None,
        duration_minutes=60,
        total_marks=0.0,
        is_published=True,
        category="weekly_quiz",
        created_at=datetime(2024, 1, 2, 3, 4, 5),
    )
    session.add(test)
    session.commit()
    session.refresh(test)

    with TestClient(app, base_url="https://testserver") as client:
        yield client, session, admin, aspirant, pending, test
    app.dependency_overrides.clear()
    session.close()


def _cookies(user, session):
    session_id = secrets.token_hex(32)
    user.current_session_id = session_id
    session.commit()
    token = create_access_token(
        {"sub": str(user.id), "role": user.role.value, "sid": session_id, "auth": "cookie"}
    )
    return {settings.AUTH_COOKIE_NAME: token}


def _titles(response):
    assert response.status_code == 200
    return [t["title"] for t in response.json()]


# --- GZip -------------------------------------------------------------------


def test_large_json_is_gzipped_and_small_is_not():
    with TestClient(app, base_url="https://testserver") as client:
        big = client.get("/openapi.json", headers={"Accept-Encoding": "gzip"})
        assert big.status_code == 200
        assert big.headers.get("content-encoding") == "gzip"
        assert big.json()["info"]["title"] == "GATE Prep Platform"  # decodes fine

        small = client.get("/health", headers={"Accept-Encoding": "gzip"})
        assert small.status_code == 200
        assert "content-encoding" not in small.headers

        plain = client.get("/openapi.json", headers={"Accept-Encoding": "identity"})
        assert "content-encoding" not in plain.headers


# --- Catalog cache ----------------------------------------------------------


def test_catalog_is_served_from_cache_until_admin_write(env):
    client, session, admin, aspirant, _pending, test = env
    a = _cookies(aspirant, session)
    adm = _cookies(admin, session)

    miss = client.get("/tests", cookies=a)
    assert _titles(miss) == ["Original title"]

    # Change the DB behind the API's back: a cache hit must NOT see it.
    test.title = "Changed directly in DB"
    session.commit()
    hit = client.get("/tests", cookies=a)
    assert _titles(hit) == ["Original title"]

    # Cache hit must be identical to the miss (created_at tz suffix aside:
    # a known pre-existing SQLite-only quirk of the cache decoder).
    def strip_tz(rows):
        return [
            {**r, "created_at": datetime.fromisoformat(r["created_at"]).replace(tzinfo=None)}
            for r in rows
        ]

    assert strip_tz(hit.json()) == strip_tz(miss.json())

    # Admin write through the API invalidates immediately.
    patched = client.patch(f"/admin/tests/{test.id}", json={"title": "Via admin"}, cookies=adm)
    assert patched.status_code == 200
    assert _titles(client.get("/tests", cookies=a)) == ["Via admin"]


def test_detail_route_is_cached_and_invalidated(env):
    client, session, admin, aspirant, _pending, test = env
    a = _cookies(aspirant, session)
    adm = _cookies(admin, session)

    assert client.get(f"/tests/{test.id}", cookies=a).json()["title"] == "Original title"
    test.title = "Changed directly in DB"
    session.commit()
    assert client.get(f"/tests/{test.id}", cookies=a).json()["title"] == "Original title"

    client.patch(f"/admin/tests/{test.id}", json={"title": "Via admin"}, cookies=adm)
    assert client.get(f"/tests/{test.id}", cookies=a).json()["title"] == "Via admin"


def test_auth_is_enforced_on_cache_hits(env):
    client, session, _admin, aspirant, pending, _test = env
    client.get("/tests", cookies=_cookies(aspirant, session))  # warm the cache

    assert client.get("/tests").status_code == 401  # no cookie
    assert client.get("/tests", cookies=_cookies(pending, session)).status_code == 403


def test_question_writes_invalidate_catalog_question_count(env):
    client, session, admin, aspirant, _pending, test = env
    a = _cookies(aspirant, session)
    adm = _cookies(admin, session)

    assert client.get("/tests", cookies=a).json()[0]["question_count"] == 0
    resp = client.post(
        f"/admin/tests/{test.id}/questions",
        json={
            "questions": [
                {
                    "question_type": "mcq",
                    "question_text": "2+2?",
                    "options": ["3", "4", "5", "6"],
                    "correct_answer": "B",
                }
            ]
        },
        cookies=adm,
    )
    assert resp.status_code == 201, resp.text
    row = client.get("/tests", cookies=a).json()[0]
    assert row["question_count"] == 1
    assert row["total_marks"] == 1.0


def test_unpublish_and_delete_remove_test_from_catalog(env):
    client, session, admin, aspirant, _pending, test = env
    a = _cookies(aspirant, session)
    adm = _cookies(admin, session)

    session.add(
        Question(
            test_id=test.id,
            question_type="mcq",
            question_text="1+1?",
            options=["1", "2"],
            correct_answer="B",
            marks=1.0,
            negative_marks=0.0,
            order_index=1,
        )
    )
    session.commit()

    assert _titles(client.get("/tests", cookies=a)) == ["Original title"]
    client.patch(f"/admin/tests/{test.id}", json={"is_published": False}, cookies=adm)
    assert _titles(client.get("/tests", cookies=a)) == []

    client.patch(f"/admin/tests/{test.id}", json={"is_published": True}, cookies=adm)
    assert _titles(client.get("/tests", cookies=a)) == ["Original title"]
    assert client.delete(f"/admin/tests/{test.id}", cookies=adm).status_code == 200
    assert _titles(client.get("/tests", cookies=a)) == []
    assert client.get(f"/tests/{test.id}", cookies=a).status_code == 404


def test_series_delete_invalidates_catalog_series_id(env):
    client, session, admin, aspirant, _pending, test = env
    a = _cookies(aspirant, session)
    adm = _cookies(admin, session)

    series = TestSeries(title="S1")
    session.add(series)
    session.commit()
    session.refresh(series)
    test.series_id = series.id
    session.commit()

    assert client.get("/tests", cookies=a).json()[0]["series_id"] == series.id
    assert client.delete(f"/series/{series.id}", cookies=adm).status_code == 200
    assert client.get("/tests", cookies=a).json()[0]["series_id"] is None
