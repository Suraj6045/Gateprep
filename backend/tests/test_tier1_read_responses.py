import json
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
from app.models.models import Question, QuestionType, Test, TestAttempt, TestStatus, User, UserRole


FIXED_START = datetime(2024, 1, 2, 3, 4, 5)
FIXED_SUBMIT = datetime(2024, 1, 2, 4, 4, 5)


@pytest.fixture
def read_setup():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    app.dependency_overrides[get_db] = lambda: session
    with TestClient(app, base_url="https://testserver") as client:
        owner = User(
            email="tier1-owner@test.com",
            full_name="Tier One Owner",
            hashed_password=hash_password("pass123"),
            role=UserRole.aspirant,
            is_active=True,
        )
        other = User(
            email="tier1-other@test.com",
            full_name="Tier One Other",
            hashed_password=hash_password("pass123"),
            role=UserRole.aspirant,
            is_active=True,
        )
        regular = User(
            email="tier1-regular@test.com",
            full_name="Tier One Regular",
            hashed_password=hash_password("pass123"),
            role=UserRole.user,
            is_active=True,
        )
        session.add_all([owner, other, regular])
        session.commit()
        for user in (owner, other, regular):
            session.refresh(user)

        test = Test(
            title="Tier One Test",
            description=None,
            duration_minutes=60,
            total_marks=2.0,
            is_published=True,
            category="weekly_quiz",
            series_name=None,
            test_type=None,
            subject=None,
            created_at=FIXED_START,
        )
        session.add(test)
        session.commit()
        session.refresh(test)
        questions = [
            Question(
                test_id=test.id,
                question_type=QuestionType.mcq,
                question_text="List options",
                options=["A", "B"],
                option_images={"A": 7},
                correct_answer="A",
                marks=1.0,
                negative_marks=0.0,
                order_index=0,
            ),
            Question(
                test_id=test.id,
                question_type=QuestionType.nat,
                question_text="Dict options",
                options={"min": 1, "max": 2},
                option_images=None,
                correct_answer="1",
                marks=1.0,
                negative_marks=0.0,
                order_index=1,
            ),
        ]
        session.add_all(questions)
        session.commit()
        for question in questions:
            session.refresh(question)

        attempt = TestAttempt(
            user_id=owner.id,
            test_id=test.id,
            status=TestStatus.submitted,
            score=2.0,
            total_marks=2.0,
            started_at=FIXED_START,
            submitted_at=FIXED_SUBMIT,
        )
        session.add(attempt)
        session.commit()
        session.refresh(attempt)

        yield client, session, owner, other, regular, test, questions, attempt
    app.dependency_overrides.clear()
    session.close()


def _cookies(user, session):
    session_id = secrets.token_hex(32)
    user.current_session_id = session_id
    session.commit()
    token = create_access_token(
        {
            "sub": str(user.id),
            "role": user.role.value,
            "sid": session_id,
            "auth": "cookie",
        }
    )
    return {settings.AUTH_COOKIE_NAME: token}


def _assert_json(response, expected, keys):
    assert response.status_code == 200
    actual = response.json()
    if isinstance(actual, dict):
        assert set(actual) == keys
    elif isinstance(actual, list):
        assert len(actual) == len(expected)
        for item, expected_item in zip(actual, expected):
            if isinstance(item, dict) and isinstance(expected_item, dict):
                assert set(item) == set(expected_item)
    assert json.dumps(actual, sort_keys=True) == json.dumps(expected, sort_keys=True)


def test_catalog_owner_and_empty_questions(read_setup):
    client, session, owner, _, _, test, _, _ = read_setup
    expected = [{
        "id": test.id, "title": "Tier One Test", "description": None,
        "duration_minutes": 60, "total_marks": 2.0, "question_count": 2,
        "series_id": None, "created_at": FIXED_START.isoformat(),
        "category": "weekly_quiz", "series_name": None, "test_type": None, "subject": None,
    }]
    response = client.get("/tests", cookies=_cookies(owner, session))
    _assert_json(response, expected, set())


