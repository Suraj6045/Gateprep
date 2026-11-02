import pytest
from app.models.models import Question
from app.services.scoring import evaluate_answer

def make_question(q_type, correct, marks=2.0, negative_marks=0.66) -> Question:
    return Question(
        question_type=q_type,
        correct_answer=correct,
        marks=marks,
        negative_marks=negative_marks,
        question_text="Test",
    )

def test_evaluate_answer_skipped():
    q = make_question("mcq", "A")
    # Skipped answer should return None for is_correct, and 0.0 marks
    assert evaluate_answer(q, None) == (None, 0.0)
    assert evaluate_answer(q, "") == (None, 0.0)
    assert evaluate_answer(q, "   ") == (None, 0.0)

def test_evaluate_answer_mcq():
    q = make_question("mcq", "A", marks=2.0, negative_marks=0.66)
    
    # Correct
    assert evaluate_answer(q, "A") == (True, 2.0)
    # Case insensitivity
    assert evaluate_answer(q, "a") == (True, 2.0)
    
    # Incorrect
    assert evaluate_answer(q, "B") == (False, -0.66)
    assert evaluate_answer(q, "C") == (False, -0.66)

def test_evaluate_answer_msq():
    # MSQ gives marks only for fully correct, no negative marking.
    q = make_question("msq", "A,B", marks=2.0, negative_marks=0.0)
    
    # Exact match
    assert evaluate_answer(q, "A,B") == (True, 2.0)
    
    # Order independence & case insensitivity & spacing
    assert evaluate_answer(q, "b, a") == (True, 2.0)
    assert evaluate_answer(q, "B; A") == (True, 2.0)
    
    # Partial correct
    assert evaluate_answer(q, "A") == (False, 0.0)
    
    # Extra wrong option
    assert evaluate_answer(q, "A,B,C") == (False, 0.0)
    
    # Completely wrong
    assert evaluate_answer(q, "C,D") == (False, 0.0)

def test_evaluate_answer_nat_range():
    # NAT gives marks only for correct, no negative marking.
    q = make_question("nat", "10.5:11.5", marks=2.0, negative_marks=0.0)
    
    # Within range
    assert evaluate_answer(q, "11.0") == (True, 2.0)
    
    # Exact boundaries
    assert evaluate_answer(q, "10.5") == (True, 2.0)
    assert evaluate_answer(q, "11.5") == (True, 2.0)
    
    # Outside range
    assert evaluate_answer(q, "10.49") == (False, 0.0)
    assert evaluate_answer(q, "11.51") == (False, 0.0)
    
    # Invalid given format
    assert evaluate_answer(q, "abc") == (False, 0.0)

def test_evaluate_answer_nat_exact():
    q = make_question("nat", "42.5", marks=1.0, negative_marks=0.0)

    # Decimal answers accept the inclusive one-mark range.
    assert evaluate_answer(q, "42.5") == (True, 1.0)
    assert evaluate_answer(q, "42.50") == (True, 1.0)
    assert evaluate_answer(q, "43.5") == (True, 1.0)

    # Values outside the range are rejected.
    assert evaluate_answer(q, "43.51") == (False, 0.0)


def test_evaluate_answer_nat_integer_requires_exact_match():
    q = make_question("nat", "10", marks=1.0, negative_marks=0.0)

    assert evaluate_answer(q, "10") == (True, 1.0)
    assert evaluate_answer(q, "10.00") == (True, 1.0)
    assert evaluate_answer(q, "10.01") == (False, 0.0)


def test_evaluate_answer_nat_accepts_at_most_two_decimal_places():
    q = make_question("nat", "43.6", marks=1.0, negative_marks=0.0)

    assert evaluate_answer(q, "43.60") == (True, 1.0)
    assert evaluate_answer(q, "44.60") == (True, 1.0)
    assert evaluate_answer(q, "44.601") == (False, 0.0)


def test_evaluate_answer_nat_small_exact_value_does_not_use_fixed_tolerance():
    q = make_question("nat", "0.01", marks=1.0, negative_marks=0.0)

    assert evaluate_answer(q, "0") == (False, 0.0)
    assert evaluate_answer(q, "0.01") == (True, 1.0)
    assert evaluate_answer(q, "0.02") == (True, 1.0)
    assert evaluate_answer(q, "1.02") == (False, 0.0)


def test_evaluate_answer_nat_explicit_range_remains_inclusive():
    q = make_question("nat", "43.6:44.6", marks=1.0, negative_marks=0.0)

    assert evaluate_answer(q, "43.6") == (True, 1.0)
    assert evaluate_answer(q, "44.6") == (True, 1.0)
    assert evaluate_answer(q, "43.59") == (False, 0.0)


def test_evaluate_answer_nat_multiple_options():
    # NAT with multiple correct ranges/options separated by comma
    q = make_question("nat", "1.0:2.0, 4.0:5.0", marks=2.0, negative_marks=0.0)
    
    # In first range
    assert evaluate_answer(q, "1.5") == (True, 2.0)
    # In second range
    assert evaluate_answer(q, "4.5") == (True, 2.0)
    # Outside both
    assert evaluate_answer(q, "3.0") == (False, 0.0)

def test_evaluate_answer_invalid_question_type():
    q = make_question("unknown_type", "A")
    
    # Should safely return False, 0.0
    assert evaluate_answer(q, "A") == (False, 0.0)


def test_evaluate_answer_does_not_reward_negative_penalty():
    q = make_question("mcq", "A", marks=1.0, negative_marks=-1.0)

    assert evaluate_answer(q, "B") == (False, 0.0)
