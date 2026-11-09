from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import require_admin
from app.api.routes.admin import router
from app.core.database import Base, get_db
from app.models.models import (
    Question,
    QuestionType,
    Test,
    TestAttempt,
    User,
    UserAnswer,
    UserRole,
)


def test_deleting_answered_question_returns_conflict_and_preserves_history():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def enable_foreign_keys(connection, _):
        connection.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine)
    db = session_factory()
    try:
        admin = User(
            email="admin@example.com", full_name="Admin", role=UserRole.admin
        )
        student = User(
            email="student@example.com", full_name="Student", role=UserRole.aspirant
        )
        test = Test(title="Attempt history", created_by=1, total_marks=1.0)
        db.add_all([admin, student, test])
        db.commit()
        db.refresh(admin)
        db.refresh(student)
        db.refresh(test)

        question = Question(
            test_id=test.id,
            question_type=QuestionType.mcq,
            question_text="Answered question",
            options=["A", "B", "C", "D"],
            correct_answer="A",
            marks=1.0,
            negative_marks=0.33,
            order_index=0,
        )
        attempt = TestAttempt(user_id=student.id, test_id=test.id)
        db.add_all([question, attempt])
        db.commit()
        db.refresh(question)
        db.refresh(attempt)
        answer = UserAnswer(
            attempt_id=attempt.id,
            question_id=question.id,
            selected_answer="B",
            is_correct=False,
            marks_awarded=-0.33,
        )
        db.add(answer)
        db.commit()

        app = FastAPI()
        app.include_router(router)

        def override_get_db():
            session = session_factory()
            try:
                yield session
            finally:
                session.close()

        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[require_admin] = lambda: admin
        client = TestClient(app, raise_server_exceptions=False)

        response = client.delete(
            f"/admin/tests/{test.id}/questions/{question.id}"
        )

        assert response.status_code == 409
        assert response.json()["detail"] == (
            "Cannot delete a question that has been answered in an attempt"
        )
        assert db.query(Question).filter_by(id=question.id).one()
        assert db.query(UserAnswer).filter_by(id=answer.id).one()
    finally:
        db.close()
        engine.dispose()


def test_delete_question_reindexes_contiguously():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine)
    db = session_factory()
    try:
        admin = User(email="admin@example.com", full_name="Admin", role=UserRole.admin)
        test = Test(title="Reindex test", created_by=1, total_marks=3.0, is_published=True)
        db.add_all([admin, test])
        db.commit()

        q0 = Question(test_id=test.id, question_text="Q0", options=["A","B","C","D"], correct_answer="A", marks=1.0, order_index=0)
        q1 = Question(test_id=test.id, question_text="Q1", options=["A","B","C","D"], correct_answer="B", marks=1.0, order_index=1)
        q2 = Question(test_id=test.id, question_text="Q2", options=["A","B","C","D"], correct_answer="C", marks=1.0, order_index=2)
        db.add_all([q0, q1, q2])
        db.commit()

        app = FastAPI()
        app.include_router(router)
        app.dependency_overrides[get_db] = lambda: session_factory()
        app.dependency_overrides[require_admin] = lambda: admin
        client = TestClient(app, raise_server_exceptions=False)

        # Delete Q1 (middle question)
        resp = client.delete(f"/admin/tests/{test.id}/questions/{q1.id}")
        assert resp.status_code == 200
        assert resp.json()["reverted_to_draft"] is False

        remaining = db.query(Question).filter(Question.test_id == test.id).order_by(Question.order_index).all()
        assert len(remaining) == 2
        assert [q.order_index for q in remaining] == [0, 1]
        assert [q.question_text for q in remaining] == ["Q0", "Q2"]
    finally:
        db.close()
        engine.dispose()


def test_delete_last_question_reverts_to_draft():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine)
    db = session_factory()
    try:
        admin = User(email="admin@example.com", full_name="Admin", role=UserRole.admin)
        test = Test(title="Auto draft test", created_by=1, total_marks=1.0, is_published=True)
        db.add_all([admin, test])
        db.commit()

        q = Question(test_id=test.id, question_text="Only Q", options=["A","B","C","D"], correct_answer="A", marks=1.0, order_index=0)
        db.add(q)
        db.commit()

        app = FastAPI()
        app.include_router(router)
        app.dependency_overrides[get_db] = lambda: session_factory()
        app.dependency_overrides[require_admin] = lambda: admin
        client = TestClient(app, raise_server_exceptions=False)

        resp = client.delete(f"/admin/tests/{test.id}/questions/{q.id}")
        assert resp.status_code == 200
        assert resp.json()["reverted_to_draft"] is True

        db.refresh(test)
        assert test.is_published is False
    finally:
        db.close()
        engine.dispose()
