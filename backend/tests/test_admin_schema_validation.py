import pytest
from pydantic import ValidationError

from app.api.routes.admin import schemas
from app.api.routes.admin.schemas import QuestionFileImport, QuestionIn


def valid_question_payload() -> dict:
    return {
        "question_text": "Question",
        "options": ["A", "B", "C", "D"],
        "correct_answer": "A",
    }


@pytest.mark.parametrize("field_value", [0, -1])
def test_question_marks_must_be_positive(field_value):
    with pytest.raises(ValidationError):
        QuestionIn(**valid_question_payload(), marks=field_value)


def test_question_negative_marks_cannot_be_negative():
    with pytest.raises(ValidationError):
        QuestionIn(**valid_question_payload(), negative_marks=-1)


@pytest.mark.parametrize("options", [[], ["A", "B", "C"], ["A", "B", " ", "D"]])
def test_choice_questions_require_four_non_empty_options(options):
    with pytest.raises(ValidationError):
        QuestionIn(
            question_text="Question",
            options=options,
            correct_answer="A",
        )


def test_file_import_applies_question_validation():
    with pytest.raises(ValidationError):
        QuestionFileImport(
            question_type="mcq",
            question_text="Question",
            options=[],
            correct_answer="A",
        )


@pytest.mark.parametrize("schema, payload", [
    (schemas.TestCreate, {"title": "Test", "duration_minutes": 0}),
    (schemas.TestPatch, {"duration_minutes": -1}),
])
def test_test_duration_must_be_positive(schema, payload):
    with pytest.raises(ValidationError):
        schema(**payload)
