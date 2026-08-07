import logging
from urllib.parse import urlsplit, urlunsplit

import cloudinary
import cloudinary.uploader

from app.core.config import settings

logger = logging.getLogger(__name__)

AUTO_IMAGE_TRANSFORMATION = "f_auto,q_auto"
AUTO_IMAGE_TRANSFORMATION_PARAMS = {"fetch_format": "auto", "quality": "auto"}
CLOUDINARY_IMAGE_UPLOAD_SEGMENT = "/image/upload/"


def init_cloudinary():
    """Initialize Cloudinary with credentials from settings."""
    if settings.CLOUDINARY_CLOUD_NAME:
        cloudinary.config(
            cloud_name=settings.CLOUDINARY_CLOUD_NAME,
            api_key=settings.CLOUDINARY_API_KEY,
            api_secret=settings.CLOUDINARY_API_SECRET,
            secure=True,
        )


def optimize_delivery_image_url(url: str | None) -> str | None:
    """Add automatic format and quality delivery transforms to Cloudinary image URLs."""
    if not url:
        return url

    parsed_url = urlsplit(url)
    if "cloudinary.com" not in parsed_url.netloc:
        return url

    path = parsed_url.path
    if CLOUDINARY_IMAGE_UPLOAD_SEGMENT not in path:
        return url

    if "f_auto" in path and "q_auto" in path:
        return url

    optimized_path = path.replace(
        CLOUDINARY_IMAGE_UPLOAD_SEGMENT,
        f"{CLOUDINARY_IMAGE_UPLOAD_SEGMENT}{AUTO_IMAGE_TRANSFORMATION}/",
        1,
    )
    return urlunsplit(parsed_url._replace(path=optimized_path))


def optimize_delivery_image_urls(image_urls: dict | None) -> dict | None:
    """Add automatic delivery transforms to a mapping of Cloudinary image URLs."""
    if not image_urls:
        return image_urls

    return {
        key: optimize_delivery_image_url(value) if isinstance(value, str) else value
        for key, value in image_urls.items()
    }


def upload_image(file_bytes: bytes, folder: str = "gate-prep/questions") -> dict:
    """
    Upload image to Cloudinary.
    Returns dict with url and public_id.
    Falls back to local storage if Cloudinary not configured.
    """
    if not settings.CLOUDINARY_CLOUD_NAME:
        return {"url": None, "public_id": None, "error": "Cloudinary not configured"}

    try:
        result = cloudinary.uploader.upload(
            file_bytes,
            folder=folder,
            resource_type="image",
            transformation=[
                dict(AUTO_IMAGE_TRANSFORMATION_PARAMS),
                {"width": 1200, "crop": "limit"},
            ],
        )
        return {
            "url": optimize_delivery_image_url(result["secure_url"]),
            "public_id": result["public_id"],
        }
    except Exception as e:
        logger.error(f"Cloudinary upload error: {e}")
        return {"url": None, "public_id": None, "error": str(e)}


def delete_image(public_id: str) -> bool:
    """Delete image from Cloudinary."""
    if not settings.CLOUDINARY_CLOUD_NAME or not public_id:
        return False
    try:
        cloudinary.uploader.destroy(public_id)
        return True
    except Exception as e:
        logger.error(f"Cloudinary delete error: {e}")
        return False


# Initialize on import
init_cloudinary()
