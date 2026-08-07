import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend
from fastapi_cache.backends.redis import RedisBackend
from redis import asyncio as aioredis

from app.api.routes import admin, auth, bookmarks, tests, series
from app.core.config import settings
from app.core.csrf import CSRFHeaderMiddleware
from app.core.limiter import limiter
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi import _rate_limit_exceeded_handler

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    redis = None
    try:
        redis = aioredis.from_url(
            settings.REDIS_URL, encoding="utf8", decode_responses=True
        )
        await redis.ping()
        FastAPICache.init(RedisBackend(redis), prefix="gateprep-cache")
    except Exception as exc:
        if redis is not None:
            await redis.close()
            redis = None

        if (
            "localhost" not in settings.REDIS_URL
            and "127.0.0.1" not in settings.REDIS_URL
        ):
            raise RuntimeError(
                f"Redis cache unavailable at REDIS_URL={settings.REDIS_URL}"
            ) from exc

        logger.warning(
            "Redis cache unavailable at %s; using in-memory cache. "
            "Set REDIS_URL to a reachable Redis instance for shared production caching.",
            settings.REDIS_URL,
        )
        FastAPICache.init(InMemoryBackend(), prefix="gateprep-cache")
        redis = None

    try:
        yield
    finally:
        if redis is not None:
            await redis.close()


app = FastAPI(title="GATE Prep Platform", version="2.0.0", lifespan=lifespan)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(CSRFHeaderMiddleware)
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Accept", "X-Requested-With"],
)

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(tests.router)
app.include_router(bookmarks.router)
app.include_router(series.router)

if os.path.exists(settings.UPLOAD_DIR):
    app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


@app.get("/")
def root():
    return {"status": "ok", "service": "GATE Prep API", "health": "/health"}


@app.get("/health")
def health():
    return {"status": "ok", "version": "2.0.0"}


