import pytest
import secrets
from datetime import datetime, timezone
from types import SimpleNamespace
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.core.database import Base, get_db
from app.core.security import create_access_token, hash_password
from app.main import app as fastapi_app
from app.models.models import (
    Question,
    QuestionType,
    Test,
    TestAttempt,
    TestStatus,
    User,
    UserAnswer,
    UserRole,
)
from app.api.routes.tests.result_builder import _result_payload
from app.api.routes.tests.leaderboard import (
    _leaderboard_cache_key_builder,
    get_leaderboard,
)


@pytest.fixture
def db_engine():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    return engine


@pytest.fixture
def db_session(db_engine):
    Session = sessionmaker(bind=db_engine)
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
    token = create_access_token(
        {
            "sub": str(user.id),
            "role": user.role.value if hasattr(user.role, "value") else user.role,
            "sid": session_id,
            "auth": "cookie",
        }
    )
    return {settings.AUTH_COOKIE_NAME: token}


@pytest.fixture
def multi_attempt_data(db_session):
    # Create 6 users
    users = []
    for i in range(1, 7):
        u = User(
            email=f"user{i}@test.com",
            full_name=f"User {i}",
            hashed_password=hash_password("pass123"),
            role=UserRole.aspirant,
            is_active=True,
        )
        db_session.add(u)
        users.append(u)
    db_session.commit()
    for u in users:
        db_session.refresh(u)

    # Create 1 test
    test = Test(
        title="Comprehensive CS Test",
        duration_minutes=90,
        total_marks=5.0,
        is_published=True,
        created_by=users[0].id,
    )
    db_session.add(test)
    db_session.commit()
    db_session.refresh(test)

    # Create 3 questions
    q1 = Question(
        test_id=test.id,
        question_type=QuestionType.mcq,
        question_text="Q1 MCQ",
        options=["A", "B", "C", "D"],
        correct_answer="B",
        marks=1.0,
        negative_marks=0.33,
        order_index=0,
    )
    q2 = Question(
        test_id=test.id,
        question_type=QuestionType.nat,
        question_text="Q2 NAT",
        options=[],
        correct_answer="42",
        marks=2.0,
        negative_marks=0.0,
        order_index=1,
    )
    q3 = Question(
        test_id=test.id,
        question_type=QuestionType.msq,
        question_text="Q3 MSQ",
        options=["A", "B", "C", "D"],
        correct_answer="A,C",
        marks=2.0,
        negative_marks=0.0,
        order_index=2,
    )
    db_session.add_all([q1, q2, q3])
    db_session.commit()
    for q in [q1, q2, q3]:
        db_session.refresh(q)

    # Seed 6 submitted TestAttempts with different scores
    # User 1 -> 5.0 (Topper)
    # User 2 -> 4.0
    # User 3 -> 3.0
    # User 4 -> 2.0
    # User 5 -> 1.0
    # User 6 -> 0.0
    scores = [5.0, 4.0, 3.0, 2.0, 1.0, 0.0]
    attempts = []
    for idx, (user, score) in enumerate(zip(users, scores)):
        att = TestAttempt(
            user_id=user.id,
            test_id=test.id,
            status=TestStatus.submitted,
            score=score,
            total_marks=5.0,
            tab_violations=idx,
            started_at=datetime.now(timezone.utc),
            submitted_at=datetime.now(timezone.utc),
        )
        db_session.add(att)
        db_session.commit()
        db_session.refresh(att)
        attempts.append(att)

        # Seed UserAnswer rows for all 3 questions
        # Topper (User 1) answers correctly with specific time spent
        ans1 = UserAnswer(
            attempt_id=att.id,
            question_id=q1.id,
            selected_answer="B" if idx == 0 else "A",
            is_correct=(idx == 0),
            marks_awarded=1.0 if idx == 0 else 0.0,
            time_spent_seconds=25 if idx == 0 else 15,
        )
        ans2 = UserAnswer(
            attempt_id=att.id,
            question_id=q2.id,
            selected_answer="42" if idx == 0 else "0",
            is_correct=(idx == 0),
            marks_awarded=2.0 if idx == 0 else 0.0,
            time_spent_seconds=50 if idx == 0 else 30,
        )
        ans3 = UserAnswer(
            attempt_id=att.id,
            question_id=q3.id,
            selected_answer="A,C" if idx == 0 else "A",
            is_correct=(idx == 0),
            marks_awarded=2.0 if idx == 0 else 0.0,
            time_spent_seconds=75 if idx == 0 else 45,
        )
        db_session.add_all([ans1, ans2, ans3])
        db_session.commit()

    return {
        "users": users,
        "test": test,
        "questions": [q1, q2, q3],
        "attempts": attempts,
    }


