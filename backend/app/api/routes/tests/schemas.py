from datetime import datetime
from typing import Annotated, Any, List, Literal, Optional

from pydantic import PlainSerializer

from pydantic import BaseModel, Field

from app.models.models import QuestionType, TestStatus


LegacyDatetime = Annotated[
    datetime,
    PlainSerializer(lambda value: value.isoformat(), return_type=str, when_used="json"),
]


class CatalogResponse(BaseModel):
    id: int
    title: str
    description: str | None
    duration_minutes: int
    total_marks: int | float
    question_count: int
    series_id: int | None
    created_at: LegacyDatetime
    category: str | None
    series_name: str | None
    test_type: str | None
    subject: str | None


class DetailResponse(BaseModel):
    id: int
    title: str
    description: str | None
    duration_minutes: int
    total_marks: int | float
    question_count: int
    series_id: int | None
    created_at: LegacyDatetime
    test_type: str | None


class HistoryResponse(BaseModel):
    id: int
    test_id: int
    status: TestStatus
    started_at: LegacyDatetime | None
    submitted_at: LegacyDatetime | None
    score: int | float | None
    total_marks: int | float | None
    tab_violations: int
    fullscreen_violations: int


class MyAttemptResponse(BaseModel):
    attempt_id: int
    attempt_number: int
    counts_for_leaderboard: bool
    is_first: bool
    status: TestStatus
    score: int | float | None
    total_marks: int | float | None
    percentage: int | float
    started_at: LegacyDatetime | None
    submitted_at: LegacyDatetime | None
    attempts_remaining: int


class LeaderboardEntryResponse(BaseModel):
    rank: int
    user_id: int
    full_name: str
    score: int | float | None
    total_marks: int | float | None
    percentage: int | float
    submitted_at: LegacyDatetime | None
    tab_violations: int
    is_current_user: bool


class LeaderboardResponse(BaseModel):
    test_id: int
    test_title: str
    total_participants: int
    current_user_rank: int | None
    limit: int
    offset: int
    leaderboard: list[LeaderboardEntryResponse]


class ResultAnswerResponse(BaseModel):
    question_id: int
    question_text: str
    question_type: QuestionType
    question_image_url: str | None
    options: list[Any] | dict[str, Any]
    option_images: dict[str, Any] | None
    correct_answer: str
    selected_answer: str | None
    is_correct: bool | None
    marks_awarded: int | float
    marks: int | float
    negative_marks: int | float
    time_spent_seconds: int
    topper_answer: str | None
    topper_time_seconds: int


class ResultTopperResponse(BaseModel):
    user_id: int
    full_name: str
    score: int | float | None
    total_marks: int | float | None
    percentage: int | float


class PersistedResultResponse(BaseModel):
    attempt_id: int
    client_result_id: str | None
    attempt_number: int
    attempts_remaining: int
    max_attempts: int
    counts_for_leaderboard: bool
    persisted: bool
    test_id: int
    test_title: str
    score: int | float
    total_marks: int | float
    percentage: int | float
    correct: int
    incorrect: int
    skipped: int
    submitted_at: LegacyDatetime | None
    tab_violations: int
    rank: int | None
    total_participants: int
    topper: ResultTopperResponse | None
    answers: list[ResultAnswerResponse]


class AttemptAnswerResponse(BaseModel):
    question_id: int
    selected_answer: str | None
    time_spent_seconds: int


class AttemptStartResponse(BaseModel):
    id: int
    test_id: int
    status: TestStatus
    started_at: LegacyDatetime | None
    submitted_at: LegacyDatetime | None
    score: int | float | None
    total_marks: int | float | None
    tab_violations: int
    fullscreen_violations: int
    server_time: LegacyDatetime
    answers: list[AttemptAnswerResponse]
    attempt_number: int
    max_attempts: int


class TestQuestionResponse(BaseModel):
    id: int
    question_type: QuestionType
    question_text: str
    question_image_url: str | None
    options: list[Any] | dict[str, Any]
    option_images: dict[str, Any] | None
    order_index: int
    marks: int | float
    negative_marks: int | float
    subject: str | None
    topic: str | None


class MessageResponse(BaseModel):
    message: str


class PersistedSubmitResponse(BaseModel):
    id: int
    test_id: int
    status: TestStatus
    started_at: LegacyDatetime | None
    submitted_at: LegacyDatetime | None
    score: int | float | None
    total_marks: int | float | None
    tab_violations: int
    fullscreen_violations: int
    persisted: Literal[True]


class PracticeResultResponse(BaseModel):
    attempt_id: str
    client_result_id: str | None
    attempt_number: int
    attempts_remaining: int
    max_attempts: int
    counts_for_leaderboard: bool
    persisted: Literal[False]
    test_id: int
    test_title: str
    score: int | float
    total_marks: int | float
    percentage: int | float
    correct: int
    incorrect: int
    skipped: int
    submitted_at: LegacyDatetime | None
    tab_violations: int
    rank: int | None
    total_participants: int
    topper: ResultTopperResponse | None
    answers: list[ResultAnswerResponse]


class PracticeSubmitResponse(BaseModel):
    id: str
    persisted: Literal[False]
    result: PracticeResultResponse


SubmitResponse = Annotated[
    PersistedSubmitResponse | PracticeSubmitResponse,
    Field(discriminator="persisted"),
]


class AnswerSubmit(BaseModel):
    question_id: int
    selected_answer: Optional[str] = None
    time_spent_seconds: int = Field(default=0, ge=0)


class BulkAnswerSubmit(BaseModel):
    answers: List[AnswerSubmit]


class ViolationUpdate(BaseModel):
    tab_violations: Optional[int] = Field(default=None, ge=0)
    fullscreen_violations: Optional[int] = Field(default=None, ge=0)
