from datetime import datetime, timezone

from typing import Optional, cast, Literal
from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    HTTPException,
    Request,
    Response,
)
from fastapi_cache import FastAPICache
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.core.limiter import limiter
from app.core.security import (
    create_access_token,
    decode_token,
    generate_session_id,
    hash_password,
    hash_password_reset_token,
    verify_password,
)
from app.models.models import PasswordResetToken, User, UserRole

router = APIRouter(prefix="/auth", tags=["Authentication"])

ADMIN_USERS_CACHE_NAMESPACE = "admin-users"


class RegisterRequest(BaseModel):
    email: EmailStr
    full_name: str
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ResetPasswordRequest(BaseModel):
    token: str
    password: str


class AuthUserResponse(BaseModel):
    id: int
    email: EmailStr
    role: str
    full_name: str


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _auth_cookie_max_age_seconds() -> int:
    return settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60


def _set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.AUTH_COOKIE_NAME,
        value=token,
        max_age=_auth_cookie_max_age_seconds(),
        httponly=True,
        secure=settings.AUTH_COOKIE_SECURE,
        samesite=cast(
            Literal["lax", "strict", "none"] | None, settings.AUTH_COOKIE_SAMESITE
        ),
        path="/",
    )


def _clear_auth_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.AUTH_COOKIE_NAME,
        path="/",
        secure=settings.AUTH_COOKIE_SECURE,
        httponly=True,
        samesite=cast(
            Literal["lax", "strict", "none"] | None, settings.AUTH_COOKIE_SAMESITE
        ),
    )


def _auth_user_response(user: User) -> AuthUserResponse:
    return AuthUserResponse(
        id=user.id,
        email=user.email,
        role=user.role,
        full_name=user.full_name,
    )


def create_token_for_session(user: User, session_id: str) -> str:
    return create_access_token(
        {"sub": user.id, "role": user.role, "sid": session_id, "auth": "cookie"}
    )


def create_token_for_user(
    user: User, db: Session, request: Optional[Request] = None
) -> str:
    session_id = generate_session_id()
    user.current_session_id = session_id
    if request and request.client:
        user.current_ip = request.client.host
    db.commit()
    db.refresh(user)

    # Defensive backstop: if anything between commit and return fails, force a
    # fresh session id and commit again so a failed login cannot leave the user
    # with a silently broken session.
    try:
        return create_token_for_session(user, session_id)
    except Exception:
        try:
            user.current_session_id = generate_session_id()
            db.commit()
        except Exception:
            db.rollback()
        raise


# ── Register ──────────────────────────────────────────────────────


class RegisterServices:
    def __init__(
        self, background_tasks: BackgroundTasks, db: Session = Depends(get_db)
    ):
        self.background_tasks = background_tasks
        self.db = db


def _create_registered_user(db: Session, payload: RegisterRequest) -> User:
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(
            status_code=400,
            detail="Unable to create account. Please try a different email.",
        )
    if len(payload.password) < 8:
        raise HTTPException(
            status_code=400, detail="Password must be at least 8 characters"
        )
    is_first = db.query(User).count() == 0
    user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=UserRole.admin if is_first else UserRole.user,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/register", response_model=AuthUserResponse)
@limiter.limit("3/minute")
def register(
    request: Request,
    payload: RegisterRequest,
    response: Response,
    services: RegisterServices = Depends(),
):
    user = _create_registered_user(services.db, payload)
    services.background_tasks.add_task(
        FastAPICache.clear, namespace=ADMIN_USERS_CACHE_NAMESPACE
    )
    _set_auth_cookie(response, create_token_for_user(user, services.db, request))
    return _auth_user_response(user)


# ── Login ─────────────────────────────────────────────────────────


def _is_valid_credentials(user: Optional[User], password: str) -> bool:
    """True if the user exists, has a password set, and it matches."""
    return (
        bool(user)
        and bool(user.hashed_password)
        and verify_password(password, user.hashed_password)
    )


