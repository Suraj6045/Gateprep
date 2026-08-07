import hashlib
from fastapi import BackgroundTasks
from fastapi_cache import FastAPICache

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
                if key in {"limit", "cursor", "q", "role"} and value is not None
            )
        )

    query_hash = hashlib.sha256(repr(query_items).encode()).hexdigest()
    return f"{namespace}:{func.__module__}:{func.__name__}:{query_hash}"

def clear_admin_users_cache(background_tasks: BackgroundTasks) -> None:
    background_tasks.add_task(FastAPICache.clear, namespace=ADMIN_USERS_CACHE_NAMESPACE)