def test_leaderboard_returns_correct_ranks_and_scores(
    client, db_session, multi_attempt_data
):
    test = multi_attempt_data["test"]
    users = multi_attempt_data["users"]
    user3 = users[2]  # score 3.0, expected rank 3

    resp = client.get(
        f"/tests/{test.id}/leaderboard",
        cookies=_auth_cookie(user3, db_session),
    )
    assert resp.status_code == 200
    data = resp.json()

    assert data["test_id"] == test.id
    assert data["total_participants"] == 6
    assert data["current_user_rank"] == 3

    lb = data["leaderboard"]
    assert len(lb) == 6
    expected_scores = [5.0, 4.0, 3.0, 2.0, 1.0, 0.0]
    expected_names = [f"User {i}" for i in range(1, 7)]

    for rank, item in enumerate(lb, 1):
        assert item["rank"] == rank
        assert item["score"] == expected_scores[rank - 1]
        assert item["full_name"] == expected_names[rank - 1]
        assert item["total_marks"] == 5.0
        assert item["is_current_user"] == (item["user_id"] == user3.id)


def test_get_test_returns_404_for_unpublished_test(
    client, db_session, multi_attempt_data
):
    test = multi_attempt_data["test"]
    test.is_published = False
    db_session.commit()

    response = client.get(
        f"/tests/{test.id}",
        cookies=_auth_cookie(multi_attempt_data["users"][0], db_session),
    )

    assert response.status_code == 404


def test_leaderboard_returns_404_for_unpublished_test(
    client, db_session, multi_attempt_data
):
    test = multi_attempt_data["test"]
    test.is_published = False
    db_session.commit()

    response = client.get(
        f"/tests/{test.id}/leaderboard",
        cookies=_auth_cookie(multi_attempt_data["users"][0], db_session),
    )

    assert response.status_code == 404


