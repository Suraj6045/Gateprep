import json
from typing import Any, List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from pydantic import ValidationError
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.core.database import get_db
from app.models.models import Question, QuestionType, Test
from app.services.cloudinary_service import delete_image, upload_image
from .helpers import _question_out, read_upload_bytes
from .schemas import QuestionFileImport, QuestionIn, QuestionsBulk

router = APIRouter()

def _questions_from_json_root(data: Any) -> list[Any]:
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        questions = data.get("questions")
        if isinstance(questions, list):
            return questions
        raise HTTPException(
            status_code=400,
            detail='JSON object must contain a "questions" key with a list value',
        )
    raise HTTPException(
        status_code=400,
        detail='JSON root must be a questions array or an object containing a "questions" array',
    )

def _format_question_validation_errors(
    question_index: int, exc: ValidationError
) -> list[dict]:
    errors = []
    for error in exc.errors():
        loc = ".".join(str(part) for part in error.get("loc", ())) or "question"
        errors.append(
            {
                "question_index": question_index,
                "field": loc,
                "message": error.get("msg", "Invalid value"),
            }
        )
    return errors

def _get_existing_question_count(db: Session, test_id: int) -> int:
    """Return the number of questions already associated with a test."""
    return (
        db.query(func.count(Question.id)).filter(Question.test_id == test_id).scalar()
        or 0
    )

def _insert_questions(
    db: Session, test_id: int, questions: List[QuestionIn], start_index: int
) -> float:
    """Create Question rows and return the total marks added."""
    total_marks = 0.0
    for idx, q in enumerate(questions):
        db.add(
            Question(
                test_id=test_id,
                question_type=QuestionType(q.question_type),
                question_text=q.question_text,
                options=q.options,
                correct_answer=q.correct_answer,
                marks=q.marks,
                negative_marks=q.negative_marks,
                subject=q.subject,
                topic=q.topic,
                order_index=start_index + idx,
            )
        )
        total_marks += q.marks
    return total_marks

def _apply_question_payload(question: Question, payload: QuestionIn) -> None:
    """Apply payload fields onto an existing Question, including NAT cleanup."""
    question.question_type = QuestionType(payload.question_type)
    question.question_text = payload.question_text
    question.options = payload.options
    question.correct_answer = payload.correct_answer
    question.marks = payload.marks
    question.negative_marks = payload.negative_marks
    question.subject = payload.subject
    question.topic = payload.topic
    if question.question_type == QuestionType.nat:
        question.option_images = None

def _recalculate_test_marks(test: Test, old_marks: float, new_marks: float) -> None:
    """Adjust the test's total_marks after a question's marks change."""
    test.total_marks = (test.total_marks or 0.0) - old_marks + new_marks



def _parse_json_bytes(contents: bytes) -> list:
    """Decode bytes to UTF-8, parse JSON, and extract the questions array."""
    try:
        decoded = contents.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="JSON file must be UTF-8 encoded")

    try:
        raw_data = json.loads(decoded)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid JSON syntax at line {exc.lineno}, column {exc.colno}: {exc.msg}",
        )

    raw_questions = _questions_from_json_root(raw_data)
    if not raw_questions:
        raise HTTPException(
            status_code=400, detail="JSON file does not contain any questions"
        )

    return raw_questions

def _validate_raw_questions(raw_questions: list) -> list[QuestionFileImport]:
    """Validate each raw question dict and return parsed models, or raise on errors."""
    validated: list[QuestionFileImport] = []
    errors: list[dict] = []
    for idx, raw_question in enumerate(raw_questions, start=1):
        if not isinstance(raw_question, dict):
            errors.append(
                {
                    "question_index": idx,
                    "field": "question",
                    "message": "Each question must be a JSON object",
                }
            )
            continue
        try:
            validated.append(QuestionFileImport.model_validate(raw_question))
        except ValidationError as exc:
            errors.extend(_format_question_validation_errors(idx, exc))

    if errors:
        raise HTTPException(
            status_code=422,
            detail={
                "message": f"Validation failed for {len(errors)} field(s)",
                "errors": errors,
            },
        )

    return validated

def _persist_imported_questions(
    db: Session, test: Test, questions: list[QuestionFileImport]
) -> tuple[int, int]:
    """Bulk-insert validated questions into a test. Returns (imported_count, new_total)."""
    existing = _get_existing_question_count(db, test.id)
    new_rows = []
    total_marks = 0.0
    for question in questions:
        new_rows.append(
            Question(
                test_id=test.id,
                question_type=question.question_type,
                question_text=question.question_text,
                options=question.options,
                correct_answer=question.correct_answer,
                marks=question.marks,
                negative_marks=question.negative_marks,
                order_index=question.order_index,
                subject=question.subject,
                topic=question.topic,
            )
        )
        total_marks += question.marks

    db.add_all(new_rows)
    test.total_marks = (test.total_marks or 0.0) + total_marks
    db.commit()

    return len(questions), existing + len(questions)


