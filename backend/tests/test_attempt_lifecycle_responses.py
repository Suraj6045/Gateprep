import json
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.routes.tests import attempts as attempts_module
from app.core.config import settings
from app.core.database import Base, get_db
from app.core.security import create_access_token
from app.main import app
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


FIXED_NOW = datetime(2026, 11, 1, 10, 0, 0, tzinfo=timezone.utc)
FIXED_START = FIXED_NOW
FIXED_SUBMIT = FIXED_NOW


class FrozenDateTime(datetime):
    @classmethod
    def now(cls, tz=None):
        if tz is None:
            return cls(*FIXED_NOW.timetuple()[:6])
        return cls.fromtimestamp(FIXED_NOW.timestamp(), tz)


@pytest.fixture
def lifecycle_setup(monkeypatch):
    monkeypatch.setattr(attempts_module, "datetime", FrozenDateTime)
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
            email="lifecycle-owner@test.com",
            full_name="Lifecycle Owner",
            role=UserRole.aspirant,
            is_active=True,
        )
        other = User(
            email="lifecycle-other@test.com",
            full_name="Lifecycle Other",
            role=UserRole.aspirant,
            is_active=True,
        )
        regular = User(
            email="lifecycle-regular@test.com",
            full_name="Lifecycle Regular",
            role=UserRole.user,
            is_active=True,
        )
        session.add_all([owner, other, regular])
        session.commit()
        for user in (owner, other, regular):
            session.refresh(user)

        published = Test(
            title="Lifecycle Test",
            duration_minutes=180,
            total_marks=3.0,
            is_published=True,
            created_at=FIXED_START,
        )
        unpublished = Test(
            title="Unpublished Test",
            duration_minutes=180,
            total_marks=1.0,
            is_published=False,
            created_at=FIXED_START,
        )
        session.add_all([published, unpublished])
        session.commit()
        session.refresh(published)
        session.refresh(unpublished)

        questions = [
            Question(
                test_id=published.id,
                question_type=QuestionType.mcq,
                question_text="MCQ",
                options=["A", "B"],
                option_images={"A": 7},
                correct_answer="A",
                marks=1.0,
                negative_marks=0.5,
                order_index=0,
            ),
            Question(
                test_id=published.id,
                question_type=QuestionType.msq,
                question_text="MSQ",
                options={"A": "one", "B": "two"},
                option_images=None,
                correct_answer="A,B",
                marks=1.0,
                negative_marks=0.0,
                order_index=1,
            ),
            Question(
                test_id=published.id,
                question_type=QuestionType.nat,
                question_text="NAT",
                options=[],
                option_images=None,
                correct_answer="42",
                marks=1.0,
                negative_marks=0.0,
                order_index=2,
            ),
        ]
        session.add_all(questions)
        session.commit()
        for question in questions:
            session.refresh(question)

        yield client, session, owner, other, regular, published, unpublished, questions
    app.dependency_overrides.clear()
    session.close()


def _cookies(user, session):
    session_id = f"lifecycle-{user.id}"
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


def _assert_json(response, expected):
    assert response.status_code == 200
    assert json.dumps(response.json(), sort_keys=True) == json.dumps(
        expected, sort_keys=True
    )


def _snapshot(session, attempt_id):
    attempt = session.get(TestAttempt, attempt_id)
    answers = (
        session.query(UserAnswer)
        .filter(UserAnswer.attempt_id == attempt_id)
        .order_by(UserAnswer.question_id)
        .all()
    )
    return {
        "attempt": None
        if attempt is None
        else {
            "id": attempt.id,
            "status": attempt.status.value,
            "started_at": attempt.started_at.isoformat()
            if attempt.started_at
            else None,
            "submitted_at": attempt.submitted_at.isoformat()
            if attempt.submitted_at
            else None,
            "score": attempt.score,
            "total_marks": attempt.total_marks,
            "tab_violations": attempt.tab_violations,
            "fullscreen_violations": attempt.fullscreen_violations,
        },
        "answers": [
            {
                "question_id": answer.question_id,
                "selected_answer": answer.selected_answer,
                "is_correct": answer.is_correct,
                "marks_awarded": answer.marks_awarded,
                "time_spent_seconds": answer.time_spent_seconds,
            }
            for answer in answers
        ],
    }