def test_leaderboard_paginates_rows_and_keeps_global_ranks(
    client, db_session, multi_attempt_data
):
    test = multi_attempt_data["test"]
    user1 = multi_attempt_data["users"][0]

    resp = client.get(
        f"/tests/{test.id}/leaderboard?limit=2&offset=2",
        cookies=_auth_cookie(user1, db_session),
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data["total_participants"] == 6
    assert data["current_user_rank"] == 1
    assert data["limit"] == 2
    assert data["offset"] == 2
    assert [entry["rank"] for entry in data["leaderboard"]] == [3, 4]
    assert [entry["score"] for entry in data["leaderboard"]] == [3.0, 2.0]
    assert not any(entry["is_current_user"] for entry in data["leaderboard"])


def test_leaderboard_rejects_page_sizes_above_maximum(
    client, db_session, multi_attempt_data
):
    user = multi_attempt_data["users"][0]
    response = client.get(
        f"/tests/{multi_attempt_data['test'].id}/leaderboard?limit=101",
        cookies=_auth_cookie(user, db_session),
    )

    assert response.status_code == 422


def test_leaderboard_cache_key_includes_page_parameters_and_user():
    request = SimpleNamespace(
        path_params={"test_id": 42},
        query_params={"limit": "20", "offset": "0"},
    )
    current_user = SimpleNamespace(id=7)

    first_page_key = _leaderboard_cache_key_builder(
        get_leaderboard,
        request=request,
        kwargs={"current_user": current_user},
    )
    second_page_key = _leaderboard_cache_key_builder(
        get_leaderboard,
        request=SimpleNamespace(
            path_params={"test_id": 42},
            query_params={"limit": "20", "offset": "20"},
        ),
        kwargs={"current_user": current_user},
    )
    other_user_key = _leaderboard_cache_key_builder(
        get_leaderboard,
        request=request,
        kwargs={"current_user": SimpleNamespace(id=8)},
    )

    assert first_page_key != second_page_key
    assert first_page_key != other_user_key


def test_result_payload_populates_topper_details(
    client, db_session, multi_attempt_data
):
    users = multi_attempt_data["users"]
    user3 = users[2]
    user3_attempt = multi_attempt_data["attempts"][2]
    q1, q2, q3 = multi_attempt_data["questions"]

    resp = client.get(
        f"/tests/attempt/{user3_attempt.id}/result",
        cookies=_auth_cookie(user3, db_session),
    )
    assert resp.status_code == 200
    data = resp.json()

    # Check overall result properties
    assert data["score"] == 3.0
    assert data["rank"] == 3
    assert data["total_participants"] == 6

    # Check topper section
    topper = data["topper"]
    assert topper is not None
    assert topper["user_id"] == users[0].id
    assert topper["full_name"] == "User 1"
    assert topper["score"] == 5.0
    assert topper["total_marks"] == 5.0

    # Check per-question topper answers and times
    answers = {ans["question_id"]: ans for ans in data["answers"]}
    assert answers[q1.id]["topper_answer"] == "B"
    assert answers[q1.id]["topper_time_seconds"] == 25

    assert answers[q2.id]["topper_answer"] == "42"
    assert answers[q2.id]["topper_time_seconds"] == 50

    assert answers[q3.id]["topper_answer"] == "A,C"
    assert answers[q3.id]["topper_time_seconds"] == 75


def test_empty_leaderboard_and_result_no_crash(client, db_session, multi_attempt_data):
    user1 = multi_attempt_data["users"][0]
    empty_test = Test(
        title="Empty Test",
        duration_minutes=30,
        total_marks=2.0,
        is_published=True,
        created_by=user1.id,
    )
    db_session.add(empty_test)
    db_session.commit()
    db_session.refresh(empty_test)

    # Leaderboard on empty test
    resp = client.get(
        f"/tests/{empty_test.id}/leaderboard",
        cookies=_auth_cookie(user1, db_session),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_participants"] == 0
    assert data["leaderboard"] == []
    assert data["current_user_rank"] is None

    # Result payload helper when no first attempts exist
    q = Question(
        test_id=empty_test.id,
        question_type=QuestionType.mcq,
        question_text="Q?",
        options=["A", "B"],
        correct_answer="A",
        marks=2.0,
        negative_marks=0.0,
        order_index=0,
    )
    db_session.add(q)
    db_session.commit()
    db_session.refresh(q)

    payload = _result_payload(
        attempt_id=999,
        attempt_number=1,
        attempts_remaining=5,
        counts_for_leaderboard=True,
        persisted=False,
        test=empty_test,
        score=0.0,
        total_marks=2.0,
        submitted_at=None,
        tab_violations=0,
        answer_details=[
            {
                "question_id": q.id,
                "question_text": q.question_text,
                "question_type": q.question_type,
                "question_image_url": None,
                "options": q.options,
                "option_images": {},
                "correct_answer": q.correct_answer,
                "selected_answer": None,
                "is_correct": None,
                "marks_awarded": 0,
                "marks": q.marks,
                "negative_marks": q.negative_marks,
                "time_spent_seconds": 0,
                "topper_answer": None,
                "topper_time_seconds": 0,
            }
        ],
        current_user=user1,
        db=db_session,
    )
    assert payload["topper"] is None
    assert payload["rank"] is None
    assert payload["total_participants"] == 0
    assert payload["answers"][0]["topper_answer"] is None
    assert payload["answers"][0]["topper_time_seconds"] == 0


def test_query_count_verifies_no_overfetching(
    client, db_engine, db_session, multi_attempt_data
):
    """
    Verify that:
    1. Leaderboard does not execute ANY queries against user_answers.
    2. Result endpoint queries user_answers only for the attempt and the topper (exactly 2 queries).
    """
    test = multi_attempt_data["test"]
    users = multi_attempt_data["users"]
    user3 = users[2]
    user3_attempt = multi_attempt_data["attempts"][2]

    executed_queries = []

    def before_cursor_execute(
        conn, cursor, statement, parameters, context, executemany
    ):
        executed_queries.append(statement)

    event.listen(db_engine, "before_cursor_execute", before_cursor_execute)

    try:
        # 1. Leaderboard fetch: should execute 0 user_answers queries
        executed_queries.clear()
        resp = client.get(
            f"/tests/{test.id}/leaderboard",
            cookies=_auth_cookie(user3, db_session),
        )
        assert resp.status_code == 200

        user_answers_queries_lb = [
            q for q in executed_queries if "user_answers" in q.lower()
        ]
        assert len(user_answers_queries_lb) == 0, (
            f"Expected 0 queries to user_answers during leaderboard fetch, got {len(user_answers_queries_lb)}: {user_answers_queries_lb}"
        )

        # 2. Attempt result fetch: should query user_answers for the attempt + topper, NOT all 6 participants
        executed_queries.clear()
        resp = client.get(
            f"/tests/attempt/{user3_attempt.id}/result",
            cookies=_auth_cookie(user3, db_session),
        )
        assert resp.status_code == 200

        user_answers_queries_res = [
            q for q in executed_queries if "user_answers" in q.lower()
        ]
        # Exactly 2 queries against user_answers:
        # 1. In _load_attempt_result (loading the attempt's answers)
        # 2. In _result_payload (targeted query for topper's answers)
        assert len(user_answers_queries_res) == 2, (
            f"Expected exactly 2 queries to user_answers during result fetch, got {len(user_answers_queries_res)}: {user_answers_queries_res}"
        )

    finally:
        event.remove(db_engine, "before_cursor_execute", before_cursor_execute)
