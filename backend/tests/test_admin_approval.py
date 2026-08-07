import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.core.database import Base, get_db
from app.main import app as fastapi_app
from app.models.models import User, UserRole
from app.core.security import hash_password, create_access_token
from app.core.config import settings
import secrets

@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()

@pytest.fixture
def client(db_session):
    def override():
        try:
            yield db_session
        finally:
            pass
    fastapi_app.dependency_overrides[get_db] = override
    with TestClient(fastapi_app, base_url="https://testserver") as c:
        yield c
    fastapi_app.dependency_overrides.clear()

def _auth_cookie(user, db_session):
    session_id = secrets.token_hex(32)
    user.current_session_id = session_id
    db_session.commit()
    token = create_access_token({"sub": str(user.id), "role": user.role.value if hasattr(user.role, 'value') else user.role, "sid": session_id, "auth": "cookie"})
    return {settings.AUTH_COOKIE_NAME: token}

@pytest.fixture
def admin_user(db_session):
    user = User(email="admin@test.com", full_name="Admin", hashed_password=hash_password("pass"), role=UserRole.admin, is_active=True)
    db_session.add(user)
    db_session.commit()
    return user

@pytest.fixture
def regular_user(db_session):
    user = User(email="user@test.com", full_name="User", hashed_password=hash_password("pass"), role=UserRole.user, is_active=True)
    db_session.add(user)
    db_session.commit()
    return user

def test_admin_can_list_users(client, db_session, admin_user, regular_user):
    response = client.get("/admin/users", cookies=_auth_cookie(admin_user, db_session))
    assert response.status_code == 200
    assert len(response.json()["items"]) == 2


def test_admin_user_list_supports_pagination_search_and_role_filter(client, db_session, admin_user):
    db_session.add_all([
        User(email="alice@example.com", full_name="Alice Match", hashed_password=hash_password("pass"), role=UserRole.user, is_active=True),
        User(email="bob@example.com", full_name="Bob Aspirant", hashed_password=hash_password("pass"), role=UserRole.aspirant, is_active=True),
        User(email="charlie@example.com", full_name="Charlie Match", hashed_password=hash_password("pass"), role=UserRole.user, is_active=True),
    ])
    db_session.commit()

    cookies = _auth_cookie(admin_user, db_session)

    paged = client.get("/admin/users?limit=2", cookies=cookies)
    assert paged.status_code == 200
    assert paged.json()["total"] == 4
    assert len(paged.json()["items"]) == 2
    assert paged.json()["has_more"] is True
    assert paged.json()["next_cursor"]

    next_page = client.get(
        "/admin/users",
        params={"cursor": paged.json()["next_cursor"], "limit": 2},
        cookies=cookies,
    )
    assert next_page.status_code == 200
    assert len(next_page.json()["items"]) == 2
    assert next_page.json()["has_more"] is False

    searched = client.get("/admin/users?q=alice", cookies=cookies)
    assert searched.status_code == 200
    assert searched.json()["total"] == 1
    assert searched.json()["items"][0]["email"] == "alice@example.com"

    pending = client.get("/admin/users?role=user&limit=10", cookies=cookies)
    assert pending.status_code == 200
    assert pending.json()["total"] == 2
    assert {user["role"] for user in pending.json()["items"]} == {"user"}


def test_admin_user_list_rejects_invalid_cursor(client, db_session, admin_user):
    response = client.get(
        "/admin/users?cursor=not-a-cursor",
        cookies=_auth_cookie(admin_user, db_session),
    )
    assert response.status_code == 400

def test_admin_activates_user(client, db_session, admin_user):
    user = User(email="inactive@test.com", full_name="Inactive", hashed_password=hash_password("pass"), role=UserRole.user, is_active=False)
    db_session.add(user)
    db_session.commit()
    response = client.patch(f"/admin/users/{user.id}/status", cookies=_auth_cookie(admin_user, db_session))
    assert response.status_code == 200
    assert response.json()["is_active"] == True

def test_admin_deactivates_user(client, db_session, admin_user, regular_user):
    response = client.patch(f"/admin/users/{regular_user.id}/status", cookies=_auth_cookie(admin_user, db_session))
    assert response.status_code == 200
    assert response.json()["is_active"] == False

def test_deactivated_user_cannot_login(client, db_session, admin_user, regular_user):
    client.patch(f"/admin/users/{regular_user.id}/status", cookies=_auth_cookie(admin_user, db_session))
    response = client.post("/auth/login", json={"email": "user@test.com", "password": "pass"})
    assert response.status_code == 403

def test_deactivated_user_session_invalidated(client, db_session, admin_user, regular_user):
    cookies = _auth_cookie(regular_user, db_session)
    response = client.get("/auth/me", cookies=cookies)
    assert response.status_code == 200
    client.patch(f"/admin/users/{regular_user.id}/status", cookies=_auth_cookie(admin_user, db_session))
    response = client.get("/auth/me", cookies=cookies)
    assert response.status_code == 401

def test_admin_changes_user_role(client, db_session, admin_user, regular_user):
    response = client.patch(f"/admin/users/{regular_user.id}/role", json={"role": "aspirant"}, cookies=_auth_cookie(admin_user, db_session))
    assert response.status_code == 200
    assert response.json()["role"] == "aspirant"

def test_admin_cannot_change_own_role(client, db_session, admin_user):
    response = client.patch(f"/admin/users/{admin_user.id}/role", json={"role": "user"}, cookies=_auth_cookie(admin_user, db_session))
    assert response.status_code == 400

def test_non_admin_cannot_access_admin_routes(client, db_session, regular_user):
    response = client.get("/admin/users", cookies=_auth_cookie(regular_user, db_session))
    assert response.status_code == 403

def test_full_approval_workflow(client, db_session, admin_user):
    client.post("/auth/register", json={"email": "new@test.com", "full_name": "New User", "password": "password123"})
    new_user = db_session.query(User).filter(User.email == "new@test.com").first()
    client.patch(f"/admin/users/{new_user.id}/status", cookies=_auth_cookie(admin_user, db_session))
    assert client.post("/auth/login", json={"email": "new@test.com", "password": "password123"}).status_code == 403
    client.patch(f"/admin/users/{new_user.id}/status", cookies=_auth_cookie(admin_user, db_session))
    response = client.post("/auth/login", json={"email": "new@test.com", "password": "password123"})
    assert response.status_code == 200
