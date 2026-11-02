from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session, joinedload

from app.api.deps import require_aspirant
from app.core.database import get_db
from app.models.models import Bookmark, Question, Test, TestAttempt, TestStatus
from app.services.cloudinary_service import (
    optimize_delivery_image_url,
    optimize_delivery_image_urls,
)

router = APIRouter(prefix="/bookmarks", tags=["Bookmarks"])


class BookmarkNote(BaseModel):
    note: Optional[str] = None


class BookmarkOut(BaseModel):
    id: int
    question_id: int
    question_text: str
    question_type: str
    question_image_url: Optional[str] = None
    options: List[str]
    option_images: Optional[dict] = None
    correct_answer: Optional[str] = None
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
    current_user=Depends(require_aspirant),
):
    """Toggle bookmark — adds if not exists, removes if exists."""
    question = (
        db.query(Question)
        .join(Question.test)
        .filter(Question.id == question_id, Test.is_published.is_(True))
        .first()
    )
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
        .options(joinedload(Bookmark.question).joinedload(Question.test))
        .join(Bookmark.question)
        .join(Question.test)
        .filter(Bookmark.user_id == user_id)
        .filter(Test.is_published.is_(True))
        .order_by(Bookmark.created_at.desc())
        .all()
    )


def _answer_visible_test_ids(
    db: Session, user_id: int, test_ids: set[int]
) -> set[int]:
    """Only reveal keys after submission, and never during an active attempt."""
    if not test_ids:
        return set()

    attempts = (
        db.query(TestAttempt.test_id, TestAttempt.status)
        .filter(
            TestAttempt.user_id == user_id,
            TestAttempt.test_id.in_(test_ids),
        )
        .all()
    )
    submitted_test_ids = {
        test_id for test_id, status in attempts if status == TestStatus.submitted
    }
    in_progress_test_ids = {
        test_id for test_id, status in attempts if status == TestStatus.in_progress
    }
    return submitted_test_ids - in_progress_test_ids


def _format_bookmark(
    bookmark: Bookmark, include_correct_answer: bool = False
) -> BookmarkOut:
    """Helper function to format a Bookmark ORM model into a BookmarkOut schema."""
    q = bookmark.question
    return BookmarkOut(
        id=bookmark.id,
        question_id=q.id,
        question_text=q.question_text,
        question_type=q.question_type,
        question_image_url=optimize_delivery_image_url(q.question_image_url),
        options=q.options or [],
        option_images=optimize_delivery_image_urls(q.option_images),
        correct_answer=q.correct_answer if include_correct_answer else None,
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
    db: Session = Depends(get_db), current_user=Depends(require_aspirant)
):
    """Get all bookmarked questions for current user."""
    bookmarks = _fetch_user_bookmarks(db, current_user.id)
    test_ids = {bookmark.question.test_id for bookmark in bookmarks}
    answer_visible_test_ids = _answer_visible_test_ids(db, current_user.id, test_ids)
    return [
        _format_bookmark(
            bookmark,
            include_correct_answer=bookmark.question.test_id in answer_visible_test_ids,
        )
        for bookmark in bookmarks
    ]


@router.patch("/{question_id}/note")
def update_note(
    question_id: int,
    payload: BookmarkNote,
    db: Session = Depends(get_db),
    current_user=Depends(require_aspirant),
):
    """Update the personal note on a bookmark."""
    bookmark = (
        db.query(Bookmark)
        .join(Bookmark.question)
        .join(Question.test)
        .filter(
            Bookmark.user_id == current_user.id,
            Bookmark.question_id == question_id,
            Test.is_published.is_(True),
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
    db: Session = Depends(get_db), current_user=Depends(require_aspirant)
):
    """Returns just the list of bookmarked question IDs — used by TestEngine."""
    bookmarks = (
        db.query(Bookmark.question_id)
        .join(Bookmark.question)
        .join(Question.test)
        .filter(
            Bookmark.user_id == current_user.id,
            Test.is_published.is_(True),
        )
        .all()
    )
    return {"ids": [b.question_id for b in bookmarks]}