def test_catalog_auth_and_not_found_paths(read_setup):
    client, session, owner, _, regular, test, _, _ = read_setup
    assert client.get("/tests").status_code == 401
    assert client.get("/tests", cookies=_cookies(regular, session)).status_code == 403
    assert client.get(f"/tests/{test.id + 100}", cookies=_cookies(owner, session)).status_code == 404


def test_detail_response_and_not_found(read_setup):
    client, session, owner, _, _, test, _, _ = read_setup
    expected = {
        "id": test.id, "title": "Tier One Test", "description": None,
        "duration_minutes": 60, "total_marks": 2.0, "question_count": 2,
        "series_id": None, "created_at": FIXED_START.isoformat(), "test_type": None,
    }
    response = client.get(f"/tests/{test.id}", cookies=_cookies(owner, session))
    _assert_json(response, expected, set(expected))

    test.test_type = "full_length"
    session.commit()
    expected["test_type"] = "full_length"
    response = client.get(f"/tests/{test.id}", cookies=_cookies(owner, session))
    _assert_json(response, expected, set(expected))

    assert client.get(f"/tests/{test.id + 100}", cookies=_cookies(owner, session)).status_code == 404


def test_history_and_my_attempts_owner_and_other_user(read_setup):
    client, session, owner, other, _, test, _, attempt = read_setup
    history = [{
        "id": attempt.id, "test_id": test.id, "status": "submitted",
        "started_at": FIXED_START.isoformat(), "submitted_at": FIXED_SUBMIT.isoformat(),
        "score": 2.0, "total_marks": 2.0, "tab_violations": 0, "fullscreen_violations": 0,
    }]
    my_attempt = [{
        "attempt_id": attempt.id, "attempt_number": 1, "counts_for_leaderboard": True,
        "is_first": True, "status": "submitted", "score": 2.0, "total_marks": 2.0,
        "percentage": 100.0, "started_at": FIXED_START.isoformat(),
        "submitted_at": FIXED_SUBMIT.isoformat(),         "attempts_remaining": 5,
    }]
    _assert_json(client.get("/tests/my/history", cookies=_cookies(owner, session)), history, set())
    _assert_json(client.get(f"/tests/{test.id}/my-attempts", cookies=_cookies(owner, session)), my_attempt, set())
    assert client.get("/tests/my/history").status_code == 401
    assert client.get(f"/tests/{test.id}/my-attempts", cookies=_cookies(other, session)).json() == []


def test_leaderboard_pagination_and_empty_branch(read_setup):
    client, session, owner, _, _, test, _, attempt = read_setup
    expected = {
        "test_id": test.id, "test_title": "Tier One Test", "total_participants": 1,
        "current_user_rank": 1, "limit": 99, "offset": 0,
        "leaderboard": [{
            "rank": 1, "user_id": owner.id, "full_name": "Tier One Owner",
            "score": 2.0, "total_marks": 2.0, "percentage": 100.0,
            "submitted_at": FIXED_SUBMIT.isoformat(), "tab_violations": 0,
            "is_current_user": True,
        }],
    }
    _assert_json(client.get(f"/tests/{test.id}/leaderboard?limit=99", cookies=_cookies(owner, session)), expected, set(expected))
    assert client.get(f"/tests/{test.id}/leaderboard?limit=101", cookies=_cookies(owner, session)).status_code == 422
    assert client.get(f"/tests/{test.id + 100}/leaderboard", cookies=_cookies(owner, session)).status_code == 404