def _answer_payload(questions):
    return {
        "answers": [
            {
                "question_id": questions[0].id,
                "selected_answer": "B",
                "time_spent_seconds": 10,
            },
            {
                "question_id": questions[1].id,
                "selected_answer": "A,B",
                "time_spent_seconds": 20,
            },
            {
                "question_id": questions[2].id,
                "selected_answer": "42",
                "time_spent_seconds": 30,
            },
        ]
    }


def test_full_lifecycle_preserves_responses_and_db_snapshots(lifecycle_setup):
    client, session, owner, _, _, test, _, questions = lifecycle_setup
    cookies = _cookies(owner, session)

    start = client.post(f"/tests/{test.id}/start", cookies=cookies)
    attempt_id = start.json()["id"]
    _assert_json(
        start,
        {
            "id": attempt_id,
            "test_id": test.id,
            "status": "in_progress",
            "started_at": FIXED_START.replace(tzinfo=None).isoformat(),
            "submitted_at": None,
            "score": None,
            "total_marks": None,
            "tab_violations": 0,
            "fullscreen_violations": 0,
            "server_time": FIXED_NOW.isoformat(),
            "answers": [],
            "attempt_number": 1,
            "max_attempts": 6,
        },
    )
    assert _snapshot(session, attempt_id)["answers"] == []

    question_response = client.get(
        f"/tests/{test.id}/attempt/{attempt_id}/questions",
        cookies=cookies,
    )
    assert all(
        set(question)
        == {
            "id",
            "question_type",
            "question_text",
            "question_image_url",
            "options",
            "option_images",
            "order_index",
            "marks",
            "negative_marks",
            "subject",
            "topic",
        }
        for question in question_response.json()
    )
    assert all(
        forbidden not in question_response.text
        for forbidden in ("correct_answer", "explanation", "solution", "marks_awarded")
    )
    _assert_json(
        question_response,
        [
            {
                "id": questions[0].id,
                "question_type": "mcq",
                "question_text": "MCQ",
                "question_image_url": None,
                "options": ["A", "B"],
                "option_images": {"A": 7},
                "order_index": 0,
                "marks": 1.0,
                "negative_marks": 0.5,
                "subject": None,
                "topic": None,
            },
            {
                "id": questions[1].id,
                "question_type": "msq",
                "question_text": "MSQ",
                "question_image_url": None,
                "options": {"A": "one", "B": "two"},
                "option_images": None,
                "order_index": 1,
                "marks": 1.0,
                "negative_marks": 0.0,
                "subject": None,
                "topic": None,
            },
            {
                "id": questions[2].id,
                "question_type": "nat",
                "question_text": "NAT",
                "question_image_url": None,
                "options": [],
                "option_images": None,
                "order_index": 2,
                "marks": 1.0,
                "negative_marks": 0.0,
                "subject": None,
                "topic": None,
            },
        ],
    )

    save = client.post(
        f"/tests/{test.id}/attempt/{attempt_id}/save",
        json=_answer_payload(questions),
        cookies=cookies,
    )
    _assert_json(save, {"message": "Saved"})
    assert len(_snapshot(session, attempt_id)["answers"]) == 3

    violations = client.patch(
        f"/tests/{test.id}/attempt/{attempt_id}/violations",
        json={"tab_violations": 2, "fullscreen_violations": 1},
        cookies=cookies,
    )
    _assert_json(violations, {"message": "Updated"})
    assert _snapshot(session, attempt_id)["attempt"]["tab_violations"] == 2
    assert _snapshot(session, attempt_id)["attempt"]["fullscreen_violations"] == 1

    submit = client.post(
        f"/tests/{test.id}/attempt/{attempt_id}/submit",
        json=_answer_payload(questions),
        cookies=cookies,
    )
    _assert_json(
        submit,
        {
            "id": attempt_id,
            "test_id": test.id,
            "status": "submitted",
            "started_at": FIXED_START.replace(tzinfo=None).isoformat(),
            "submitted_at": FIXED_SUBMIT.replace(tzinfo=None).isoformat(),
            "score": 1.5,
            "total_marks": 3.0,
            "tab_violations": 2,
            "fullscreen_violations": 1,
            "persisted": True,
        },
    )
    snapshot = _snapshot(session, attempt_id)
    assert snapshot["attempt"]["status"] == "submitted"
    assert len(snapshot["answers"]) == 3


