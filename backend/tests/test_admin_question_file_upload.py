import json
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


class AdminQuestionFileUploadTests(unittest.TestCase):
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
            self.admin = User(email="admin@example.com", full_name="Admin", role=UserRole.admin)
            self.test = Test(title="File import", created_by=1, total_marks=0.0)
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
        self.client = TestClient(app)

    def test_upload_questions_file_imports_valid_questions(self):
        payload = {
            "questions": [
                {
                    "question_type": "mcq",
                    "question_text": "Pick the stable sort.",
                    "options": ["Quick sort", "Heap sort", "Merge sort", "Selection sort"],
                    "correct_answer": "C",
                    "marks": 2,
                    "negative_marks": 0.66,
                    "order_index": 4,
                    "subject": "Algorithms",
                    "topic": "Sorting",
                }
            ]
        }

        response = self.client.post(
            f"/admin/tests/{self.test_id}/questions/upload-file",
            files={"file": ("questions.json", json.dumps(payload), "application/json")},
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["imported_count"], 1)

        db = self.SessionLocal()
        try:
            question = db.query(Question).one()
            test = db.query(Test).filter(Test.id == self.test_id).one()
            self.assertEqual(question.question_type, QuestionType.mcq)
            self.assertEqual(question.correct_answer, "C")
            self.assertEqual(question.order_index, 4)
            self.assertEqual(test.total_marks, 2.0)
        finally:
            db.close()

    def test_upload_questions_file_accepts_nat_colon_range(self):
        payload = {
            "questions": [
                {
                    "question_type": "nat",
                    "question_text": "Probability that the slot is empty.",
                    "options": [],
                    "correct_answer": "0.44:0.45",
                    "marks": 2,
                    "negative_marks": 0,
                    "order_index": 17,
                }
            ]
        }

        response = self.client.post(
            f"/admin/tests/{self.test_id}/questions/upload-file",
            files={"file": ("questions.json", json.dumps(payload), "application/json")},
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["imported_count"], 1)

        db = self.SessionLocal()
        try:
            question = db.query(Question).one()
            self.assertEqual(question.question_type, QuestionType.nat)
            self.assertEqual(question.correct_answer, "0.44:0.45")
            self.assertEqual(question.order_index, 17)
        finally:
            db.close()

    def test_upload_questions_file_rejects_invalid_questions_without_insert(self):
        payload = [
            {
                "question_type": "mcq",
                "question_text": "Bad answer",
                "options": ["A", "B", "C", "D"],
                "correct_answer": "Z",
            }
        ]

        response = self.client.post(
            f"/admin/tests/{self.test_id}/questions/upload-file",
            files={"file": ("questions.json", json.dumps(payload), "application/json")},
        )

        self.assertEqual(response.status_code, 422)
        self.assertIn("errors", response.json()["detail"])

        db = self.SessionLocal()
        try:
            self.assertEqual(db.query(Question).count(), 0)
        finally:
            db.close()

    def test_admin_can_update_imported_question_and_total_marks(self):
        db = self.SessionLocal()
        try:
            question = Question(
                test_id=self.test_id,
                question_type=QuestionType.mcq,
                question_text="Imported question",
                options=["A1", "B1", "C1", "D1"],
                correct_answer="A",
                marks=2.0,
                negative_marks=0.66,
                order_index=0,
            )
            test = db.query(Test).filter(Test.id == self.test_id).one()
            test.total_marks = 2.0
            db.add(question)
            db.commit()
            db.refresh(question)
            question_id = question.id
        finally:
            db.close()

        payload = {
            "question_type": "msq",
            "question_text": "Corrected question",
            "options": ["A2", "B2", "C2", "D2"],
            "correct_answer": "A,C",
            "marks": 3.0,
            "negative_marks": 0.33,
            "subject": "Data Structures",
            "topic": "Trees",
        }

        response = self.client.patch(
            f"/admin/tests/{self.test_id}/questions/{question_id}",
            json=payload,
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["question_type"], "msq")
        self.assertEqual(body["question_text"], "Corrected question")
        self.assertEqual(body["options"], ["A2", "B2", "C2", "D2"])
        self.assertEqual(body["correct_answer"], "A,C")
        self.assertEqual(body["negative_marks"], 0.0)

        db = self.SessionLocal()
        try:
            question = db.query(Question).filter(Question.id == question_id).one()
            test = db.query(Test).filter(Test.id == self.test_id).one()
            self.assertEqual(question.question_type, QuestionType.msq)
            self.assertEqual(question.marks, 3.0)
            self.assertEqual(test.total_marks, 3.0)
        finally:
            db.close()

    def test_update_question_rejects_invalid_answer(self):
        db = self.SessionLocal()
        try:
            question = Question(
                test_id=self.test_id,
                question_type=QuestionType.mcq,
                question_text="Imported question",
                options=["A1", "B1", "C1", "D1"],
                correct_answer="A",
                marks=2.0,
                negative_marks=0.66,
                order_index=0,
            )
            db.add(question)
            db.commit()
            db.refresh(question)
            question_id = question.id
        finally:
            db.close()

        response = self.client.patch(
            f"/admin/tests/{self.test_id}/questions/{question_id}",
            json={
                "question_type": "mcq",
                "question_text": "Still invalid",
                "options": ["A", "B", "C", "D"],
                "correct_answer": "Z",
                "marks": 2.0,
                "negative_marks": 0.66,
            },
        )

        self.assertEqual(response.status_code, 422)


if __name__ == "__main__":
    unittest.main()
