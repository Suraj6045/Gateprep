import os
import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.database import get_db
from app.core.config import settings
from app.api.deps import require_admin
from app.models.models import User, Test, Question, QuestionType, UserRole
from app.services.pdf_service import extract_questions_from_pdf
from app.services.cloudinary_service import upload_image, delete_image

router = APIRouter(prefix="/admin", tags=["Admin"])


# ── Users ─────────────────────────────────────────────────────────

@router.get("/users")
def list_users(db: Session = Depends(get_db), _=Depends(require_admin)):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [{
        "id": u.id, "email": u.email, "full_name": u.full_name,
        "role": u.role, "is_active": u.is_active,
        "is_email_verified": u.is_email_verified,
        "google_id": u.google_id is not None,
        "created_at": u.created_at
    } for u in users]


class RoleUpdate(BaseModel):
    role: str

@router.patch("/users/{user_id}/role")
def update_role(user_id: int, payload: RoleUpdate, db: Session = Depends(get_db), current=Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current.id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")
    user.role = UserRole(payload.role)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "role": user.role, "email": user.email, "full_name": user.full_name}


@router.patch("/users/{user_id}/status")
def toggle_status(user_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = not user.is_active
    db.commit()
    return {"message": f"User {'activated' if user.is_active else 'deactivated'}", "is_active": user.is_active}


# ── Tests ─────────────────────────────────────────────────────────

@router.get("/tests")
def list_tests(db: Session = Depends(get_db), _=Depends(require_admin)):
    tests = db.query(Test).order_by(Test.created_at.desc()).all()
    return [{
        "id": t.id, "title": t.title, "description": t.description,
        "duration_minutes": t.duration_minutes, "total_marks": t.total_marks,
        "question_count": len(t.questions), "series_id": t.series_id,
        "is_published": t.is_published, "created_at": t.created_at,
        "category": t.category, "series_name": t.series_name,
        "test_type": t.test_type, "subject": t.subject
    } for t in tests]


@router.get("/tests/{test_id}")
def get_test(test_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Not found")
    return {
        "id": test.id, "title": test.title, "description": test.description,
        "duration_minutes": test.duration_minutes, "total_marks": test.total_marks,
        "question_count": len(test.questions), "series_id": test.series_id,
        "is_published": test.is_published, "created_at": test.created_at,
        "category": test.category, "series_name": test.series_name,
        "test_type": test.test_type, "subject": test.subject
    }


@router.post("/tests", status_code=201)
async def create_test(
    title: str = Form(...),
    description: str = Form(None),
    duration_minutes: int = Form(180),
    series_id: int = Form(None),
    series_order: int = Form(0),
    category: str = Form(None),
    series_name: str = Form(None),
    test_type: str = Form(None),
    subject: str = Form(None),
    pdf_file: UploadFile = File(None),
    db: Session = Depends(get_db),
    current=Depends(require_admin)
):
    pdf_filename = None
    extracted = []

    if pdf_file and pdf_file.filename:
        if not pdf_file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files accepted")
        safe = f"test_{title[:30].replace(' ', '_')}_{pdf_file.filename}"
        path = os.path.join(settings.UPLOAD_DIR, safe)
        with open(path, "wb") as f:
            shutil.copyfileobj(pdf_file.file, f)
        pdf_filename = safe
        extracted = extract_questions_from_pdf(path)

    total_marks = sum(q["marks"] for q in extracted) if extracted else 0.0
    test = Test(
        title=title, description=description, duration_minutes=duration_minutes,
        pdf_filename=pdf_filename, total_marks=total_marks,
        series_id=series_id, series_order=series_order,
        category=category, series_name=series_name,
        test_type=test_type, subject=subject,
        created_by=current.id
    )
    db.add(test)
    db.commit()
    db.refresh(test)

    for idx, q in enumerate(extracted):
        db.add(Question(
            test_id=test.id, question_type=QuestionType(q["question_type"]),
            question_text=q["question_text"], options=q["options"],
            correct_answer=q["correct_answer"], marks=q["marks"],
            negative_marks=q["negative_marks"], order_index=idx
        ))
    if extracted:
        db.commit()

    return {"id": test.id, "title": test.title, "question_count": len(extracted), "total_marks": total_marks}


@router.delete("/tests/{test_id}")
def delete_test(test_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(test)
    db.commit()
    return {"message": "Deleted"}


# ── Questions ─────────────────────────────────────────────────────

@router.get("/tests/{test_id}/questions")
def get_questions(test_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Not found")
    return [{
        "id": q.id, "question_type": q.question_type, "question_text": q.question_text,
        "question_image_url": q.question_image_url, "options": q.options,
        "option_images": q.option_images, "correct_answer": q.correct_answer,
        "marks": q.marks, "negative_marks": q.negative_marks,
        "order_index": q.order_index, "subject": q.subject, "topic": q.topic
    } for q in sorted(test.questions, key=lambda q: q.order_index)]


class QuestionIn(BaseModel):
    question_type: str = "mcq"
    question_text: str
    options: List[str] = []
    correct_answer: str
    marks: float = 1.0
    negative_marks: float = 0.33
    subject: Optional[str] = None
    topic: Optional[str] = None


class QuestionsBulk(BaseModel):
    questions: List[QuestionIn]


@router.post("/tests/{test_id}/questions", status_code=201)
def add_questions(test_id: int, payload: QuestionsBulk, db: Session = Depends(get_db), _=Depends(require_admin)):
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Not found")
    existing = len(test.questions)
    total_added = 0.0
    for idx, q in enumerate(payload.questions):
        db.add(Question(
            test_id=test_id, question_type=QuestionType(q.question_type),
            question_text=q.question_text, options=q.options,
            correct_answer=q.correct_answer, marks=q.marks,
            negative_marks=q.negative_marks, subject=q.subject,
            topic=q.topic, order_index=existing + idx
        ))
        total_added += q.marks
    test.total_marks += total_added
    db.commit()
    return {"message": f"Added {len(payload.questions)} questions", "total_in_test": existing + len(payload.questions)}


@router.post("/questions/{question_id}/image")
async def upload_question_image(
    question_id: int,
    image: UploadFile = File(...),
    target: str = "question",
    db: Session = Depends(get_db),
    _=Depends(require_admin)
):
    """Upload image for a question or option. target='question' or 'A'/'B'/'C'/'D'"""
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    contents = await image.read()
    result = upload_image(contents, folder="gate-prep/questions")
    if not result.get("url"):
        raise HTTPException(status_code=500, detail=f"Image upload failed: {result.get('error', 'Unknown error')}")

    if target == "question":
        if q.question_image_id:
            delete_image(q.question_image_id)
        q.question_image_url = result["url"]
        q.question_image_id = result["public_id"]
    elif target.upper() in ["A", "B", "C", "D"]:
        imgs = dict(q.option_images or {})
        imgs[target.upper()] = result["url"]
        q.option_images = imgs
    else:
        raise HTTPException(status_code=400, detail="target must be 'question' or A/B/C/D")

    db.commit()
    return {"url": result["url"], "target": target}


@router.delete("/questions/{question_id}/image")
def delete_question_image(
    question_id: int,
    target: str = "question",
    db: Session = Depends(get_db),
    _=Depends(require_admin)
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
def delete_question(test_id: int, question_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    q = db.query(Question).filter(Question.id == question_id, Question.test_id == test_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Not found")
    if q.question_image_id:
        delete_image(q.question_image_id)
    db.delete(q)
    db.commit()
    return {"message": "Deleted"}



class TestPatch(BaseModel):
    series_id: Optional[int] = None
    series_order: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    is_published: Optional[bool] = None
    category: Optional[str] = None
    series_name: Optional[str] = None
    test_type: Optional[str] = None
    subject: Optional[str] = None


@router.patch("/tests/{test_id}")
def update_test(test_id: int, payload: TestPatch, db: Session = Depends(get_db), _=Depends(require_admin)):
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Not found")
    update_data = payload.model_dump(exclude_none=True)
    for key, val in update_data.items():
        if hasattr(test, key):
            setattr(test, key, val)
    db.commit()
    return {"message": "Updated"}
