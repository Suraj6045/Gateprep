import hashlib
import logging
from fastapi import BackgroundTasks, Request
from fastapi_cache import FastAPICache

logger = logging.getLogger(__name__)

ADMIN_USERS_CACHE_NAMESPACE = "admin-users"
ADMIN_USERS_CACHE_SECONDS = 30

def admin_users_cache_key_builder(
    func, namespace="", *, request=None, response=None, args=None, kwargs=None
) -> str:
    if request is not None:
        query_items = tuple(sorted(request.query_params.multi_items()))
    else:
        kwargs = kwargs or {}
        query_items = tuple(
            sorted(
                (
                    key,
                    str(value.value if hasattr(value, "value") else value),
                )
                for key, value in kwargs.items()
                if key in {"limit", "cursor", "q", "role", "is_active"} and value is not None
            )
        )

    query_hash = hashlib.sha256(repr(query_items).encode()).hexdigest()
    return f"{namespace}:{func.__module__}:{func.__name__}:{query_hash}"

def clear_admin_users_cache(background_tasks: BackgroundTasks) -> None:
    background_tasks.add_task(FastAPICache.clear, namespace=ADMIN_USERS_CACHE_NAMESPACE)


CATALOG_CACHE_NAMESPACE = "catalog"
CATALOG_CACHE_SECONDS = 30
_SAFE_METHODS = frozenset({"GET", "HEAD", "OPTIONS"})


def catalog_cache_key_builder(
    func, namespace="", *, request=None, response=None, args=None, kwargs=None
) -> str:
    """Key by route + path + query only.

    The published catalog is identical for every approved user, so the key
    deliberately has no user component (auth still runs as a dependency before
    the cached body is returned). Do NOT use this for per-user responses.
    """
    if request is not None:
        path = request.url.path
        query_items = tuple(sorted(request.query_params.multi_items()))
    else:
        path = f"test:{(kwargs or {}).get('test_id', '')}"
        query_items = ()

    query_hash = hashlib.sha256(repr(query_items).encode()).hexdigest()
    return f"{namespace}:{func.__module__}:{func.__name__}:{path}:{query_hash}"


async def _clear_catalog_namespace() -> None:
    # Never let a cache failure (e.g. a Redis blip) surface as an error on an
    # admin write that already committed; entries simply expire via the TTL.
    try:
        await FastAPICache.clear(namespace=CATALOG_CACHE_NAMESPACE)
    except Exception:
        logger.warning(
            "Could not invalidate catalog cache; entries expire within %ss",
            CATALOG_CACHE_SECONDS,
            exc_info=True,
        )


def clear_catalog_cache(background_tasks: BackgroundTasks) -> None:
    background_tasks.add_task(_clear_catalog_namespace)


def clear_catalog_cache_after_write(
    request: Request, background_tasks: BackgroundTasks
) -> None:
    """Router dependency: any non-read request clears the catalog cache.

    Runs as a background task after the response, so the clear happens after
    the write has committed. Clearing on a failed write is harmless.
    """
    if request.method not in _SAFE_METHODS:
        clear_catalog_cache(background_tasks)
