from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timezone
from app.core.database import get_db
from app.api.deps import require_admin, get_current_user
from app.models.models import ChecklistSubject, ChecklistTopic, ChecklistProgress

router = APIRouter(prefix="/checklist", tags=["Syllabus Checklist"])

# Checklist items users can tick per topic
CHECKLIST_ITEMS = ["theory", "pyq_1", "pyq_2", "pyq_3", "revision_1", "revision_2", "revision_3"]
CHECKLIST_LABELS = {
    "theory": "Theory",
    "pyq_1": "PYQ 1st time",
    "pyq_2": "PYQ 2nd time",
    "pyq_3": "PYQ 3rd time",
    "revision_1": "Revision 1",
    "revision_2": "Revision 2",
    "revision_3": "Revision 3"
}

class SubjectCreate(BaseModel):
    name: str
    order_index: int = 0

class TopicCreate(BaseModel):
    name: str
    order_index: int = 0

class ProgressUpdate(BaseModel):
    item: str   # e.g. "theory", "pyq_1"
    completed: bool


@router.get("")
def get_checklist(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Get full checklist with user's progress."""
    subjects = db.query(ChecklistSubject).order_by(ChecklistSubject.order_index).all()

    # Load all user progress in one query
    user_progress = {}
    if current_user:
        progress_rows = db.query(ChecklistProgress).filter(
            ChecklistProgress.user_id == current_user.id
        ).all()
        user_progress = {p.topic_id: p.completed_items for p in progress_rows}

    result = []
    for s in subjects:
        topics = []
        subject_total = 0
        subject_done = 0

        for t in sorted(s.topics, key=lambda x: x.order_index):
            completed = user_progress.get(t.id, {})
            done_count = sum(1 for item in CHECKLIST_ITEMS if completed.get(item, False))
            subject_total += len(CHECKLIST_ITEMS)
            subject_done += done_count
            topics.append({
                "id": t.id,
                "name": t.name,
                "order_index": t.order_index,
                "completed_items": completed,
                "done_count": done_count,
                "total_items": len(CHECKLIST_ITEMS),
                "percentage": round(done_count / len(CHECKLIST_ITEMS) * 100)
            })

        result.append({
            "id": s.id,
            "name": s.name,
            "order_index": s.order_index,
            "topics": topics,
            "subject_percentage": round(subject_done / subject_total * 100) if subject_total else 0
        })

    return {
        "subjects": result,
        "checklist_items": CHECKLIST_LABELS
    }


@router.post("/{topic_id}/progress")
def update_progress(
    topic_id: int,
    payload: ProgressUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    if payload.item not in CHECKLIST_ITEMS:
        raise HTTPException(status_code=400, detail=f"Invalid item. Must be one of: {CHECKLIST_ITEMS}")

    topic = db.query(ChecklistTopic).filter(ChecklistTopic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    progress = db.query(ChecklistProgress).filter(
        ChecklistProgress.user_id == current_user.id,
        ChecklistProgress.topic_id == topic_id
    ).first()

    if not progress:
        progress = ChecklistProgress(
            user_id=current_user.id,
            topic_id=topic_id,
            completed_items={}
        )
        db.add(progress)

    items = dict(progress.completed_items or {})
    items[payload.item] = payload.completed
    progress.completed_items = items
    progress.updated_at = datetime.now(timezone.utc)
    db.commit()

    done = sum(1 for i in CHECKLIST_ITEMS if items.get(i, False))
    return {
        "topic_id": topic_id,
        "completed_items": items,
        "done_count": done,
        "percentage": round(done / len(CHECKLIST_ITEMS) * 100)
    }


# ── Admin: manage subjects and topics ─────────────────────────────

@router.post("/subjects", status_code=201)
def create_subject(payload: SubjectCreate, db: Session = Depends(get_db), current=Depends(require_admin)):
    s = ChecklistSubject(name=payload.name, order_index=payload.order_index, created_by=current.id)
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


@router.delete("/subjects/{subject_id}")
def delete_subject(subject_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    s = db.query(ChecklistSubject).filter(ChecklistSubject.id == subject_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(s)
    db.commit()
    return {"message": "Deleted"}


@router.post("/subjects/{subject_id}/topics", status_code=201)
def create_topic(subject_id: int, payload: TopicCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    subject = db.query(ChecklistSubject).filter(ChecklistSubject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    t = ChecklistTopic(subject_id=subject_id, name=payload.name, order_index=payload.order_index)
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


@router.delete("/topics/{topic_id}")
def delete_topic(topic_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    t = db.query(ChecklistTopic).filter(ChecklistTopic.id == topic_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(t)
    db.commit()
    return {"message": "Deleted"}
