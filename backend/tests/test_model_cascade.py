import unittest

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.models import PracticeAttemptCounter, Question, Test, TestAttempt, User, UserAnswer, UserRole


class ModelCascadeTests(unittest.TestCase):
    def test_deleting_test_deletes_attempts_and_answers(self):
        engine = create_engine("sqlite:///:memory:")

        @event.listens_for(engine, "connect")
        def _enable_foreign_keys(dbapi_connection, _):
            dbapi_connection.execute("PRAGMA foreign_keys=ON")

        Base.metadata.create_all(engine)
        SessionLocal = sessionmaker(bind=engine)
        db = SessionLocal()
        try:
            user = User(email="student@example.com", full_name="Student", role=UserRole.aspirant)
            test = Test(title="Delete me", created_by=1)
            db.add_all([user, test])
            db.commit()

            question = Question(
                test_id=test.id,
                question_type="mcq",
                question_text="Choose one",
                options=["A", "B", "C", "D"],
                correct_answer="A",
            )
            attempt = TestAttempt(user_id=user.id, test_id=test.id)
            counter = PracticeAttemptCounter(user_id=user.id, test_id=test.id, count=2)
            db.add_all([question, attempt, counter])
            db.commit()

            answer = UserAnswer(attempt_id=attempt.id, question_id=question.id, selected_answer="A")
            db.add(answer)
            db.commit()

            db.delete(test)
            db.commit()

            self.assertEqual(db.query(Test).count(), 0)
            self.assertEqual(db.query(Question).count(), 0)
            self.assertEqual(db.query(TestAttempt).count(), 0)
            self.assertEqual(db.query(UserAnswer).count(), 0)
            self.assertEqual(db.query(PracticeAttemptCounter).count(), 0)
        finally:
            db.close()


if __name__ == "__main__":
    unittest.main()
