import unittest

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.routes.tests import (
    AnswerSubmit,
    BulkAnswerSubmit,
    get_result,
    my_history,
    save_answers,
    start_test,
    submit_test,
)
from app.core.database import Base
from app.models.models import (
    PracticeAttemptCounter,
    Question,
    QuestionType,
    Test,
    TestAttempt,
    User,
    UserAnswer,
    UserRole,
)


class AttemptPersistenceTests(unittest.TestCase):
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
            user = User(email="student@example.com", full_name="Student", role=UserRole.aspirant)
            test = Test(title="Persistence", created_by=1, total_marks=2.0)
            db.add_all([user, test])
            db.commit()
            db.refresh(user)
            db.refresh(test)

            q1 = Question(
                test_id=test.id,
                question_type=QuestionType.mcq,
                question_text="First",
                options=["A", "B", "C", "D"],
                correct_answer="A",
                marks=1.0,
                negative_marks=0.0,
                order_index=1,
            )
            q2 = Question(
                test_id=test.id,
                question_type=QuestionType.mcq,
                question_text="Second",
                options=["A", "B", "C", "D"],
                correct_answer="B",
                marks=1.0,
                negative_marks=0.0,
                order_index=2,
            )
            db.add_all([q1, q2])
            db.commit()
            db.refresh(q1)
            db.refresh(q2)

            self.user_id = user.id
            self.test_id = test.id
            self.question_ids = [q1.id, q2.id]
        finally:
            db.close()

    def _payload(self, first="A", second="B"):
        q1, q2 = self.question_ids
        return BulkAnswerSubmit(answers=[
            AnswerSubmit(question_id=q1, selected_answer=first, time_spent_seconds=10),
            AnswerSubmit(question_id=q2, selected_answer=second, time_spent_seconds=20),
        ])

    def test_only_first_attempt_result_is_persisted(self):
        db = self.SessionLocal()
        try:
            user = db.query(User).filter(User.id == self.user_id).one()

            first_attempt = start_test(self.test_id, db, user)
            self.assertEqual(first_attempt["attempt_number"], 1)

            first_result = submit_test(self.test_id, first_attempt["id"], self._payload(), db, user)
            self.assertTrue(first_result["persisted"])
            self.assertEqual(db.query(TestAttempt).count(), 1)
            self.assertEqual(db.query(UserAnswer).count(), 2)

            saved_result = get_result(first_result["id"], db, user)
            self.assertNotIn("average_score", saved_result)
            self.assertNotIn("average_percentage", saved_result)

            second_attempt = start_test(self.test_id, db, user)
            self.assertEqual(second_attempt["attempt_number"], 2)

            save_answers(self.test_id, second_attempt["id"], self._payload(first="B"), db, user)
            self.assertEqual(db.query(UserAnswer).count(), 2)

            practice_result = submit_test(self.test_id, second_attempt["id"], self._payload(), db, user)
            self.assertFalse(practice_result["persisted"])
            self.assertEqual(practice_result["result"]["attempt_id"], f"practice-{second_attempt['id']}")
            self.assertEqual(practice_result["result"]["score"], 2.0)

            self.assertEqual(db.query(TestAttempt).count(), 1)
            self.assertEqual(db.query(UserAnswer).count(), 2)
            self.assertEqual(db.query(PracticeAttemptCounter).one().count, 1)
            self.assertEqual(len(my_history(db, user)), 1)

            third_attempt = start_test(self.test_id, db, user)
            self.assertEqual(third_attempt["attempt_number"], 3)
        finally:
            db.close()


if __name__ == "__main__":
    unittest.main()
