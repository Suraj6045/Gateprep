from typing import List, Optional

from pydantic import BaseModel


class AnswerSubmit(BaseModel):
    question_id: int
    selected_answer: Optional[str] = None
    time_spent_seconds: int = 0


class BulkAnswerSubmit(BaseModel):
    answers: List[AnswerSubmit]


class ViolationUpdate(BaseModel):
    tab_violations: Optional[int] = None
    fullscreen_violations: Optional[int] = None
