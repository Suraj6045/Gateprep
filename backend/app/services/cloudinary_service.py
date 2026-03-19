import cloudinary
import cloudinary.uploader
from app.core.config import settings

def init_cloudinary():
    """Initialize Cloudinary with credentials from settings."""
    if settings.CLOUDINARY_CLOUD_NAME:
        cloudinary.config(
            cloud_name=settings.CLOUDINARY_CLOUD_NAME,
            api_key=settings.CLOUDINARY_API_KEY,
            api_secret=settings.CLOUDINARY_API_SECRET,
            secure=True
        )

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
                {"quality": "auto", "fetch_format": "auto"},
                {"width": 1200, "crop": "limit"}
            ]
        )
        return {
            "url": result["secure_url"],
            "public_id": result["public_id"]
        }
    except Exception as e:
        print(f"Cloudinary upload error: {e}")
        return {"url": None, "public_id": None, "error": str(e)}

def delete_image(public_id: str) -> bool:
    """Delete image from Cloudinary."""
    if not settings.CLOUDINARY_CLOUD_NAME or not public_id:
        return False
    try:
        cloudinary.uploader.destroy(public_id)
        return True
    except Exception as e:
        print(f"Cloudinary delete error: {e}")
        return False

# Initialize on import
init_cloudinary()
