"""
Scoring Engine
==============
MCQ:  +marks if correct, -negative_marks if wrong, 0 if skipped
MSQ:  +marks only if ALL correct options selected exactly, 0 otherwise (no negative)
NAT:  +marks if answer in range (or exact match), 0 otherwise (no negative)
"""

from typing import Optional

from app.models.models import Question
from app.services.answer_utils import (normalize_question_type, parse_float,
                                       parse_nat_range, split_answer_tokens)


def _rounded_score(
    is_correct: bool, marks: float, negative_marks: float = 0.0
) -> tuple[bool, float]:
    score = marks if is_correct else -negative_marks
    return is_correct, round(score, 2)


def _score_mcq(
    correct: str, given: str, marks: float, negative_marks: float
) -> tuple[bool, float]:
    return _rounded_score(given == correct, marks, negative_marks)


def _score_msq(correct: str, given: str, marks: float) -> tuple[bool, float]:
    correct_set = {token.upper() for token in split_answer_tokens(correct)}
    given_set = {token.upper() for token in split_answer_tokens(given)}
    return _rounded_score(correct_set == given_set, marks)


def _nat_token_matches(given_value: float, accepted: str) -> bool:
    bounds = parse_nat_range(accepted)
    if bounds:
        lo, hi = bounds
        return lo <= given_value <= hi

    expected = parse_float(accepted)
    return expected is not None and abs(given_value - expected) <= 0.01


def _score_nat(correct: str, given: str, marks: float) -> tuple[bool, float]:
    given_value = parse_float(given)
    if given_value is None:
        return False, 0.0

    is_correct = any(
        _nat_token_matches(given_value, accepted)
        for accepted in split_answer_tokens(correct)
    )
    return _rounded_score(is_correct, marks)


def evaluate_answer(
    question: Question, selected: Optional[str]
) -> tuple[bool | None, float]:
    """
    Returns (is_correct, marks_awarded).
    is_correct: True / False / None (skipped)
    """
    if selected is None or selected.strip() == "":
        return None, 0.0  # skipped

    q_type = normalize_question_type(question.question_type)
    correct = question.correct_answer.strip().upper()
    given = selected.strip().upper()
    question_marks = parse_float(question.marks) or 0.0
    negative_marks = parse_float(question.negative_marks) or 0.0

    if q_type == "mcq":
        return _score_mcq(correct, given, question_marks, negative_marks)

    if q_type == "msq":
        return _score_msq(correct, given, question_marks)

    if q_type == "nat":
        return _score_nat(correct, given, question_marks)

    return False, 0.0
