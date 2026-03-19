from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.database import get_db
from app.api.deps import require_admin, get_current_user, require_aspirant
from app.models.models import TestSeries, Test, TestAttempt, TestStatus

router = APIRouter(prefix="/series", tags=["Test Series"])

class SeriesCreate(BaseModel):
    title: str
    description: Optional[str] = None

class SeriesOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    test_count: int = 0

    class Config:
        from_attributes = True


@router.get("")
def list_series(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    all_series = db.query(TestSeries).order_by(TestSeries.created_at.desc()).all()
    result = []
    for s in all_series:
        tests = db.query(Test).filter(Test.series_id == s.id, Test.is_published == True).all()
        completed = 0
        if current_user:
            for t in tests:
                done = db.query(TestAttempt).filter(
                    TestAttempt.user_id == current_user.id,
                    TestAttempt.test_id == t.id,
                    TestAttempt.status == TestStatus.submitted
                ).first()
                if done:
                    completed += 1
        result.append({
            "id": s.id,
            "title": s.title,
            "description": s.description,
            "test_count": len(tests),
            "completed_count": completed,
            "created_at": s.created_at
        })
    return result


@router.get("/{series_id}/tests")
def get_series_tests(series_id: int, db: Session = Depends(get_db), current_user=Depends(require_aspirant)):
    series = db.query(TestSeries).filter(TestSeries.id == series_id).first()
    if not series:
        raise HTTPException(status_code=404, detail="Series not found")

    tests = db.query(Test).filter(
        Test.series_id == series_id,
        Test.is_published == True
    ).order_by(Test.series_order).all()

    result = []
    for t in tests:
        attempt = db.query(TestAttempt).filter(
            TestAttempt.user_id == current_user.id,
            TestAttempt.test_id == t.id,
            TestAttempt.status == TestStatus.submitted
        ).first()
        result.append({
            "id": t.id,
            "title": t.title,
            "description": t.description,
            "duration_minutes": t.duration_minutes,
            "total_marks": t.total_marks,
            "question_count": len(t.questions),
            "series_order": t.series_order,
            "is_completed": attempt is not None,
            "attempt_id": attempt.id if attempt else None,
            "score": attempt.score if attempt else None
        })
    return {"series": {"id": series.id, "title": series.title, "description": series.description}, "tests": result}


@router.post("", status_code=201)
def create_series(payload: SeriesCreate, db: Session = Depends(get_db), current=Depends(require_admin)):
    s = TestSeries(title=payload.title, description=payload.description, created_by=current.id)
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


@router.delete("/{series_id}")
def delete_series(series_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    s = db.query(TestSeries).filter(TestSeries.id == series_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Not found")
    # Unlink tests from series
    db.query(Test).filter(Test.series_id == series_id).update({"series_id": None})
    db.delete(s)
    db.commit()
    return {"message": "Deleted"}
