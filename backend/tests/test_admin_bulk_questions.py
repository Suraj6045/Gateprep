import unittest

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import require_admin
from app.api.routes.admin import router
from app.core.database import Base, get_db
from app.models.models import Question, Test, User, UserRole


class AdminBulkQuestionsTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine)

        db = self.SessionLocal()
        try:
            self.admin = User(
                email="admin@example.com", full_name="Admin", role=UserRole.admin
            )
            self.test = Test(title="Bulk insert", created_by=1, total_marks=0.0)
            db.add_all([self.admin, self.test])
            db.commit()
            db.refresh(self.admin)
            db.refresh(self.test)
            self.test_id = self.test.id
        finally:
            db.close()

        app = FastAPI()
        app.include_router(router)

        def override_get_db():
            db = self.SessionLocal()
            try:
                yield db
            finally:
                db.close()

        def override_require_admin():
            return self.admin

        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[require_admin] = override_require_admin
        self.client = TestClient(app, raise_server_exceptions=False)

    def test_bulk_question_insert_rolls_back_all_questions_on_late_failure(self):
        def fail_on_marker(_mapper, _connection, target):
            if target.question_text == "Explode during insert":
                raise RuntimeError("simulated insert failure")

        event.listen(Question, "before_insert", fail_on_marker)
        self.addCleanup(event.remove, Question, "before_insert", fail_on_marker)

        questions = [
            {
                "question_type": "mcq",
                "question_text": f"Question {idx}",
                "options": ["A", "B", "C", "D"],
                "correct_answer": "A",
                "marks": 1.0,
                "negative_marks": 0.33,
            }
            for idx in range(20)
        ]
        questions.append(
            {
                "question_type": "mcq",
                "question_text": "Explode during insert",
                "options": ["A", "B", "C", "D"],
                "correct_answer": "A",
                "marks": 1.0,
                "negative_marks": 0.33,
            }
        )

        response = self.client.post(
            f"/admin/tests/{self.test_id}/questions", json={"questions": questions}
        )

        self.assertEqual(response.status_code, 500)

        db = self.SessionLocal()
        try:
            self.assertEqual(db.query(Question).count(), 0)
            test = db.query(Test).filter(Test.id == self.test_id).one()
            self.assertEqual(test.total_marks, 0.0)
        finally:
            db.close()


if __name__ == "__main__":
    unittest.main()
