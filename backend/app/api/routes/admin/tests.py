from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.core.database import get_db
from app.models.models import Question, Test, TestAttempt, UserAnswer
from app.services.cloudinary_service import (
    cloudinary_public_id_from_url,
    delete_image,
)
from .schemas import TestCreate, TestPatch

router = APIRouter()

@router.get("/tests")
def list_tests(db: Session = Depends(get_db), _=Depends(require_admin)):
    results = (
        db.query(Test, func.count(Question.id).label("question_count"))
        .outerjoin(Question, Test.id == Question.test_id)
        .group_by(Test.id)
        .order_by(Test.created_at.desc())
        .all()
    )
    return [
        {
            "id": test.id,
            "title": test.title,
            "description": test.description,
            "duration_minutes": test.duration_minutes,
            "total_marks": test.total_marks,
            "question_count": question_count,
            "series_id": test.series_id,
            "is_published": test.is_published,
            "created_at": test.created_at,
            "category": test.category,
            "series_name": test.series_name,
            "test_type": test.test_type,
            "subject": test.subject,
        }
        for test, question_count in results
    ]

@router.get("/tests/{test_id}")
def get_test(test_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Not found")
    question_count = (
        db.query(func.count(Question.id)).filter(Question.test_id == test_id).scalar()
        or 0
    )
    return {
        "id": test.id,
        "title": test.title,
        "description": test.description,
        "duration_minutes": test.duration_minutes,
        "total_marks": test.total_marks,
        "question_count": question_count,
        "series_id": test.series_id,
        "is_published": test.is_published,
        "created_at": test.created_at,
        "category": test.category,
        "series_name": test.series_name,
        "test_type": test.test_type,
        "subject": test.subject,
    }

@router.post("/tests", status_code=201)
def create_test(
    payload: TestCreate,
    db: Session = Depends(get_db),
    current=Depends(require_admin),
):
    test = Test(
        title=payload.title,
        description=payload.description,
        duration_minutes=payload.duration_minutes,
        total_marks=0.0,
        series_id=payload.series_id,
        series_order=payload.series_order,
        category=payload.category,
        series_name=payload.series_name,
        test_type=payload.test_type,
        subject=payload.subject,
        created_by=current.id,
    )
    db.add(test)
    db.commit()
    db.refresh(test)

    return {
        "id": test.id,
        "title": test.title,
        "question_count": 0,
        "total_marks": 0.0,
    }

@router.patch("/tests/{test_id}")
def update_test(
    test_id: int,
    payload: TestPatch,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Not found")
    update_data = payload.model_dump(exclude_none=True)
    for key, val in update_data.items():
        if hasattr(test, key):
            setattr(test, key, val)
    db.commit()
    return {"message": "Updated"}

@router.delete("/tests/{test_id}")
def delete_test(test_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Not found")

    questions = db.query(Question).filter(Question.test_id == test_id).all()
    image_public_ids = []
    for question in questions:
        if question.question_image_id:
            image_public_ids.append(question.question_image_id)
        for image_url in (question.option_images or {}).values():
            public_id = cloudinary_public_id_from_url(image_url)
            if public_id and public_id not in image_public_ids:
                image_public_ids.append(public_id)

    question_ids = [question.id for question in questions]
    attempt_ids = [
        attempt_id
        for (attempt_id,) in db.query(TestAttempt.id)
        .filter(TestAttempt.test_id == test_id)
        .all()
    ]
    answer_query = db.query(UserAnswer)
    if question_ids or attempt_ids:
        answer_filters = []
        if question_ids:
            answer_filters.append(UserAnswer.question_id.in_(question_ids))
        if attempt_ids:
            answer_filters.append(UserAnswer.attempt_id.in_(attempt_ids))
        answer_query.filter(or_(*answer_filters)).delete(synchronize_session=False)

    db.delete(test)
    db.commit()

    for public_id in image_public_ids:
        delete_image(public_id)

    return {"message": "Deleted"}
