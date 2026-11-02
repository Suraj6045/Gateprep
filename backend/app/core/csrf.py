from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}
REQUIRED_HEADER = "x-requested-with"
REQUIRED_VALUE = "XMLHttpRequest"

# Module-level flag — tests set this to False via conftest.py
csrf_enabled = True


class CSRFHeaderMiddleware(BaseHTTPMiddleware):
    """Reject state-changing requests that lack the X-Requested-With header.

    Browsers block cross-origin custom headers unless CORS preflight allows
    them, so a malicious site cannot forge this header for our domain.
    """

    async def dispatch(self, request: Request, call_next):
        if csrf_enabled and request.method not in SAFE_METHODS:
            header_val = request.headers.get(REQUIRED_HEADER, "")
            if header_val != REQUIRED_VALUE:
                return JSONResponse(
                    status_code=403,
                    content={"detail": "Missing or invalid CSRF header"},
                )
        return await call_next(request)
