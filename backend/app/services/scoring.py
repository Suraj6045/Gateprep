"""
Scoring Engine
==============
MCQ:  +marks if correct, -negative_marks if wrong, 0 if skipped
MSQ:  +marks only if ALL correct options selected exactly, 0 otherwise (no negative)
NAT:  +marks if answer in range (or exact match), 0 otherwise (no negative)
"""
from typing import Optional
from app.models.models import Question, QuestionType


def evaluate_answer(question: Question, selected: Optional[str]) -> tuple[bool | None, float]:
    """
    Returns (is_correct, marks_awarded).
    is_correct: True / False / None (skipped)
    """
    if selected is None or selected.strip() == "":
        return None, 0.0  # skipped

    q_type = question.question_type
    correct = question.correct_answer.strip().upper()
    given = selected.strip().upper()

    if q_type == QuestionType.mcq:
        is_correct = given == correct
        marks = question.marks if is_correct else -question.negative_marks
        return is_correct, round(marks, 2)

    elif q_type == QuestionType.msq:
        correct_set = set(c.strip() for c in correct.split(","))
        given_set = set(c.strip() for c in given.split(","))
        is_correct = correct_set == given_set
        marks = question.marks if is_correct else 0.0  # no negative for MSQ
        return is_correct, round(marks, 2)

    elif q_type == QuestionType.nat:
        # Correct answer can be exact "42" or range "41.5-42.5"
        try:
            given_val = float(given)
        except ValueError:
            return False, 0.0

        if "-" in correct and not correct.startswith("-"):
            # Range answer
            parts = correct.split("-")
            lo, hi = float(parts[0]), float(parts[1])
            is_correct = lo <= given_val <= hi
        else:
            # Exact (allow ±0.01 tolerance for floating point)
            expected = float(correct)
            is_correct = abs(given_val - expected) <= 0.01

        marks = question.marks if is_correct else 0.0
        return is_correct, round(marks, 2)

    return None, 0.0