@router.get("/tests/{test_id}/questions")
def get_questions(
    test_id: int, db: Session = Depends(get_db), _=Depends(require_admin)
):
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Not found")
    # Test.questions relationship declares order_by="Question.order_index",
    # so the lazy-load already returns questions sorted by order_index.
    return [_question_out(q) for q in test.questions]

@router.post("/tests/{test_id}/questions", status_code=201)
def add_questions(
    test_id: int,
    payload: QuestionsBulk,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Not found")

    existing = _get_existing_question_count(db, test_id)
    total_added = _insert_questions(db, test_id, payload.questions, existing)

    test.total_marks = (test.total_marks or 0.0) + total_added
    db.commit()
    return {
        "message": f"Added {len(payload.questions)} questions",
        "total_in_test": existing + len(payload.questions),
    }

@router.patch("/tests/{test_id}/questions/{question_id}")
def update_question(
    test_id: int,
    question_id: int,
    payload: QuestionIn,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    q = (
        db.query(Question)
        .filter(Question.id == question_id, Question.test_id == test_id)
        .first()
    )
    if not q:
        raise HTTPException(status_code=404, detail="Not found")

    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    old_marks = q.marks or 0.0
    _apply_question_payload(q, payload)
    _recalculate_test_marks(test, old_marks, payload.marks)

    db.commit()
    db.refresh(q)
    return _question_out(q)

@router.post("/tests/{test_id}/questions/upload-file", status_code=201)
async def upload_questions_file(
    test_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    contents = await read_upload_bytes(file, max_size=50 * 1024 * 1024, allowed_extensions=["json"])
    raw_questions = _parse_json_bytes(contents)
    validated = _validate_raw_questions(raw_questions)

    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Not found")

    imported_count, total_in_test = _persist_imported_questions(db, test, validated)

    return {
        "status": "success",
        "message": f"Imported {imported_count} question{'' if imported_count == 1 else 's'} from JSON file",
        "imported_count": imported_count,
        "total_in_test": total_in_test,
    }

@router.post("/questions/{question_id}/image")
async def upload_question_image(
    question_id: int,
    image: UploadFile = File(...),
    target: str = "question",
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    """Upload image for a question or option. target='question' or 'A'/'B'/'C'/'D'"""
    q = await run_in_threadpool(
        lambda: db.query(Question).filter(Question.id == question_id).first()
    )
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    contents_bytes = await read_upload_bytes(image, max_size=5 * 1024 * 1024, allowed_content_types=["image/"])

    result = await run_in_threadpool(
        upload_image, contents_bytes, folder="gate-prep/questions"
    )
    if not result.get("url"):
        raise HTTPException(
            status_code=500,
            detail=f"Image upload failed: {result.get('error', 'Unknown error')}",
        )

    if target == "question":
        if q.question_image_id:
            await run_in_threadpool(delete_image, q.question_image_id)
        q.question_image_url = result["url"]
        q.question_image_id = result["public_id"]
    elif target.upper() in ["A", "B", "C", "D"]:
        imgs = dict(q.option_images or {})
        imgs[target.upper()] = result["url"]
        q.option_images = imgs
    else:
        raise HTTPException(
            status_code=400, detail="target must be 'question' or A/B/C/D"
        )

    await run_in_threadpool(db.commit)
    return {"url": result["url"], "target": target}

@router.delete("/questions/{question_id}/image")
def delete_question_image(
    question_id: int,
    target: str = "question",
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Not found")
    if target == "question":
        if q.question_image_id:
            delete_image(q.question_image_id)
        q.question_image_url = None
        q.question_image_id = None
    elif target.upper() in ["A", "B", "C", "D"]:
        imgs = dict(q.option_images or {})
        imgs.pop(target.upper(), None)
        q.option_images = imgs
    db.commit()
    return {"message": "Image deleted"}

@router.delete("/tests/{test_id}/questions/{question_id}")
def delete_question(
    test_id: int,
    question_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    q = (
        db.query(Question)
        .filter(Question.id == question_id, Question.test_id == test_id)
        .first()
    )
    if not q:
        raise HTTPException(status_code=404, detail="Not found")
    if q.question_image_id:
        delete_image(q.question_image_id)
    db.delete(q)
    db.commit()
    return {"message": "Deleted"}
