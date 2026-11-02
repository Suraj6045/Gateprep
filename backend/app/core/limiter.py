from starlette.requests import Request

from slowapi import Limiter


def _get_real_client_ip(request: Request) -> str:
    """Extract the real client IP from X-Forwarded-For set by the reverse proxy.

    HF's proxy appends the actual connecting IP as the last entry in the
    header — anything before that is client-supplied and spoofable.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[-1].strip()
    return request.client.host if request.client else "127.0.0.1"


limiter = Limiter(
    key_func=_get_real_client_ip,
    default_limits=["200/minute"],
    enabled=True,
)
