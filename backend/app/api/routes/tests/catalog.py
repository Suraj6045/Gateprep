from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import require_aspirant
from app.core.database import get_db
from app.models.models import Question, Test

def list_tests(db: Session = Depends(get_db), _=Depends(require_aspirant)):
    results = (
        db.query(Test, func.count(Question.id).label("question_count"))
        .outerjoin(Question, Test.id == Question.test_id)
        .filter(Test.is_published.is_(True))
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
            "created_at": test.created_at,
            "category": test.category,
            "series_name": test.series_name,
            "test_type": test.test_type,
            "subject": test.subject,
        }
        for test, question_count in results
    ]


def get_test(test_id: int, db: Session = Depends(get_db), _=Depends(require_aspirant)):
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    question_count = db.query(Question).filter(Question.test_id == test_id).count()
    return {
        "id": test.id,
        "title": test.title,
        "description": test.description,
        "duration_minutes": test.duration_minutes,
        "total_marks": test.total_marks,
        "question_count": question_count,
        "series_id": test.series_id,
        "created_at": test.created_at,
    }
