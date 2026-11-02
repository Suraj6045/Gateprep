import pytest
from pydantic import ValidationError

from app.api.routes.tests.schemas import AnswerSubmit


def test_answer_submit_allows_zero_time_spent():
    answer = AnswerSubmit(question_id=1, time_spent_seconds=0)

    assert answer.time_spent_seconds == 0


def test_answer_submit_rejects_negative_time_spent():
    with pytest.raises(ValidationError):
        AnswerSubmit(question_id=1, time_spent_seconds=-1)
