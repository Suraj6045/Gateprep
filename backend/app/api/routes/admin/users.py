from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from fastapi_cache.decorator import cache
from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.core.config import settings
from app.core.database import get_db
from app.core.security import generate_password_reset_token, hash_password_reset_token
from app.models.models import PasswordResetToken, User, UserRole
from app.core.cache_utils import (
    ADMIN_USERS_CACHE_NAMESPACE,
    ADMIN_USERS_CACHE_SECONDS,
    admin_users_cache_key_builder,
    clear_admin_users_cache,
)
from .helpers import (
    _encode_user_cursor,
    _parse_user_cursor,
    _password_reset_url,
    _utcnow,
)
from .schemas import RoleUpdate

router = APIRouter()

def _build_users_filter_query(db: Session, search: str, role: Optional[UserRole]):
    """Build the base query for filtering users by search term and role."""
    query = db.query(User)
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(User.full_name.ilike(pattern), User.email.ilike(pattern))
        )
    if role is not None:
        query = query.filter(User.role == role)
    return query

def _get_user_counts(
    db: Session, query, search: str, role: Optional[UserRole]
) -> tuple[int, int, int]:
    """Calculate total matching users, along with global role counts."""
    role_counts_raw = db.query(User.role, func.count(User.id)).group_by(User.role).all()
    role_counts = {r: c for r, c in role_counts_raw}

    aspirants_count = role_counts.get(UserRole.aspirant, 0)
    pending_count = role_counts.get(UserRole.user, 0)

    if search or role is not None:
        total = query.count()
    else:
        total = sum(role_counts.values())

    return total, aspirants_count, pending_count

def _get_paginated_users(
    query, cursor: str | None, limit: int
) -> tuple[list[User], str | None, bool]:
    """Apply cursor-based pagination to the user query."""
    if cursor:
        cursor_created_at, cursor_id = _parse_user_cursor(cursor)
        query = query.filter(
            or_(
                User.created_at < cursor_created_at,
                and_(User.created_at == cursor_created_at, User.id < cursor_id),
            )
        )

    page = query.order_by(User.created_at.desc(), User.id.desc()).limit(limit + 1).all()

    has_more = len(page) > limit
    users = page[:limit]
    next_cursor = _encode_user_cursor(users[-1]) if has_more and users else None

    return users, next_cursor, has_more

def _format_user_items(users: list[User]) -> list[dict]:
    """Format user objects into dictionary representations."""
    return [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "is_active": u.is_active,
            "google_id": u.google_id is not None,
            "created_at": u.created_at,
        }
        for u in users
    ]

@router.get("/users")
@cache(
    expire=ADMIN_USERS_CACHE_SECONDS,
    namespace=ADMIN_USERS_CACHE_NAMESPACE,
    key_builder=admin_users_cache_key_builder,
)
def list_users(
    limit: int = Query(50, ge=1, le=1000),
    cursor: str | None = Query(None, max_length=128),
    q: str = Query("", max_length=255),
    role: Optional[UserRole] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    search = q.strip()
    users_query = _build_users_filter_query(db, search, role)

    total, aspirants_count, pending_count = _get_user_counts(
        db, users_query, search, role
    )
    users, next_cursor, has_more = _get_paginated_users(users_query, cursor, limit)

    return {
        "items": _format_user_items(users),
        "total": total,
        "aspirants_count": aspirants_count,
        "pending_count": pending_count,
        "limit": limit,
        "next_cursor": next_cursor,
        "has_more": has_more,
    }

@router.patch("/users/{user_id}/role")
def update_role(
    user_id: int,
    payload: RoleUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current=Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current.id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")
    user.role = UserRole(payload.role)
    db.commit()
    db.refresh(user)
    clear_admin_users_cache(background_tasks)
    return {
        "id": user.id,
        "role": user.role,
        "email": user.email,
        "full_name": user.full_name,
    }

@router.patch("/users/{user_id}/status")
def toggle_status(
    user_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = not user.is_active
    db.commit()
    clear_admin_users_cache(background_tasks)
    return {
        "message": f"User {'activated' if user.is_active else 'deactivated'}",
        "is_active": user.is_active,
    }

def _revoke_existing_reset_tokens(db: Session, user_id: int) -> None:
    """Mark all unused password-reset tokens for a user as consumed."""
    now = _utcnow()
    (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.user_id == user_id,
            PasswordResetToken.used_at.is_(None),
        )
        .update({PasswordResetToken.used_at: now}, synchronize_session=False)
    )

def _create_reset_token(
    db: Session, user_id: int, created_by: int
) -> tuple[str, datetime]:
    """Generate a new password-reset token, persist it, and return (raw_token, expires_at)."""
    token = generate_password_reset_token()
    now = _utcnow()
    expires_at = now + timedelta(minutes=settings.PASSWORD_RESET_EXPIRE_MINUTES)
    db.add(
        PasswordResetToken(
            user_id=user_id,
            created_by=created_by,
            token_hash=hash_password_reset_token(token),
            expires_at=expires_at,
        )
    )
    return token, expires_at

@router.post("/users/{user_id}/password-reset")
def create_password_reset_link(
    user_id: int, db: Session = Depends(get_db), current=Depends(require_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    _revoke_existing_reset_tokens(db, user.id)
    token, expires_at = _create_reset_token(db, user.id, current.id)
    db.commit()

    return {
        "user_id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "reset_url": _password_reset_url(token),
        "expires_at": expires_at,
    }
