import math
import pytest
from enum import Enum

from app.services.answer_utils import (
    normalize_question_type,
    parse_float,
    parse_nat_range,
    split_answer_tokens,
    is_valid_nat_answer,
    normalize_choice_answer,
    validate_msq_answer,
    validate_mcq_answer,
    validate_nat_answer,
    validate_answer_for_type,
)

class DummyEnum(Enum):
    MCQ = "MCQ"
    NAT = "QuestionType.NAT"

def test_normalize_question_type():
    assert normalize_question_type(" MCQ ") == "mcq"
    assert normalize_question_type("NAT") == "nat"
    assert normalize_question_type("QuestionType.MSQ") == "msq"
    assert normalize_question_type(DummyEnum.MCQ) == "mcq"
    assert normalize_question_type(DummyEnum.NAT) == "nat"
    assert normalize_question_type(None) == ""
    assert normalize_question_type("") == ""

def test_parse_float():
    assert parse_float("1.23") == 1.23
    assert parse_float("-0.5") == -0.5
    assert parse_float("1e-5") == 1e-5
    assert parse_float(42) == 42.0
    
    # Invalid strings
    assert parse_float("abc") is None
    assert parse_float("1.2.3") is None
    assert parse_float("") is None
    assert parse_float(None) is None
    
    # Non-finite values
    assert parse_float(float("inf")) is None
    assert parse_float(float("-inf")) is None
    assert parse_float(float("nan")) is None

def test_parse_nat_range():
    assert parse_nat_range("1-2") == (1.0, 2.0)
    assert parse_nat_range("1.5 : 2.5") == (1.5, 2.5)
    assert parse_nat_range("  10  to  20  ") == (10.0, 20.0)
    assert parse_nat_range("-2--1") == (-2.0, -1.0)
    assert parse_nat_range("-5 : -3.5") == (-5.0, -3.5)
    
    # Invalid ranges (lo > hi)
    assert parse_nat_range("2-1") is None
    assert parse_nat_range("5 to 3") is None
    
    # Invalid formats
    assert parse_nat_range("1-2-3") is None
    assert parse_nat_range("abc-def") is None
    assert parse_nat_range("1") is None
    assert parse_nat_range(None) is None

def test_split_answer_tokens():
    assert split_answer_tokens("A, B, C") == ["A", "B", "C"]
    assert split_answer_tokens("A ; B / C") == ["A", "B", "C"]
    assert split_answer_tokens("  word1 , word2  ") == ["word1", "word2"]
    assert split_answer_tokens("A") == ["A"]
    assert split_answer_tokens("") == []
    assert split_answer_tokens("   ") == []
    assert split_answer_tokens(None) == []
    assert split_answer_tokens(",;/") == []

def test_is_valid_nat_answer():
    assert is_valid_nat_answer("1.5") is True
    assert is_valid_nat_answer("1.5:2.5") is True
    assert is_valid_nat_answer("-10 to -5") is True
    assert is_valid_nat_answer("1.5, 2.5:3.5, 4") is True
    
    assert is_valid_nat_answer("abc") is False
    assert is_valid_nat_answer("1.5, abc") is False
    assert is_valid_nat_answer("") is False
    assert is_valid_nat_answer(None) is False
    assert is_valid_nat_answer("2-1") is False # Invalid range (lo > hi)
    assert is_valid_nat_answer("1.5-2.5-3.5") is False

def test_normalize_choice_answer():
    assert normalize_choice_answer("a, b, c") == "A,B,C"
    assert normalize_choice_answer(" a ; B /  c ") == "A,B,C"
    assert normalize_choice_answer("option1") == "OPTION1"
    assert normalize_choice_answer("  ") == ""
    assert normalize_choice_answer(None) == ""

from app.models.models import Question
from app.services.scoring import evaluate_answer

def test_nat_colon_range_scores_boundary_values():
    question = Question(
        question_type="nat",
        question_text="Probability",
        options=[],
        correct_answer="0.44:0.45",
        marks=2.0,
        negative_marks=0.0,
    )

    for selected in ("0.44", "0.445", "0.45"):
        assert evaluate_answer(question, selected) == (True, 2.0)

    assert evaluate_answer(question, "0.46") == (False, 0.0)

def test_nat_hyphen_negative_range_still_works():
    assert parse_nat_range("-2--1") == (-2.0, -1.0)
    assert is_valid_nat_answer("-2--1") is True

def test_validate_mcq_answer():
    assert validate_mcq_answer("A") == "A"
    assert validate_mcq_answer("C") == "C"

    with pytest.raises(ValueError, match="MCQ correct_answer must be one of A, B, C, or D"):
        validate_mcq_answer("E")
    
    with pytest.raises(ValueError, match="MCQ correct_answer must be one of A, B, C, or D"):
        validate_mcq_answer("A,B")

def test_validate_msq_answer():
    # Happy paths
    assert validate_msq_answer("A, B") == ("A,B", 0.0)
    assert validate_msq_answer(" a ; C / d ") == ("A,C,D", 0.0)
    assert validate_msq_answer("A") == ("A", 0.0)
    
    # Duplicates are removed (order preserved)
    assert validate_msq_answer("A, B, A, C, b") == ("A,B,C", 0.0)
    
    # Error cases
    with pytest.raises(ValueError, match="MSQ correct_answer must contain option letters like A,C"):
        validate_msq_answer("")
        
    with pytest.raises(ValueError, match="MSQ correct_answer must contain option letters like A,C"):
        validate_msq_answer("A, E")
        
    with pytest.raises(ValueError, match="MSQ correct_answer must contain option letters like A,C"):
        validate_msq_answer("1, 2")
def test_validate_nat_answer():
    assert validate_nat_answer("1.5:2.5") == 0.0
    assert validate_nat_answer("42") == 0.0

    with pytest.raises(ValueError, match="NAT correct_answer must be a number or range like 41.5-42.5 or 41.5:42.5"):
        validate_nat_answer("abc")

def test_validate_answer_for_type():
    # MCQ
    ans, neg, clear = validate_answer_for_type("mcq", "B")
    assert ans == "B"
    assert neg is None
    assert clear is False

    # MSQ
    ans, neg, clear = validate_answer_for_type("msq", "A, C")
    assert ans == "A,C"
    assert neg == 0.0
    assert clear is False

    # NAT
    ans, neg, clear = validate_answer_for_type("nat", "1.5:2.5")
    assert ans == "1.5:2.5"
    assert neg == 0.0
    assert clear is True