def test_result_owner_other_user_and_not_found(read_setup):
    client, session, owner, other, _, test, questions, attempt = read_setup
    expected_answers = [
        {
            "question_id": questions[0].id, "question_text": "List options",
            "question_type": "mcq", "question_image_url": None, "options": ["A", "B"],
            "option_images": {"A": 7}, "correct_answer": "A", "selected_answer": None,
            "is_correct": None, "marks_awarded": 0, "marks": 1.0, "negative_marks": 0.0,
            "time_spent_seconds": 0, "topper_answer": None, "topper_time_seconds": 0,
        },
        {
            "question_id": questions[1].id, "question_text": "Dict options",
            "question_type": "nat", "question_image_url": None,
            "options": {"min": 1, "max": 2}, "option_images": None, "correct_answer": "1",
            "selected_answer": None, "is_correct": None, "marks_awarded": 0,
            "marks": 1.0, "negative_marks": 0.0, "time_spent_seconds": 0,
            "topper_answer": None, "topper_time_seconds": 0,
        },
    ]
    expected = {
        "attempt_id": attempt.id, "client_result_id": None, "attempt_number": 1,
        "attempts_remaining": 5, "max_attempts": 6, "counts_for_leaderboard": True,
        "persisted": True, "test_id": test.id, "test_title": "Tier One Test",
        "score": 2.0, "total_marks": 2.0, "percentage": 100.0, "correct": 0,
        "incorrect": 0, "skipped": 2, "submitted_at": FIXED_SUBMIT.isoformat(),
        "tab_violations": 0, "rank": 1, "total_participants": 1,
        "topper": {"user_id": owner.id, "full_name": "Tier One Owner", "score": 2.0,
                   "total_marks": 2.0, "percentage": 100.0},
        "answers": expected_answers,
    }
    _assert_json(client.get(f"/tests/attempt/{attempt.id}/result", cookies=_cookies(owner, session)), expected, set(expected))
    assert client.get(f"/tests/attempt/{attempt.id}/result", cookies=_cookies(other, session)).status_code == 404
    assert client.get("/tests/attempt/999999/result", cookies=_cookies(owner, session)).status_code == 404
    assert client.get(f"/tests/attempt/{attempt.id}/result").status_code == 401


def test_detail_and_leaderboard_auth_role_and_unknown_paths(read_setup):
    client, session, owner, _, regular, test, _, _ = read_setup
    assert client.get(f"/tests/{test.id}").status_code == 401
    assert client.get(f"/tests/{test.id}", cookies=_cookies(regular, session)).status_code == 403
    assert client.get(f"/tests/999999", cookies=_cookies(owner, session)).status_code == 404
    assert client.get(f"/tests/{test.id}/leaderboard").status_code == 401
    assert client.get(
        f"/tests/{test.id}/leaderboard?limit=7&offset=2",
        cookies=_cookies(regular, session),
    ).status_code == 403
    assert client.get(
        "/tests/999999/leaderboard?limit=7&offset=2",
        cookies=_cookies(owner, session),
    ).status_code == 404


def test_history_attempts_and_result_auth_and_empty_paths(read_setup):
    client, session, owner, other, regular, test, _, attempt = read_setup
    assert client.get(f"/tests/{test.id}/my-attempts").status_code == 401
    assert client.get(
        f"/tests/{test.id}/my-attempts",
        cookies=_cookies(regular, session),
    ).json() == []
    assert client.get(
        "/tests/999999/my-attempts",
        cookies=_cookies(owner, session),
    ).json() == []
    assert client.get(f"/tests/attempt/{attempt.id}/result").status_code == 401
    assert client.get(
        f"/tests/attempt/{attempt.id}/result",
        cookies=_cookies(regular, session),
    ).status_code == 404
    assert client.get(
        "/tests/attempt/999999/result",
        cookies=_cookies(other, session),
    ).status_code == 404
    _assert_json(
        client.get("/tests/my/history", cookies=_cookies(regular, session)),
        [],
        set(),
    )


