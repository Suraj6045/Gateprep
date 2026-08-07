from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.models import Bookmark, Question

router = APIRouter(prefix="/bookmarks", tags=["Bookmarks"])


class BookmarkNote(BaseModel):
    note: Optional[str] = None


class BookmarkOut(BaseModel):
    id: int
    question_id: int
    question_text: str
    question_type: str
    options: List[str]
    correct_answer: str
    marks: float
    subject: Optional[str]
    topic: Optional[str]
    note: Optional[str]
    created_at: datetime
    test_id: int
    test_title: str

    model_config = ConfigDict(from_attributes=True)


@router.post("/{question_id}/toggle")
def toggle_bookmark(
    question_id: int,
    payload: BookmarkNote = BookmarkNote(),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Toggle bookmark — adds if not exists, removes if exists."""
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    existing = (
        db.query(Bookmark)
        .filter(
            Bookmark.user_id == current_user.id, Bookmark.question_id == question_id
        )
        .first()
    )

    if existing:
        db.delete(existing)
        db.commit()
        return {"bookmarked": False, "message": "Bookmark removed"}
    else:
        bookmark = Bookmark(
            user_id=current_user.id, question_id=question_id, note=payload.note
        )
        db.add(bookmark)
        db.commit()
        return {"bookmarked": True, "message": "Bookmarked"}

def _fetch_user_bookmarks(db: Session, user_id: int) -> List[Bookmark]:
    """Helper function to fetch all bookmarks for a specific user."""
    return (
        db.query(Bookmark)
        .filter(Bookmark.user_id == user_id)
        .order_by(Bookmark.created_at.desc())
        .all()
    )


def _format_bookmark(bookmark: Bookmark) -> BookmarkOut:
    """Helper function to format a Bookmark ORM model into a BookmarkOut schema."""
    q = bookmark.question
    return BookmarkOut(
        id=bookmark.id,
        question_id=q.id,
        question_text=q.question_text,
        question_type=q.question_type,
        options=q.options or [],
        correct_answer=q.correct_answer,
        marks=q.marks,
        subject=q.subject,
        topic=q.topic,
        note=bookmark.note,
        created_at=bookmark.created_at,
        test_id=q.test_id,
        test_title=q.test.title,
    )


@router.get("", response_model=List[BookmarkOut])
def get_bookmarks(
    db: Session = Depends(get_db), current_user=Depends(get_current_user)
):
    """Get all bookmarked questions for current user."""
    bookmarks = _fetch_user_bookmarks(db, current_user.id)
    return [_format_bookmark(b) for b in bookmarks]


@router.patch("/{question_id}/note")
def update_note(
    question_id: int,
    payload: BookmarkNote,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Update the personal note on a bookmark."""
    bookmark = (
        db.query(Bookmark)
        .filter(
            Bookmark.user_id == current_user.id, Bookmark.question_id == question_id
        )
        .first()
    )
    if not bookmark:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    bookmark.note = payload.note
    db.commit()
    return {"message": "Note updated"}


@router.get("/ids")
def get_bookmarked_ids(
    db: Session = Depends(get_db), current_user=Depends(get_current_user)
):
    """Returns just the list of bookmarked question IDs — used by TestEngine."""
    bookmarks = (
        db.query(Bookmark.question_id).filter(Bookmark.user_id == current_user.id).all()
    )
    return {"ids": [b.question_id for b in bookmarks]}
