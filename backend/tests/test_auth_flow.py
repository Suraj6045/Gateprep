import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.core.database import Base, get_db
from app.main import app as fastapi_app
from app.models.models import User, UserRole
from app.core.security import hash_password, create_access_token, decode_token
from app.core.config import settings

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

def test_register_first_user_becomes_admin(client, db_session):
    response = client.post("/auth/register", json={
        "email": "admin@test.com",
        "full_name": "Admin User",
        "password": "password123"
    })
    assert response.status_code == 200
    assert response.json()["role"] == UserRole.admin.value

def test_register_second_user_becomes_user(client, db_session):
    client.post("/auth/register", json={"email": "first@test.com", "full_name": "First", "password": "password123"})
    response = client.post("/auth/register", json={
        "email": "user@test.com",
        "full_name": "Regular User",
        "password": "password123"
    })
    assert response.status_code == 200
    assert response.json()["role"] == UserRole.user.value

def test_login_successful(client, db_session):
    client.post("/auth/register", json={"email": "test@test.com", "full_name": "Test", "password": "password123"})
    response = client.post("/auth/login", json={"email": "test@test.com", "password": "password123"})
    assert response.status_code == 200
    assert "access_token" in response.cookies

def test_login_wrong_password(client, db_session):
    client.post("/auth/register", json={"email": "test@test.com", "full_name": "Test", "password": "password123"})
    response = client.post("/auth/login", json={"email": "test@test.com", "password": "wrongpassword"})
    assert response.status_code == 401

def test_login_inactive_user(client, db_session):
    user = User(email="inactive@test.com", full_name="Inactive", hashed_password=hash_password("password123"), role=UserRole.user, is_active=False)
    db_session.add(user)
    db_session.commit()
    response = client.post("/auth/login", json={"email": "inactive@test.com", "password": "password123"})
    assert response.status_code == 403

def test_protected_route_access(client, db_session):
    client.post("/auth/register", json={"email": "test@test.com", "full_name": "Test", "password": "password123"})
    client.post("/auth/login", json={"email": "test@test.com", "password": "password123"})
    response = client.get("/auth/me")
    assert response.status_code == 200
    assert response.json()["email"] == "test@test.com"

def test_protected_route_without_cookie(client, db_session):
    response = client.get("/auth/me")
    assert response.status_code == 401

def test_logout_flow(client, db_session):
    client.post("/auth/register", json={"email": "test@test.com", "full_name": "Test", "password": "password123"})
    client.post("/auth/login", json={"email": "test@test.com", "password": "password123"})
    response = client.post("/auth/logout")
    assert response.status_code == 200
    me_response = client.get("/auth/me")
    assert me_response.status_code == 401
    
def test_stale_session_is_rejected(client, db_session):
    user = User(email="stale@test.com", full_name="Stale", hashed_password=hash_password("password123"), role=UserRole.user, is_active=True, current_session_id="session-A")
    db_session.add(user)
    db_session.commit()
    token = create_access_token({"sub": str(user.id), "role": user.role.value, "sid": "session-B", "auth": "cookie"})
    client.cookies.set(settings.AUTH_COOKIE_NAME, token)
    response = client.get("/auth/me")
    assert response.status_code == 401

def test_login_rotates_session_invalidating_previous_token(client, db_session):
    client.post("/auth/register", json={"email": "rotate@test.com", "full_name": "Rotate", "password": "password123"})
    first_login = client.post("/auth/login", json={"email": "rotate@test.com", "password": "password123"})
    assert first_login.status_code == 200
    first_cookie = client.cookies.get(settings.AUTH_COOKIE_NAME)
    assert first_cookie is not None
    first_session = decode_token(first_cookie)["sid"]

    # Second login must rotate the session id, invalidating the first token.
    client.cookies.clear()
    second_login = client.post("/auth/login", json={"email": "rotate@test.com", "password": "password123"})
    assert second_login.status_code == 200
    second_cookie = client.cookies.get(settings.AUTH_COOKIE_NAME)
    assert second_cookie is not None
    second_session = decode_token(second_cookie)["sid"]

    assert first_session != second_session

    user = db_session.query(User).filter(User.email == "rotate@test.com").one()
    assert user.current_session_id == second_session

    # Replaying the first (now stale) cookie must be rejected.
    legacy_response = client.get(
        "/auth/me",
        headers={"Cookie": f"{settings.AUTH_COOKIE_NAME}={first_cookie}"},
    )
    assert legacy_response.status_code == 401

def test_failed_token_issuance_rolls_session_forward(client, db_session, monkeypatch):
    """If token issuance fails after the DB commit, create_token_for_user must rotate
    the session id again so the user is not silently logged out from their old session."""
    from app.api.routes import auth as auth_module

    client.post("/auth/register", json={"email": "rollback@test.com", "full_name": "Rollback", "password": "password123"})
    initial_login = client.post("/auth/login", json={"email": "rollback@test.com", "password": "password123"})
    assert initial_login.status_code == 200
    initial_cookie = client.cookies.get(settings.AUTH_COOKIE_NAME)
    initial_session = decode_token(initial_cookie)["sid"]

    def _boom(user, session_id):
        raise RuntimeError("simulated jwt failure")

    monkeypatch.setattr(auth_module, "create_token_for_session", _boom)

    with pytest.raises(RuntimeError):
        client.post("/auth/login", json={"email": "rollback@test.com", "password": "password123"})

    # The user must not still be pinned to the prior session (which would leave
    # them with a working session even though login just raised).
    state = db_session.query(User).filter(User.email == "rollback@test.com").one()
    assert state.current_session_id is not None
    assert state.current_session_id != initial_session

    # The previous, legitimate token now has a different (or null) sid in the DB
    # and must therefore be rejected.
    db_session.expire_all()
    legacy = client.get(
        "/auth/me",
        headers={"Cookie": f"{settings.AUTH_COOKIE_NAME}={initial_cookie}"},
    )
    assert legacy.status_code == 401
