from datetime import datetime, timezone
import logging
import os
from urllib.parse import urlencode

from fastapi import HTTPException, UploadFile

from app.core.config import _is_local_origin, settings
from app.models.models import Question, User
from app.services.cloudinary_service import (
    optimize_delivery_image_url,
    optimize_delivery_image_urls,
)

logger = logging.getLogger(__name__)

_IMAGE_EXTENSIONS_BY_CONTENT_TYPE = {
    "image/jpeg": {"jpg", "jpeg"},
    "image/png": {"png"},
    "image/webp": {"webp"},
    "image/gif": {"gif"},
}


def _detect_image_content_type(contents: bytes) -> str | None:
    if contents.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if contents.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if contents.startswith((b"GIF87a", b"GIF89a")):
        return "image/gif"
    if contents.startswith(b"RIFF") and contents[8:12] == b"WEBP":
        return "image/webp"
    return None


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)

def _password_reset_url(token: str) -> tuple[str, bool]:
    """Build a password-reset URL and return (url, is_local).

    is_local is True when FRONTEND_URL points to localhost, meaning
    the generated link won't work for external users.
    """
    base = settings.FRONTEND_URL.rstrip("/")
    url = f"{base}/reset-password?{urlencode({'token': token})}"
    is_local = _is_local_origin(base)
    if is_local:
        logger.warning(
            "Password-reset link generated with localhost FRONTEND_URL (%s). "
            "This link will not work for external users.",
            base,
        )
    return url, is_local

def _normalize_cursor_datetime(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value

def _encode_user_cursor(user: User) -> str:
    return f"{_normalize_cursor_datetime(user.created_at).isoformat()}|{user.id}"

def _parse_user_cursor(cursor: str) -> tuple[datetime, int]:
    try:
        created_at_raw, user_id_raw = cursor.rsplit("|", 1)
        created_at = _normalize_cursor_datetime(datetime.fromisoformat(created_at_raw))
        return created_at, int(user_id_raw)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail="Invalid cursor") from exc

def _question_out(q: Question) -> dict:
    return {
        "id": q.id,
        "question_type": q.question_type,
        "question_text": q.question_text,
        "question_image_url": optimize_delivery_image_url(q.question_image_url),
        "options": q.options,
        "option_images": optimize_delivery_image_urls(q.option_images),
        "correct_answer": q.correct_answer,
        "marks": q.marks,
        "negative_marks": q.negative_marks,
        "order_index": q.order_index,
        "subject": q.subject,
        "topic": q.topic,
    }

async def read_upload_bytes(
    file: UploadFile,
    max_size: int,
    allowed_extensions: list[str] | None = None,
    allowed_content_types: list[str] | None = None,
) -> bytes:
    """Read and validate an uploaded file, enforcing size and format constraints."""
    extension = None
    if allowed_extensions is not None or allowed_content_types is not None:
        if not file.filename:
            raise HTTPException(status_code=400, detail="File name is required")

    if allowed_extensions is not None:
        secure_name = os.path.basename(file.filename.replace("\\", "/"))
        if "." not in secure_name:
            raise HTTPException(status_code=400, detail="File must have an extension")
        ext = secure_name.rsplit(".", 1)[-1].lower()
        normalized_extensions = {
            item.lower().lstrip(".") for item in allowed_extensions
        }
        if ext not in normalized_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Only {', '.join(allowed_extensions)} files accepted",
            )
        extension = ext

    normalized_content_type = None
    normalized_allowed_content_types = None
    if allowed_content_types is not None:
        if not file.content_type:
            raise HTTPException(status_code=400, detail="Content-Type is required")
        normalized_content_type = file.content_type.split(";", 1)[0].strip().lower()
        normalized_allowed_content_types = {
            content_type.split(";", 1)[0].strip().lower()
            for content_type in allowed_content_types
        }
        if normalized_content_type not in normalized_allowed_content_types:
            raise HTTPException(
                status_code=400,
                detail=f"Only {', '.join(allowed_content_types)} files are accepted",
            )

    contents_arr = bytearray()
    while chunk := await file.read(1024 * 1024):
        contents_arr.extend(chunk)
        if len(contents_arr) > max_size:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum allowed size is {max_size // (1024 * 1024)}MB.",
            )
    contents_bytes = bytes(contents_arr)

    if not contents_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    if (
        normalized_allowed_content_types is not None
        and normalized_content_type is not None
        and normalized_content_type.startswith("image/")
    ):
        detected_content_type = _detect_image_content_type(contents_bytes)
        if (
            detected_content_type not in normalized_allowed_content_types
            or detected_content_type != normalized_content_type
        ):
            raise HTTPException(
                status_code=400,
                detail="Uploaded file contents do not match an allowed image type",
            )
        if extension and extension not in _IMAGE_EXTENSIONS_BY_CONTENT_TYPE.get(
            detected_content_type, set()
        ):
            raise HTTPException(
                status_code=400,
                detail="File extension does not match the image contents",
            )

    return contents_bytes
