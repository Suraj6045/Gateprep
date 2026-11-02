import json
from pathlib import Path
import pytest
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
    TestAttempt,
)
from app.core.security import hash_password, create_access_token
from app.core.config import settings


@pytest.fixture
def db_session():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
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
def test_setup(db_session):
    user1 = User(
        email="student1@test.com",
        full_name="Student One",
        hashed_password=hash_password("pass123"),
        role=UserRole.aspirant,
        is_active=True,
    )
    user2 = User(
        email="student2@test.com",
        full_name="Student Two",
        hashed_password=hash_password("pass123"),
        role=UserRole.aspirant,
        is_active=True,
    )
    db_session.add_all([user1, user2])
    db_session.commit()
    db_session.refresh(user1)
    db_session.refresh(user2)

    test = Test(
        title="Algorithms & Math CS Test",
        duration_minutes=60,
        total_marks=4.0,
        is_published=True,
        created_by=user1.id,
    )
    db_session.add(test)
    db_session.commit()
    db_session.refresh(test)

    q1 = Question(
        test_id=test.id,
        question_type=QuestionType.mcq,
        question_text="What is $O(n \\log n)$ time complexity?",
        options=["Linear", "Log-linear", "Quadratic", "Exponential"],
        correct_answer="B",
        marks=1.0,
        negative_marks=0.33,
        order_index=0,
    )
    q2 = Question(
        test_id=test.id,
        question_type=QuestionType.nat,
        question_text="Evaluate $\\sum_{i=1}^{3} i$",
        options=[],
        correct_answer="6",
        marks=2.0,
        negative_marks=0.0,
        order_index=1,
    )
    db_session.add_all([q1, q2])
    db_session.commit()
    for q in [q1, q2]:
        db_session.refresh(q)

    return {
        "user1": user1,
        "user2": user2,
        "test": test,
        "questions": [q1, q2],
    }


def test_katex_version_parity():
    """
    Ensure the committed inlined KaTeX asset version matches frontend/package.json,
    preventing silent version drift.
    """
    repo_root = Path(__file__).resolve().parent.parent.parent
    pkg_path = repo_root / "frontend" / "package.json"
    katex_css_path = repo_root / "backend" / "app" / "static" / "katex" / "katex-inline.css"

    assert pkg_path.exists(), "frontend/package.json must exist"
    assert katex_css_path.exists(), "backend/app/static/katex/katex-inline.css must exist"

    pkg_data = json.loads(pkg_path.read_text(encoding="utf-8"))
    raw_version = pkg_data.get("dependencies", {}).get("katex", "0.17.0")
    clean_version = raw_version.lstrip("^~")

    content = katex_css_path.read_text(encoding="utf-8")
    first_line = content.split("\n", 1)[0]
    expected_header = f"/* KaTeX v{clean_version} (inlined fonts) */"
    assert first_line == expected_header, (
        f"KaTeX asset version mismatch! Found '{first_line}', expected '{expected_header}'. "
        f"Run `node scripts/build-katex-inline.mjs` to synchronize."
    )

    # Ensure zero relative URLs remain (all fonts must be data:font/woff2;base64)
    import re
    relative_urls = re.findall(r"url\((?!['\"]?data:)[^)]+\)", content)
    assert relative_urls == [], f"Found non-inlined relative URLs in KaTeX CSS: {relative_urls}"


def test_get_result_html_success(client, db_session, test_setup):
    user1 = test_setup["user1"]
    test = test_setup["test"]
    q1, q2 = test_setup["questions"]
    cookies = _auth_cookie(user1, db_session)

    # 1. Start test
    start_resp = client.post(f"/tests/{test.id}/start", cookies=cookies)
    assert start_resp.status_code == 200
    attempt_id = start_resp.json()["id"]

    # 2. Submit test
    submit_payload = {
        "answers": [
            {"question_id": q1.id, "selected_answer": "B", "time_spent_seconds": 30},
            {"question_id": q2.id, "selected_answer": "6", "time_spent_seconds": 45},
        ]
    }
    submit_resp = client.post(
        f"/tests/{test.id}/attempt/{attempt_id}/submit",
        json=submit_payload,
        cookies=cookies,
    )
    assert submit_resp.status_code == 200

    # 3. Request result HTML report
    resp = client.get(f"/tests/attempt/{attempt_id}/result.html", cookies=cookies)
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/html")
    assert resp.headers["content-disposition"] == 'attachment; filename="algorithms-math-cs-test-result.html"'

    body = resp.text
    # Check document structure and branding
    assert "<!DOCTYPE html>" in body
    assert "Algorithms &amp; Math CS Test" in body
    assert "Gateprep Result Report" in body

    # Check KaTeX assets and scripts are inlined
    assert "renderMathInElement" in body
    assert "KaTeX_Main" in body or "data:font/woff2;base64" in body

    # Check question content and review details
    assert "What is $O(n \\log n)$ time complexity?" in body
    assert "Log-linear" in body
    assert "Evaluate $\\sum_{i=1}^{3} i$" in body
    assert "Generated by Gateprep on" in body


def test_get_result_html_not_found(client, db_session, test_setup):
    cookies = _auth_cookie(test_setup["user1"], db_session)
    resp = client.get("/tests/attempt/999999/result.html", cookies=cookies)
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Result not found"


def test_get_result_html_unauthorized(client, test_setup):
    resp = client.get("/tests/attempt/1/result.html")
    assert resp.status_code == 401


def test_get_result_html_other_user_attempt_not_found(client, db_session, test_setup):
    """
    Ensure accessing another user's attempt returns 404 'Result not found' on both
    the JSON result endpoint and the HTML result report endpoint, preventing
    enumeration of other users' attempts.
    """
    user1 = test_setup["user1"]
    user2 = test_setup["user2"]
    test = test_setup["test"]
    q1 = test_setup["questions"][0]

    # User 1 starts and submits attempt
    cookies1 = _auth_cookie(user1, db_session)
    start_resp = client.post(f"/tests/{test.id}/start", cookies=cookies1)
    attempt_id = start_resp.json()["id"]

    client.post(
        f"/tests/{test.id}/attempt/{attempt_id}/submit",
        json={"answers": [{"question_id": q1.id, "selected_answer": "B", "time_spent_seconds": 10}]},
        cookies=cookies1,
    )

    # User 2 attempts to fetch User 1's result via JSON and HTML endpoints
    cookies2 = _auth_cookie(user2, db_session)

    # 1. JSON endpoint check
    json_resp = client.get(f"/tests/attempt/{attempt_id}/result", cookies=cookies2)
    assert json_resp.status_code == 404
    assert json_resp.json()["detail"] == "Result not found"

    # 2. HTML endpoint check
    html_resp = client.get(f"/tests/attempt/{attempt_id}/result.html", cookies=cookies2)
    assert html_resp.status_code == 404
    assert html_resp.json()["detail"] == "Result not found"
