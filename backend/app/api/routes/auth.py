from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token, generate_session_id
from app.models.models import User, UserRole, OTPToken
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


class RegisterRequest(BaseModel):
    email: EmailStr
    full_name: str
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    full_name: str
    user_id: int


def create_token_for_user(user: User, db: Session, request: Request = None) -> str:
    session_id = generate_session_id()
    user.current_session_id = session_id
    if request:
        user.current_ip = request.client.host
    db.commit()
    return create_access_token({"sub": user.id, "role": user.role, "sid": session_id})


# ── Register (direct, no OTP) ─────────────────────────────────────

@router.post("/register", response_model=TokenResponse)
def register(payload: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    is_first = db.query(User).count() == 0
    user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        is_email_verified=True,
        role=UserRole.admin if is_first else UserRole.user
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return TokenResponse(
        access_token=create_token_for_user(user, db, request),
        role=user.role,
        full_name=user.full_name,
        user_id=user.id
    )


# ── Login (direct, no OTP) ────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not user.hashed_password or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled. Contact admin.")

    return TokenResponse(
        access_token=create_token_for_user(user, db, request),
        role=user.role,
        full_name=user.full_name,
        user_id=user.id
    )


# ── Me ────────────────────────────────────────────────────────────

@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "is_active": current_user.is_active,
        "is_email_verified": current_user.is_email_verified,
        "profile_photo": current_user.profile_photo,
        "created_at": current_user.created_at
    }
