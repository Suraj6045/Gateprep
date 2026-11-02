"""Regression test for question ordering returned by the admin endpoint.

Locks in the guarantee that ``Test.questions`` is loaded ordered by
``Question.order_index`` (declared on the relationship in
``app.models.models``). If that ``order_by`` is ever removed, this test will
fail — protecting the ``get_questions`` endpoint which relies on it after the
optimization that removed an in-Python ``sorted(...)`` call.
"""

import unittest

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import require_admin
from app.api.routes.admin import router
from app.core.database import Base, get_db
from app.models.models import Question, QuestionType, Test, User, UserRole


class AdminGetQuestionsOrderingTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        # Creates the full schema including Question.order_index, since the
        # production model is imported above and Base is the shared metadata.
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine)

        # Seed an admin user and a Test with questions inserted in REVERSE
        # order_index so a missing ORDER BY would produce [5, 3, 1].
        db = self.SessionLocal()
        try:
            self.admin = User(
                email="admin@example.com",
                full_name="Admin",
                role=UserRole.admin,
            )
            self.test = Test(
                title="Ordering test", created_by=1, total_marks=0.0
            )
            db.add_all([self.admin, self.test])
            db.commit()
            db.refresh(self.admin)
            db.refresh(self.test)
            self.test_id = self.test.id

            for order_index, text in [(5, "Q-five"), (1, "Q-one"), (3, "Q-three")]:
                db.add(
                    Question(
                        test_id=self.test_id,
                        question_type=QuestionType.mcq,
                        question_text=text,
                        options=["A", "B", "C", "D"],
                        correct_answer="A",
                        marks=1.0,
                        negative_marks=0.0,
                        order_index=order_index,
                    )
                )
            db.commit()
        finally:
            db.close()

        app = FastAPI()
        app.include_router(router)

        def override_get_db():
            session = self.SessionLocal()
            try:
                yield session
            finally:
                session.close()

        def override_require_admin():
            return self.admin

        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[require_admin] = override_require_admin
        self.client = TestClient(app, raise_server_exceptions=False)

    def test_get_questions_returns_questions_sorted_by_order_index(self):
        response = self.client.get(f"/admin/tests/{self.test_id}/questions")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(len(payload), 3)
        self.assertEqual(
            [item["order_index"] for item in payload],
            [1, 3, 5],
        )
        self.assertEqual(
            [item["question_text"] for item in payload],
            ["Q-one", "Q-three", "Q-five"],
        )

    def test_get_questions_returns_404_for_unknown_test(self):
        response = self.client.get("/admin/tests/9999/questions")
        self.assertEqual(response.status_code, 404)


if __name__ == "__main__":
    unittest.main()
