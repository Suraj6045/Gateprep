import json
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.routes.tests.schemas import (
    HistoryResponse,
    LeaderboardResponse,
    MyAttemptResponse,
    PersistedResultResponse,
    CatalogResponse,
    DetailResponse,
    AttemptAnswerResponse,
    AttemptStartResponse,
    MessageResponse,
    PersistedSubmitResponse,
    PracticeResultResponse,
    PracticeSubmitResponse,
    TestQuestionResponse as AttemptQuestionResponse,
)
from app.models.models import QuestionType, TestStatus


UTC = timezone.utc
aware = datetime(2024, 1, 2, 3, 4, 5, 6000, tzinfo=UTC)
naive = datetime(2024, 1, 2, 3, 4, 5, 7000)


def _payloads() -> list[tuple[type, object]]:
    answer_list = {
        "question_id": 1,
        "question_text": "Question",
        "question_type": QuestionType.mcq,
        "question_image_url": None,
        "options": ["A", 2],
        "option_images": {"A": 1, "B": None},
        "correct_answer": "A",
        "selected_answer": None,
        "is_correct": None,
        "marks_awarded": 1,
        "marks": 1,
        "negative_marks": 0,
        "time_spent_seconds": 0,
        "topper_answer": None,
        "topper_time_seconds": 0,
    }
    answer_dict = {**answer_list, "question_id": 2, "options": {"A": 1, "B": False}}
    return [
        (
            CatalogResponse,
            {
                "id": 1,
                "title": "Catalog",
                "description": None,
                "duration_minutes": 180,
                "total_marks": 2,
                "question_count": 0,
                "series_id": None,
                "created_at": aware,
                "category": None,
                "series_name": None,
                "test_type": None,
                "subject": None,
            },
        ),
        (
            DetailResponse,
            {
                "id": 1,
                "title": "Detail",
                "description": None,
                "duration_minutes": 180,
                "total_marks": 2,
                "question_count": 0,
                "series_id": None,
                "created_at": naive,
                "test_type": None,
            },
        ),
        (
            HistoryResponse,
            {
                "id": 1,
                "test_id": 1,
                "status": TestStatus.submitted,
                "started_at": aware,
                "submitted_at": None,
                "score": 1,
                "total_marks": 2,
                "tab_violations": 0,
                "fullscreen_violations": 0,
            },
        ),
        (
            MyAttemptResponse,
            {
                "attempt_id": 1,
                "attempt_number": 1,
                "counts_for_leaderboard": True,
                "is_first": True,
                "status": TestStatus.submitted,
                "score": None,
                "total_marks": 2,
                "percentage": 0,
                "started_at": naive,
                "submitted_at": None,
                "attempts_remaining": 5,
            },
        ),
        (
            LeaderboardResponse,
            {
                "test_id": 1,
                "test_title": "Leaderboard",
                "total_participants": 1,
                "current_user_rank": None,
                "limit": 50,
                "offset": 0,
                "leaderboard": [
                    {
                        "rank": 1,
                        "user_id": 1,
                        "full_name": "Student",
                        "score": 1,
                        "total_marks": 2,
                        "percentage": 50,
                        "submitted_at": aware,
                        "tab_violations": 0,
                        "is_current_user": True,
                    }
                ],
            },
        ),
        (
            PersistedResultResponse,
            {
                "attempt_id": 1,
                "client_result_id": None,
                "attempt_number": 1,
                "attempts_remaining": 5,
                "max_attempts": 6,
                "counts_for_leaderboard": True,
                "persisted": True,
                "test_id": 1,
                "test_title": "Result",
                "score": 1,
                "total_marks": 2,
                "percentage": 50,
                "correct": 1,
                "incorrect": 0,
                "skipped": 1,
                "submitted_at": naive,
                "tab_violations": 0,
                "rank": None,
                "total_participants": 0,
                "topper": None,
                "answers": [answer_list, answer_dict],
            },
        ),
        (
            AttemptAnswerResponse,
            {
                "question_id": 1,
                "selected_answer": None,
                "time_spent_seconds": 0,
            },
        ),
        (
            AttemptStartResponse,
            {
                "id": 1,
                "test_id": 1,
                "status": TestStatus.in_progress,
                "started_at": aware,
                "submitted_at": None,
                "score": None,
                "total_marks": None,
                "tab_violations": 0,
                "fullscreen_violations": 0,
                "server_time": naive,
                "answers": [],
                "attempt_number": 1,
                "max_attempts": 6,
            },
        ),
        (
            AttemptQuestionResponse,
            {
                "id": 1,
                "question_type": QuestionType.msq,
                "question_text": "Question",
                "question_image_url": None,
                "options": {"A": 1, "B": False},
                "option_images": {"A": 1},
                "order_index": 0,
                "marks": 1,
                "negative_marks": 0,
                "subject": None,
                "topic": None,
            },
        ),
        (MessageResponse, {"message": "Saved"}),
        (
            PersistedSubmitResponse,
            {
                "id": 1,
                "test_id": 1,
                "status": TestStatus.submitted,
                "started_at": naive,
                "submitted_at": aware,
                "score": 1,
                "total_marks": 2,
                "tab_violations": 0,
                "fullscreen_violations": 0,
                "persisted": True,
            },
        ),
        (
            PracticeResultResponse,
            {
                "attempt_id": "practice-1",
                "client_result_id": "practice-1",
                "attempt_number": 2,
                "attempts_remaining": 4,
                "max_attempts": 6,
                "counts_for_leaderboard": False,
                "persisted": False,
                "test_id": 1,
                "test_title": "Practice",
                "score": 1,
                "total_marks": 2,
                "percentage": 50,
                "correct": 1,
                "incorrect": 0,
                "skipped": 1,
                "submitted_at": aware,
                "tab_violations": 0,
                "rank": None,
                "total_participants": 1,
                "topper": None,
                "answers": [answer_list],
            },
        ),
        (
            PracticeSubmitResponse,
            {
                "id": "practice-1",
                "persisted": False,
                "result": {
                    "attempt_id": "practice-1",
                    "client_result_id": "practice-1",
                    "attempt_number": 2,
                    "attempts_remaining": 4,
                    "max_attempts": 6,
                    "counts_for_leaderboard": False,
                    "persisted": False,
                    "test_id": 1,
                    "test_title": "Practice",
                    "score": 1,
                    "total_marks": 2,
                    "percentage": 50,
                    "correct": 1,
                    "incorrect": 0,
                    "skipped": 1,
                    "submitted_at": aware,
                    "tab_violations": 0,
                    "rank": None,
                    "total_participants": 1,
                    "topper": None,
                    "answers": [answer_list],
                },
            },
        ),
    ]


def test_response_models_preserve_legacy_json_serialization():
    app = FastAPI()

    for index, (model, payload) in enumerate(_payloads()):
        app.add_api_route(
            f"/without/{index}",
            lambda payload=payload: payload,
            methods=["GET"],
        )
        app.add_api_route(
            f"/with/{index}",
            lambda payload=payload: payload,
            methods=["GET"],
            response_model=model,
        )

    client = TestClient(app)
    for index, (_, _) in enumerate(_payloads()):
        without = client.get(f"/without/{index}")
        with_model = client.get(f"/with/{index}")
        assert without.status_code == with_model.status_code == 200
        assert json.dumps(without.json(), sort_keys=True) == json.dumps(
            with_model.json(), sort_keys=True
        )
