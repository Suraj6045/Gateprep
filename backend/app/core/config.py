import ipaddress
import logging
import re
from pathlib import Path
from typing import List

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import URL, make_url
from sqlalchemy.exc import ArgumentError

PASSWORD_URL_ENCODING_MESSAGE = (
    "DATABASE_URL appears malformed. If your database password contains special "
    "characters, URL-encode the password before setting DATABASE_URL. Examples: "
    "@ -> %40, # -> %23, / -> %2F, : -> %3A, & -> %26, + -> %2B, % -> %25."
)

LOCAL_DATABASE_HOSTS = {"localhost", "db", "postgres", "host.docker.internal"}


def _is_remote_database_host(host: str | None) -> bool:
    if not host:
        return False

    clean_host = host.strip("[]").lower()
    if clean_host in LOCAL_DATABASE_HOSTS:
        return False

    try:
        ip = ipaddress.ip_address(clean_host)
    except ValueError:
        return True

    return not (ip.is_loopback or ip.is_private or ip.is_link_local)


def _validate_raw_database_url(raw_url: str) -> None:
    if not raw_url:
        raise ValueError("DATABASE_URL is required.")

    if "[YOUR-PASSWORD]" in raw_url:
        raise ValueError(
            "DATABASE_URL still contains [YOUR-PASSWORD]. Replace it with your "
            "actual Supabase database password, URL-encoded if needed."
        )

    if re.search(r"%(?![0-9A-Fa-f]{2})", raw_url):
        raise ValueError(PASSWORD_URL_ENCODING_MESSAGE)


def _convert_postgres_scheme(raw_url: str) -> str:
    if raw_url.startswith("postgresql://"):
        return "postgresql+psycopg2://" + raw_url[len("postgresql://") :]
    if raw_url.startswith("postgres://"):
        return "postgresql+psycopg2://" + raw_url[len("postgres://") :]
    return raw_url


def _enforce_remote_postgres_ssl(url: URL) -> URL:
    if url.host and "@" in url.host:
        raise ValueError(PASSWORD_URL_ENCODING_MESSAGE)

    if _is_remote_database_host(url.host):
        query = dict(url.query)
        query["sslmode"] = "require"
        url = url.set(query=query)

    return url


def normalize_database_url(database_url: str) -> str:
    raw_url = (database_url or "").strip()
    _validate_raw_database_url(raw_url)
    raw_url = _convert_postgres_scheme(raw_url)

    try:
        url = make_url(raw_url)
    except ArgumentError as exc:
        raise ValueError(PASSWORD_URL_ENCODING_MESSAGE) from exc

    if url.drivername.startswith("postgresql"):
        url = _enforce_remote_postgres_ssl(url)
        return url.render_as_string(hide_password=False)

    return raw_url


def _is_local_origin(origin: str) -> bool:
    return "localhost" in origin or "127.0.0.1" in origin


def _is_insecure_remote_origin(origin: str) -> bool:
    return origin.startswith("http://") and not _is_local_origin(origin)


def _check_mixed_origins(origins: List[str]) -> None:
    has_local = any(_is_local_origin(o) for o in origins)
    has_remote = any(not _is_local_origin(o) for o in origins)
    if has_local and has_remote:
        logging.getLogger(__name__).warning(
            "CORS_ORIGINS contains both localhost and remote origins. "
            "Remove localhost origins before deploying to production."
        )


def _check_insecure_origins(origins: List[str]) -> None:
    if any(_is_insecure_remote_origin(o) for o in origins):
        logging.getLogger(__name__).warning(
            "CORS_ORIGINS contains insecure HTTP remote origins. "
            "HTTPS should always be used for remote origins."
        )


def _validate_cors_origins(origins: List[str]) -> None:
    if not origins:
        raise ValueError("CORS_ORIGINS must not be empty.")

    if "*" in origins:
        raise ValueError(
            "Wildcard CORS origins ('*') are not permitted. "
            "Explicitly define your frontend URLs in CORS_ORIGINS."
        )

    _check_mixed_origins(origins)
    _check_insecure_origins(origins)


class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str = "redis://localhost:6379/0"
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 180
    CORS_ORIGINS: str = ""
    FRONTEND_URL: str = "http://localhost:5173"
    PASSWORD_RESET_EXPIRE_MINUTES: int = 30
    UPLOAD_DIR: str = "uploads"
    AUTH_COOKIE_NAME: str = "access_token"
    AUTH_COOKIE_SECURE: bool = True
    AUTH_COOKIE_SAMESITE: str = "none"
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 30
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    @model_validator(mode="after")
    def _validate_secret_key(self) -> "Settings":
        if len(self.SECRET_KEY) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters.")
        return self

    @property
    def cors_origins_list(self) -> List[str]:
        origins = [
            origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()
        ]
        _validate_cors_origins(origins)
        return origins

    @property
    def sqlalchemy_database_url(self) -> str:
        return normalize_database_url(self.DATABASE_URL)

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()
Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