@router.post("/login", response_model=AuthUserResponse)
@limiter.limit("5/minute")
def login(
    request: Request,
    payload: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == payload.email).first()
    if not _is_valid_credentials(user, payload.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled. Contact admin.")

    _set_auth_cookie(response, create_token_for_user(user, db, request))
    return _auth_user_response(user)


def _invalidate_session(db: Session, token: str) -> None:
    """Decode a token and rotate the user's session ID to invalidate it."""
    payload = decode_token(token)
    if not payload:
        return

    try:
        user_id = int(payload.get("sub", ""))
    except (ValueError, TypeError):
        return

    session_id = payload.get("sid")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return

    if not session_id or user.current_session_id == session_id:
        user.current_session_id = generate_session_id()
        db.commit()


@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    token = request.cookies.get(settings.AUTH_COOKIE_NAME)
    if token:
        _invalidate_session(db, token)

    _clear_auth_cookie(response)
    return {"message": "Logged out"}


# ── Refresh Token ─────────────────────────────────────────────────


def _is_valid_cookie_auth_payload(payload: Optional[dict]) -> bool:
    """True if the decoded token payload exists and was issued for cookie auth."""
    return bool(payload) and payload.get("auth") == "cookie"


def _extract_user_id(payload: dict) -> int:
    """Parse the `sub` claim to an int; raises 401 if missing or malformed."""
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    try:
        return int(user_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid token")


def _is_session_still_valid(user: Optional[User], session_id: Optional[str]) -> bool:
    """True if the user exists, a session id was presented, and it matches
    the user's current (live) session id."""
    return bool(user) and bool(session_id) and user.current_session_id == session_id


@router.post("/refresh", response_model=AuthUserResponse)
@limiter.limit("10/minute")
def refresh_token(request: Request, response: Response, db: Session = Depends(get_db)):
    """Refresh the access token without invalidating in-flight requests."""
    token = request.cookies.get(settings.AUTH_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_token(token)
    if not _is_valid_cookie_auth_payload(payload):
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = _extract_user_id(payload)
    session_id = payload.get("sid")

    user = db.query(User).filter(User.id == user_id, User.is_active.is_(True)).first()
    if not _is_session_still_valid(user, session_id):
        raise HTTPException(status_code=401, detail="Session expired")

    _set_auth_cookie(response, create_token_for_session(user, session_id))
    return _auth_user_response(user)


# ── Reset Password ────────────────────────────────────────────────


def _validate_reset_input(payload: ResetPasswordRequest) -> str:
    """Validate reset payload and return the stripped token."""
    token = payload.token.strip()
    if not token:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")
    if len(payload.password) < 8:
        raise HTTPException(
            status_code=400, detail="Password must be at least 8 characters"
        )
    return token


def _is_usable_reset_token(
    reset_token: Optional[PasswordResetToken], now: datetime
) -> bool:
    """True if the token exists, hasn't been consumed, and hasn't expired."""
    return (
        bool(reset_token)
        and reset_token.used_at is None
        and _as_utc(reset_token.expires_at) >= now
    )


def _lookup_valid_reset_token(db: Session, token: str) -> PasswordResetToken:
    """Find a reset token by hash, raising if missing, used, or expired."""
    reset_token = (
        db.query(PasswordResetToken)
        .filter(PasswordResetToken.token_hash == hash_password_reset_token(token))
        .first()
    )
    now = _utcnow()
    if not _is_usable_reset_token(reset_token, now):
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")
    return reset_token


def _apply_password_reset(
    db: Session, user: User, reset_token: PasswordResetToken, new_password: str
) -> None:
    """Update the user's password, invalidate sessions, and consume all tokens."""
    now = _utcnow()
    user.hashed_password = hash_password(new_password)
    user.current_session_id = None
    user.current_ip = None
    reset_token.used_at = now
    (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used_at.is_(None),
            PasswordResetToken.id != reset_token.id,
        )
        .update({PasswordResetToken.used_at: now}, synchronize_session=False)
    )
    db.commit()


@router.post("/reset-password")
@limiter.limit("3/minute")
def reset_password(
    request: Request, payload: ResetPasswordRequest, db: Session = Depends(get_db)
):
    token = _validate_reset_input(payload)
    reset_token = _lookup_valid_reset_token(db, token)

    user = db.query(User).filter(User.id == reset_token.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    _apply_password_reset(db, user, reset_token, payload.password)

    return {"message": "Password reset successful. Please sign in."}


# ── Me ────────────────────────────────────────────────────────────


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "is_active": current_user.is_active,
        "profile_photo": current_user.profile_photo,
        "created_at": current_user.created_at,
    }