def test_history_and_leaderboard_preserve_null_score_and_total(read_setup):
    client, session, owner, other, _, test, _, attempt = read_setup
    attempt.score = None
    attempt.total_marks = None
    attempt.started_at = None
    attempt.submitted_at = None
    session.commit()
    history = [{
        "id": attempt.id, "test_id": test.id, "status": "submitted",
        "started_at": None, "submitted_at": None, "score": None, "total_marks": None,
        "tab_violations": 0, "fullscreen_violations": 0,
    }]
    leaderboard = {
        "test_id": test.id, "test_title": "Tier One Test", "total_participants": 1,
        "current_user_rank": 1, "limit": 50, "offset": 0,
        "leaderboard": [{
            "rank": 1, "user_id": owner.id, "full_name": "Tier One Owner",
            "score": None, "total_marks": None, "percentage": 0,
            "submitted_at": None, "tab_violations": 0, "is_current_user": False,
        }],
    }
    _assert_json(client.get("/tests/my/history", cookies=_cookies(owner, session)), history, set())
    _assert_json(
        client.get(f"/tests/{test.id}/leaderboard?limit=50&offset=0", cookies=_cookies(other, session)),
        leaderboard | {"current_user_rank": None},
        set(leaderboard),
    )


def test_leaderboard_pagination_reports_current_user_outside_page(read_setup):
    client, session, owner, other, _, test, _, attempt = read_setup
    other_attempt = TestAttempt(
        user_id=other.id,
        test_id=test.id,
        status=TestStatus.submitted,
        score=2.0,
        total_marks=2.0,
        started_at=FIXED_START,
        submitted_at=FIXED_SUBMIT,
    )
    attempt.score = 1.0
    attempt.total_marks = 2.0
    session.add(other_attempt)
    session.commit()
    expected = {
        "test_id": test.id, "test_title": "Tier One Test", "total_participants": 2,
        "current_user_rank": 2, "limit": 1, "offset": 0,
        "leaderboard": [{
            "rank": 1, "user_id": other.id, "full_name": "Tier One Other",
            "score": 2.0, "total_marks": 2.0, "percentage": 100.0,
            "submitted_at": FIXED_SUBMIT.isoformat(), "tab_violations": 0,
            "is_current_user": False,
        }],
    }
    _assert_json(
        client.get(f"/tests/{test.id}/leaderboard?limit=1&offset=0", cookies=_cookies(owner, session)),
        expected,
        set(expected),
    )


def test_result_preserves_practice_like_null_fields_and_open_json(read_setup):
    client, session, owner, _, _, test, questions, attempt = read_setup
    attempt.score = None
    attempt.total_marks = None
    attempt.submitted_at = None
    session.commit()
    expected = {
        "attempt_id": attempt.id, "client_result_id": None, "attempt_number": 1,
        "attempts_remaining": 5, "max_attempts": 6, "counts_for_leaderboard": True,
        "persisted": True, "test_id": test.id, "test_title": "Tier One Test",
        "score": 0, "total_marks": 2.0, "percentage": 0.0, "correct": 0,
        "incorrect": 0, "skipped": 2, "submitted_at": None, "tab_violations": 0,
        "rank": 1, "total_participants": 1,
        "topper": {"user_id": owner.id, "full_name": "Tier One Owner", "score": None,
                   "total_marks": None, "percentage": 0},
        "answers": [
            {
                "question_id": questions[0].id, "question_text": "List options",
                "question_type": "mcq", "question_image_url": None, "options": ["A", "B"],
                "option_images": {"A": 7}, "correct_answer": "A", "selected_answer": None,
                "is_correct": None, "marks_awarded": 0, "marks": 1.0,
                "negative_marks": 0.0, "time_spent_seconds": 0,
                "topper_answer": None, "topper_time_seconds": 0,
            },
            {
                "question_id": questions[1].id, "question_text": "Dict options",
                "question_type": "nat", "question_image_url": None,
                "options": {"min": 1, "max": 2}, "option_images": None,
                "correct_answer": "1", "selected_answer": None, "is_correct": None,
                "marks_awarded": 0, "marks": 1.0, "negative_marks": 0.0,
                "time_spent_seconds": 0, "topper_answer": None, "topper_time_seconds": 0,
            },
        ],
    }
    _assert_json(
        client.get(f"/tests/attempt/{attempt.id}/result", cookies=_cookies(owner, session)),
        expected,
        set(expected),
    )
