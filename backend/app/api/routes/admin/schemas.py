from typing import List, Optional
from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)
from app.models.models import QuestionType
from app.services.answer_utils import normalize_question_type, validate_answer_for_type

class RoleUpdate(BaseModel):
    role: str

class TestCreate(BaseModel):
    title: str = Field(...)
    description: Optional[str] = None
    duration_minutes: int = 180
    series_id: Optional[int] = None
    series_order: int = 0
    category: Optional[str] = None
    series_name: Optional[str] = None
    test_type: Optional[str] = None
    subject: Optional[str] = None

class TestPatch(BaseModel):
    series_id: Optional[int] = None
    series_order: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    is_published: Optional[bool] = None
    category: Optional[str] = None
    series_name: Optional[str] = None
    test_type: Optional[str] = None
    subject: Optional[str] = None

class QuestionValidationMixin(BaseModel):
    @model_validator(mode="after")
    def validate_answer_shape(self):
        q_type = self.question_type
        if isinstance(q_type, QuestionType):
            q_type = q_type.value
        else:
            q_type = normalize_question_type(q_type)
            if q_type not in {"mcq", "msq", "nat"}:
                raise ValueError("question_type must be one of mcq, msq, or nat")
            self.question_type = q_type
            
        self.correct_answer = self.correct_answer.strip().upper().replace(" ", "")
        if not self.correct_answer:
            raise ValueError("correct_answer is required")

        answer, neg_override, clear_opts = validate_answer_for_type(
            q_type, self.correct_answer
        )
        self.correct_answer = answer
        if neg_override is not None:
            self.negative_marks = neg_override
        if clear_opts:
            self.options = []

        return self

class QuestionIn(QuestionValidationMixin):
    question_type: str = "mcq"
    question_text: str
    options: List[str] = []
    correct_answer: str
    marks: float = 1.0
    negative_marks: float = 0.33
    subject: Optional[str] = None
    topic: Optional[str] = None

class QuestionsBulk(BaseModel):
    questions: List[QuestionIn]

class QuestionFileImport(QuestionValidationMixin):
    model_config = ConfigDict(extra="forbid")

    question_type: QuestionType
    question_text: str = Field(..., min_length=1)
    options: List[str] = Field(default_factory=list)
    correct_answer: str = Field(..., min_length=1)
    marks: float = 1.0
    negative_marks: float = 0.33
    order_index: int = 0
    subject: Optional[str] = None
    topic: Optional[str] = None

    @field_validator("question_text", "correct_answer")
    @classmethod
    def validate_required_text(cls, value: str):
        stripped = value.strip()
        if not stripped:
            raise ValueError("field cannot be blank")
        return stripped

    @field_validator("subject", "topic")
    @classmethod
    def normalize_optional_text(cls, value: Optional[str]):
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None

    @field_validator("options", mode="before")
    @classmethod
    def validate_options_list(cls, value):
        if value is None:
            return []
        if not isinstance(value, list):
            raise ValueError("options must be a JSON list")
        if any(not isinstance(option, str) for option in value):
            raise ValueError("options must contain only strings")
        return value

    @field_validator("marks", "negative_marks", mode="before")
    @classmethod
    def validate_numeric_fields(cls, value):
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise ValueError("field must be a number")
        return float(value)

    @field_validator("order_index", mode="before")
    @classmethod
    def validate_order_index(cls, value):
        if isinstance(value, bool) or not isinstance(value, int):
            raise ValueError("order_index must be an integer")
        return value
