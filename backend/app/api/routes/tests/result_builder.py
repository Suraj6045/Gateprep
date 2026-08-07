from datetime import datetime
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.models import Question, Test, UserAnswer
from app.services.cloudinary_service import (
    optimize_delivery_image_url,
    optimize_delivery_image_urls,
)
from app.services.scoring import evaluate_answer
from app.api.routes.tests.helpers import (
    MAX_REATTEMPTS,
    _get_first_attempts,
    _percentage,
)
from app.api.routes.tests.schemas import AnswerSubmit


def _base_answer_detail(
    q: Question, selected_answer, is_correct, marks_awarded, time_spent_seconds
):
    return {
        "question_id": q.id,
        "question_text": q.question_text,
        "question_type": q.question_type,
        "question_image_url": optimize_delivery_image_url(q.question_image_url),
        "options": q.options,
        "option_images": optimize_delivery_image_urls(q.option_images),
        "correct_answer": q.correct_answer,
        "selected_answer": selected_answer,
        "is_correct": is_correct,
        "marks_awarded": marks_awarded,
        "marks": q.marks,
        "negative_marks": q.negative_marks,
        "time_spent_seconds": time_spent_seconds,
        "topper_answer": None,
        "topper_time_seconds": 0,
    }


def _evaluate_submission(test: Test, answers: List[AnswerSubmit]):
    submitted_by_question = {ans.question_id: ans for ans in answers}
    earned = 0.0
    details = []

    # Test.questions relationship declares order_by="Question.order_index",
    # so the lazy-load already returns questions sorted by order_index.
    for q in test.questions:
        submitted = submitted_by_question.get(q.id)
        selected = submitted.selected_answer if submitted else None
        if selected is not None and selected.strip() == "":
            selected = None
        is_correct, marks = evaluate_answer(q, selected)
        earned += marks
        details.append(
            _base_answer_detail(
                q,
                selected,
                is_correct,
                marks,
                submitted.time_spent_seconds if submitted else 0,
            )
        )

    total_marks = sum(q.marks for q in test.questions)
    return max(0.0, round(earned, 2)), total_marks, details


def _attempt_answer_details(test: Test, answers: list[UserAnswer]):
    answers_map = {a.question_id: a for a in answers}
    details = []
    for q in sorted(test.questions, key=lambda x: x.order_index):
        ua = answers_map.get(q.id)
        details.append(
            _base_answer_detail(
                q,
                ua.selected_answer if ua else None,
                ua.is_correct if ua else None,
                ua.marks_awarded if ua else 0,
                ua.time_spent_seconds if ua else 0,
            )
        )
    return details


def _result_payload(
    *,
    attempt_id,
    attempt_number: int,
    attempts_remaining: int,
    counts_for_leaderboard: bool,
    persisted: bool,
    test: Test,
    score: float,
    total_marks: float,
    submitted_at: Optional[datetime],
    tab_violations: int,
    answer_details: list[dict],
    current_user,
    db: Session,
    client_result_id: Optional[str] = None,
) -> dict:
    first_attempts = _get_first_attempts(test.id, db)

    topper = first_attempts[0] if first_attempts else None
    topper_data = None
    topper_answers_map = {}
    if topper:
        topper_answers_map = {ua.question_id: ua for ua in topper.answers}
        topper_data = {
            "user_id": topper.user_id,
            "full_name": topper.user.full_name,
            "score": topper.score,
            "total_marks": topper.total_marks,
            "percentage": _percentage(topper.score, topper.total_marks),
        }

    correct = 0
    incorrect = 0
    skipped = 0
    for detail in answer_details:
        topper_ua = topper_answers_map.get(detail["question_id"])
        detail["topper_answer"] = topper_ua.selected_answer if topper_ua else None
        detail["topper_time_seconds"] = topper_ua.time_spent_seconds if topper_ua else 0
        if detail["is_correct"] is True:
            correct += 1
        elif detail["is_correct"] is False:
            incorrect += 1
        else:
            skipped += 1
    rank = next(
        (i + 1 for i, a in enumerate(first_attempts) if a.user_id == current_user.id),
        None,
    )

    return {
        "attempt_id": attempt_id,
        "client_result_id": client_result_id,
        "attempt_number": attempt_number,
        "attempts_remaining": attempts_remaining,
        "max_attempts": MAX_REATTEMPTS + 1,
        "counts_for_leaderboard": counts_for_leaderboard,
        "persisted": persisted,
        "test_id": test.id,
        "test_title": test.title,
        "score": score,
        "total_marks": total_marks,
        "percentage": _percentage(score, total_marks),
        "correct": correct,
        "incorrect": incorrect,
        "skipped": skipped,
        "submitted_at": submitted_at,
        "tab_violations": tab_violations,
        "rank": rank,
        "total_participants": len(first_attempts),
        "topper": topper_data,
        "answers": answer_details,
    }
