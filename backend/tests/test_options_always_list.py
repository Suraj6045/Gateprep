import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import secrets

from app.core.database import Base, get_db
from app.main import app as fastapi_app
from app.models.models import (
    User,
    UserRole,
    Test,
    Question,
    QuestionType,
    TestStatus,
    TestAttempt,
)
from app.core.security import hash_password, create_access_token
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
    token = create_access_token({
        "sub": str(user.id),
        "role": user.role.value if hasattr(user.role, "value") else user.role,
        "sid": session_id,
        "auth": "cookie",
    })
    return {settings.AUTH_COOKIE_NAME: token}


def test_questions_and_results_always_emit_list_options(client, db_session):
    user = User(
        email="aspirant@gateprep.com",
        hashed_password=hash_password("password123"),
        full_name="Test Aspirant",
        role=UserRole.aspirant,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()

    test = Test(
        title="Sample Test",
        duration_minutes=60,
        total_marks=3.0,
        is_published=True,
    )
    db_session.add(test)
    db_session.commit()

    q_mcq = Question(
        test_id=test.id,
        question_type=QuestionType.mcq,
        question_text="Sample MCQ",
        options=["Option 1", "Option 2", "Option 3", "Option 4"],
        correct_answer="A",
        marks=2.0,
        negative_marks=0.66,
        order_index=0,
    )
    q_nat = Question(
        test_id=test.id,
        question_type=QuestionType.nat,
        question_text="Sample NAT",
        options=[],
        correct_answer="42",
        marks=1.0,
        negative_marks=0.0,
        order_index=1,
    )
    db_session.add_all([q_mcq, q_nat])
    db_session.commit()

    cookies = _auth_cookie(user, db_session)

    # Start attempt
    start_res = client.post(f"/tests/{test.id}/start", cookies=cookies)
    assert start_res.status_code == 200, start_res.text
    attempt_id = start_res.json()["id"]

    # 1. Check GET /tests/{id}/attempt/{attempt_id}/questions
    q_res = client.get(f"/tests/{test.id}/attempt/{attempt_id}/questions", cookies=cookies)
    assert q_res.status_code == 200, q_res.text
    questions_data = q_res.json()
    assert len(questions_data) == 2
    assert questions_data[0]["options"] == ["Option 1", "Option 2", "Option 3", "Option 4"]
    assert questions_data[1]["options"] == []

    # Submit attempt
    submit_res = client.post(
        f"/tests/{test.id}/attempt/{attempt_id}/submit",
        json={"answers": []},
        cookies=cookies,
    )
    assert submit_res.status_code == 200, submit_res.text

    # 2. Check GET /tests/attempt/{attempt_id}/result
    result_res = client.get(f"/tests/attempt/{attempt_id}/result", cookies=cookies)
    assert result_res.status_code == 200, result_res.text
    answers_data = result_res.json()["answers"]
    assert len(answers_data) == 2
    assert answers_data[0]["options"] == ["Option 1", "Option 2", "Option 3", "Option 4"]
    assert answers_data[1]["options"] == []