def test_lifecycle_error_and_branch_responses(lifecycle_setup):
    client, session, owner, other, regular, test, unpublished, questions = lifecycle_setup
    owner_cookies = _cookies(owner, session)
    other_cookies = _cookies(other, session)
    regular_cookies = _cookies(regular, session)

    assert client.post(f"/tests/{test.id}/start").status_code == 401
    assert client.post(f"/tests/{test.id}/start", cookies=regular_cookies).status_code == 403
    assert client.post(f"/tests/{unpublished.id}/start", cookies=owner_cookies).status_code == 404
    assert client.post("/tests/999999/start", cookies=owner_cookies).status_code == 404

    start = client.post(f"/tests/{test.id}/start", cookies=owner_cookies)
    attempt_id = start.json()["id"]
    assert client.get(
        f"/tests/{test.id}/attempt/{attempt_id}/questions",
        cookies=other_cookies,
    ).status_code == 404
    assert client.patch(
        f"/tests/{test.id}/attempt/{attempt_id}/violations",
        json={"tab_violations": 1},
        cookies=other_cookies,
    ).status_code == 404
    assert client.post(
        f"/tests/{test.id}/attempt/{attempt_id}/save",
        json={"answers": []},
        cookies=other_cookies,
    ).status_code == 404
    assert client.post(
        f"/tests/{test.id}/attempt/{attempt_id}/submit",
        json={"answers": []},
        cookies=other_cookies,
    ).status_code == 404

    expired = session.get(TestAttempt, attempt_id)
    expired.started_at = datetime(2020, 1, 1)
    session.commit()
    resumed = client.post(f"/tests/{test.id}/start", cookies=owner_cookies)
    assert resumed.status_code == 200
    assert resumed.json()["id"] == attempt_id
    assert resumed.json()["started_at"] == FIXED_START.replace(tzinfo=None).isoformat()

    session.query(TestAttempt).delete()
    session.commit()
    for _ in range(6):
        session.add(
            TestAttempt(
                user_id=owner.id,
                test_id=test.id,
                status=TestStatus.submitted,
                started_at=FIXED_START,
                submitted_at=FIXED_SUBMIT,
                score=1.0,
                total_marks=3.0,
            )
        )
    session.commit()
    assert client.post(f"/tests/{test.id}/start", cookies=owner_cookies).json() == {
        "detail": "Maximum attempts (6) reached for this test."
    }


def test_save_practice_branch_submit_expired_and_double_submit(lifecycle_setup):
    client, session, owner, _, _, test, _, questions = lifecycle_setup
    cookies = _cookies(owner, session)

    first = client.post(f"/tests/{test.id}/start", cookies=cookies).json()
    first_submit = client.post(
        f"/tests/{test.id}/attempt/{first['id']}/submit",
        json={"answers": []},
        cookies=cookies,
    )
    assert first_submit.json()["persisted"] is True
    assert client.post(
        f"/tests/{test.id}/attempt/{first['id']}/submit",
        json={"answers": []},
        cookies=cookies,
    ).json() == {"detail": "Already submitted"}
    assert client.post(
        f"/tests/{test.id}/attempt/{first['id']}/save",
        json={"answers": []},
        cookies=cookies,
    ).json() == {"detail": "Invalid attempt"}
    assert client.patch(
        f"/tests/{test.id}/attempt/{first['id']}/violations",
        json={"tab_violations": 1},
        cookies=cookies,
    ).json() == {"detail": "Invalid attempt"}

    practice = client.post(f"/tests/{test.id}/start", cookies=cookies).json()
    _assert_json(
        client.post(
            f"/tests/{test.id}/attempt/{practice['id']}/save",
            json={"answers": []},
            cookies=cookies,
        ),
        {"message": "Practice answers are kept in browser until submit"},
    )
    practice_submit = client.post(
        f"/tests/{test.id}/attempt/{practice['id']}/submit",
        json=_answer_payload(questions),
        cookies=cookies,
    )
    assert practice_submit.json()["persisted"] is False
    assert practice_submit.json()["result"]["attempt_id"] == f"practice-{practice['id']}"
    assert session.get(TestAttempt, practice["id"]) is None

    expired = client.post(f"/tests/{test.id}/start", cookies=cookies).json()
    expired_row = session.get(TestAttempt, expired["id"])
    expired_row.started_at = datetime(2020, 1, 1)
    session.commit()
    expired_submit = client.post(
        f"/tests/{test.id}/attempt/{expired['id']}/submit",
        json={"answers": []},
        cookies=cookies,
    )
    assert expired_submit.json() == {
        "detail": "Test attempt expired. Please start a new attempt."
    }
    assert session.get(TestAttempt, expired["id"]) is None
