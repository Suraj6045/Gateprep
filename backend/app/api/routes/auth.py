from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token, generate_session_id
from app.core.config import settings
from app.models.models import User, UserRole, OTPToken
from app.services.email_service import generate_otp, send_otp_email
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ── Schemas ───────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    full_name: str
    password: str

class OTPVerifyRequest(BaseModel):
    email: EmailStr
    otp: str

class ResendOTPRequest(BaseModel):
    email: EmailStr

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    full_name: str
    user_id: int


# ── Helper ────────────────────────────────────────────────────────

def create_token_for_user(user: User, db: Session, request: Request = None) -> str:
    """Creates token and invalidates all previous sessions (single session enforcement)."""
    session_id = generate_session_id()
    user.current_session_id = session_id
    if request:
        user.current_ip = request.client.host
    db.commit()
    return create_access_token({"sub": user.id, "role": user.role, "sid": session_id})


# ── Register (with OTP email verification) ────────────────────────

@router.post("/register/send-otp")
def register_send_otp(payload: RegisterRequest, db: Session = Depends(get_db)):
    """
    Step 1: Validate credentials, send OTP to verify email is real.
    Account is NOT created until OTP is verified.
    """
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    # Rate limit: max 5 OTPs per email per day
    from sqlalchemy import func
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    daily_count = db.query(OTPToken).filter(
        OTPToken.email == payload.email,
        OTPToken.purpose == "register",
        OTPToken.created_at >= today_start
    ).count()
    if daily_count >= 5:
        raise HTTPException(status_code=429, detail="Too many OTP requests today. Try again tomorrow.")

    # Clear old pending OTPs for this email
    db.query(OTPToken).filter(
        OTPToken.email == payload.email,
        OTPToken.purpose == "register"
    ).delete()

    otp = generate_otp()
    expires = datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)

    db.add(OTPToken(
        email=payload.email,
        otp=otp,
        purpose="register",
        pending_data={
            "full_name": payload.full_name,
            "password": hash_password(payload.password)
        },
        expires_at=expires
    ))
    db.commit()

    if not send_otp_email(payload.email, otp, "email verification"):
        raise HTTPException(status_code=500, detail="Failed to send OTP. Please check your email address.")

    return {
        "message": f"OTP sent to {payload.email}. Valid for {settings.OTP_EXPIRE_MINUTES} minutes.",
        "expires_in_minutes": settings.OTP_EXPIRE_MINUTES
    }


@router.post("/register/verify-otp", response_model=TokenResponse)
def register_verify_otp(payload: OTPVerifyRequest, request: Request, db: Session = Depends(get_db)):
    """
    Step 2: Verify OTP → create account → return token.
    User is logged in immediately after registration.
    """
    token = db.query(OTPToken).filter(
        OTPToken.email == payload.email,
        OTPToken.purpose == "register"
    ).first()

    if not token:
        raise HTTPException(status_code=400, detail="No pending OTP. Please start registration again.")

    exp = token.expires_at
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) > exp:
        db.delete(token)
        db.commit()
        raise HTTPException(status_code=400, detail="OTP expired. Please request a new one.")

    if token.otp != payload.otp.strip():
        raise HTTPException(status_code=400, detail="Invalid OTP. Please check and try again.")

    # First registered user becomes admin automatically
    is_first = db.query(User).count() == 0

    user = User(
        email=payload.email,
        full_name=token.pending_data["full_name"],
        hashed_password=token.pending_data["password"],
        is_email_verified=True,
        role=UserRole.admin if is_first else UserRole.user
    )
    db.add(user)
    db.delete(token)
    db.commit()
    db.refresh(user)

    access_token = create_token_for_user(user, db, request)
    return TokenResponse(
        access_token=access_token,
        role=user.role,
        full_name=user.full_name,
        user_id=user.id
    )


@router.post("/register/resend-otp")
def register_resend_otp(payload: ResendOTPRequest, db: Session = Depends(get_db)):
    """Resend registration OTP. Rate limited to once per 60 seconds."""
    existing = db.query(OTPToken).filter(
        OTPToken.email == payload.email,
        OTPToken.purpose == "register"
    ).first()

    if not existing:
        raise HTTPException(status_code=400, detail="No pending registration. Please start again.")

    created = existing.created_at
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    elapsed = (datetime.now(timezone.utc) - created).total_seconds()
    if elapsed < 60:
        raise HTTPException(
            status_code=429,
            detail=f"Please wait {int(60 - elapsed)} seconds before requesting a new OTP."
        )

    # Generate new OTP, keep pending_data
    new_otp = generate_otp()
    existing.otp = new_otp
    existing.expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)
    existing.created_at = datetime.now(timezone.utc)
    db.commit()

    send_otp_email(payload.email, new_otp, "email verification")
    return {"message": "OTP resent successfully"}


# ── Login (direct — no OTP) ───────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    """
    Direct login with email + password. No OTP required.
    Issues a new session token, invalidating any previous session on another device.
    """
    user = db.query(User).filter(User.email == payload.email).first()

    if not user or not user.hashed_password:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled. Contact admin.")

    access_token = create_token_for_user(user, db, request)
    return TokenResponse(
        access_token=access_token,
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
