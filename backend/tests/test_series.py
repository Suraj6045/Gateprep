import pytest
import secrets
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.main import app as fastapi_app
from app.models.models import User, UserRole, TestSeries, Test, TestAttempt, TestStatus
from app.core.security import create_access_token
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

def _auth_cookie(user, db_session):
    session_id = secrets.token_hex(32)
    user.current_session_id = session_id
    db_session.commit()
    token = create_access_token({"sub": str(user.id), "role": user.role.value if hasattr(user.role, 'value') else user.role, "sid": session_id, "auth": "cookie"})
    return {settings.AUTH_COOKIE_NAME: token}

@pytest.fixture
def admin_user(db_session):
    user = User(email="admin_series@test.com", hashed_password="pw", role=UserRole.admin, full_name="Admin User")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def aspirant_user(db_session):
    user = User(email="aspirant_series@test.com", hashed_password="pw", role=UserRole.aspirant, full_name="Aspirant User")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def sample_series(db_session, admin_user):
    series = TestSeries(title="Test Series 1", description="Desc 1", created_by=admin_user.id)
    db_session.add(series)
    db_session.commit()
    db_session.refresh(series)
    
    # Add some tests to this series
    test1 = Test(title="Test 1", series_id=series.id, is_published=True, duration_minutes=60, total_marks=100, created_by=admin_user.id, series_order=1)
    test2 = Test(title="Test 2", series_id=series.id, is_published=True, duration_minutes=60, total_marks=100, created_by=admin_user.id, series_order=2)
    test3 = Test(title="Unpublished Test", series_id=series.id, is_published=False, duration_minutes=60, total_marks=100, created_by=admin_user.id, series_order=3)
    db_session.add_all([test1, test2, test3])
    db_session.commit()
    
    return series

def test_list_series_unauthenticated(client, db_session, sample_series):
    resp = client.get("/series")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["title"] == "Test Series 1"
    assert data[0]["test_count"] == 2  # Only published tests are counted
    assert data[0]["completed_count"] == 0

def test_list_series_authenticated(client, db_session, sample_series, aspirant_user):
    # Add a completed attempt for the aspirant
    test1 = db_session.query(Test).filter_by(title="Test 1").first()
    attempt = TestAttempt(user_id=aspirant_user.id, test_id=test1.id, status=TestStatus.submitted, score=10.0)
    db_session.add(attempt)
    db_session.commit()
    
    resp = client.get("/series", cookies=_auth_cookie(aspirant_user, db_session))
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["completed_count"] == 1

def test_get_series_tests_unauthenticated(client, sample_series):
    resp = client.get(f"/series/{sample_series.id}/tests")
    assert resp.status_code == 401

def test_get_series_tests_authenticated(client, db_session, sample_series, aspirant_user):
    # Add attempt
    test1 = db_session.query(Test).filter_by(title="Test 1").first()
    attempt = TestAttempt(user_id=aspirant_user.id, test_id=test1.id, status=TestStatus.submitted, score=15.0)
    db_session.add(attempt)
    db_session.commit()

    resp = client.get(f"/series/{sample_series.id}/tests", cookies=_auth_cookie(aspirant_user, db_session))
    assert resp.status_code == 200
    data = resp.json()
    assert data["series"]["title"] == "Test Series 1"
    assert len(data["tests"]) == 2  # Only published tests
    
    test_1_res = next(t for t in data["tests"] if t["title"] == "Test 1")
    assert test_1_res["is_completed"] is True
    assert test_1_res["score"] == 15.0
    
    test_2_res = next(t for t in data["tests"] if t["title"] == "Test 2")
    assert test_2_res["is_completed"] is False

def test_get_series_tests_not_found(client, db_session, aspirant_user):
    resp = client.get("/series/999/tests", cookies=_auth_cookie(aspirant_user, db_session))
    assert resp.status_code == 404

def test_create_series_admin(client, db_session, admin_user):
    payload = {"title": "New Series", "description": "Description"}
    resp = client.post("/series", json=payload, cookies=_auth_cookie(admin_user, db_session))
    assert resp.status_code == 201
    assert resp.json()["title"] == "New Series"
    
    # Verify in DB
    series = db_session.query(TestSeries).filter_by(title="New Series").first()
    assert series is not None
    assert series.created_by == admin_user.id

def test_create_series_non_admin(client, db_session, aspirant_user):
    payload = {"title": "New Series"}
    resp = client.post("/series", json=payload, cookies=_auth_cookie(aspirant_user, db_session))
    assert resp.status_code == 403

def test_delete_series_admin(client, db_session, sample_series, admin_user):
    # Tests are initially linked
    linked_tests = db_session.query(Test).filter_by(series_id=sample_series.id).count()
    assert linked_tests == 3
    
    resp = client.delete(f"/series/{sample_series.id}", cookies=_auth_cookie(admin_user, db_session))
    assert resp.status_code == 200
    
    # Series is deleted
    assert db_session.query(TestSeries).filter_by(id=sample_series.id).first() is None
    
    # Tests are unlinked
    unlinked_tests = db_session.query(Test).filter_by(series_id=None).count()
    assert unlinked_tests == 3

def test_delete_series_not_found(client, db_session, admin_user):
    resp = client.delete("/series/999", cookies=_auth_cookie(admin_user, db_session))
    assert resp.status_code == 404
