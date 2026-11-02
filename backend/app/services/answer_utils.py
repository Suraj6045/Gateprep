import math
import re
from typing import Any, Optional

_NUMBER = r"[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?"
_NAT_RANGE_RE = re.compile(
    rf"^\s*({_NUMBER})\s*(?:-|:|to)\s*({_NUMBER})\s*$", re.IGNORECASE
)
_ANSWER_SPLIT_RE = re.compile(r"\s*[,;/]\s*")


def normalize_question_type(question_type: Any) -> str:
    raw = getattr(question_type, "value", question_type)
    value = str(raw or "").strip().lower()
    if "." in value:
        value = value.rsplit(".", 1)[-1]
    return value


def parse_float(value: Any) -> Optional[float]:
    try:
        parsed = float(str(value).strip())
    except (TypeError, ValueError):
        return None
    return parsed if math.isfinite(parsed) else None


def parse_nat_range(value: Any) -> Optional[tuple[float, float]]:
    text = str(value or "").strip().replace(" ", "")
    match = _NAT_RANGE_RE.match(text)
    if not match:
        return None

    lo = parse_float(match.group(1))
    hi = parse_float(match.group(2))
    if lo is None or hi is None or lo > hi:
        return None
    return lo, hi


def split_answer_tokens(value: Any) -> list[str]:
    text = str(value or "").strip()
    return [part.strip() for part in _ANSWER_SPLIT_RE.split(text) if part.strip()]


def is_valid_nat_answer(value: Any) -> bool:
    tokens = split_answer_tokens(value)
    if not tokens:
        return False
    return all(
        parse_float(token.replace(" ", "")) is not None
        or parse_nat_range(token.replace(" ", "")) is not None
        for token in tokens
    )


def normalize_choice_answer(value: Any) -> str:
    return ",".join(token.strip().upper() for token in split_answer_tokens(value))

def validate_mcq_answer(answer: str) -> str:
    """Validate and return a normalised MCQ answer."""
    if answer not in {"A", "B", "C", "D"}:
        raise ValueError("MCQ correct_answer must be one of A, B, C, or D")
    return answer


def validate_msq_answer(answer: str) -> tuple[str, float]:
    """Validate an MSQ answer and return (normalised_answer, negative_marks)."""
    selected = [part.strip().upper() for part in split_answer_tokens(answer)]
    if not selected or any(part not in {"A", "B", "C", "D"} for part in selected):
        raise ValueError("MSQ correct_answer must contain option letters like A,C")
    return ",".join(dict.fromkeys(selected)), 0.0


def validate_nat_answer(answer: str) -> float:
    """Validate a NAT answer and return the forced negative_marks value."""
    if not is_valid_nat_answer(answer):
        raise ValueError(
            "NAT correct_answer must be a number or range like 41.5-42.5 or 41.5:42.5"
        )
    return 0.0


def validate_answer_for_type(
    q_type: str, correct_answer: str
) -> tuple[str, float | None, bool]:
    """Validate correct_answer against q_type.

    Returns (normalised_answer, override_negative_marks_or_None, clear_options).
    """
    if q_type == "mcq":
        return validate_mcq_answer(correct_answer), None, False
    if q_type == "msq":
        answer, neg = validate_msq_answer(correct_answer)
        return answer, neg, False
    # nat
    neg = validate_nat_answer(correct_answer)
    return correct_answer, neg, True
