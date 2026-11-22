"""
Module: backend.core.middleware
Purpose: Request-scoped middleware.

         Currently provides:
         - RequestIdMiddleware: attaches a UUID to each request
           (stored on request.state.request_id) and echoes it back
           in the X-Request-ID response header. This ID appears in
           every error response body, making support investigations
           trivial.

Author: Abdullah (BSEF23M526)
Created: 10/10/2026
"""

import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from config import get_settings


class RequestIdMiddleware(BaseHTTPMiddleware):
    """
    Attach a request ID to every incoming request.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        incoming = request.headers.get("x-request-id")
        request_id = incoming or str(uuid.uuid4())

        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


class MaxBodySizeMiddleware(BaseHTTPMiddleware):
    """Reject oversized HTTP request payloads before JSON parsing."""

    async def dispatch(self, request: Request, call_next) -> Response:
        settings = get_settings()
        max_bytes = settings.max_request_body_bytes
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                if int(content_length) > max_bytes:
                    return JSONResponse(
                        status_code=413,
                        content={
                            "error": {
                                "code": "payload_too_large",
                                "message": "Request body exceeds maximum allowed size.",
                            },
                            "request_id": getattr(request.state, "request_id", str(uuid.uuid4())),
                        },
                    )
            except ValueError:
                pass
        return await call_next(request)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Attach baseline HTTP security headers to all API responses."""

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        response.headers.setdefault("Cache-Control", "no-store")
        if get_settings().app_env == "production":
            response.headers.setdefault(
                "Strict-Transport-Security", "max-age=31536000; includeSubDomains"
            )
        return response