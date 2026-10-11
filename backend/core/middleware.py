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
from starlette.responses import Response


class RequestIdMiddleware(BaseHTTPMiddleware):
    """
    Attach a request ID to every incoming request.

    If the client sends X-Request-ID we honor it (useful when a
    frontend tracing library already generates IDs). Otherwise we
    generate a fresh UUID4.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        incoming = request.headers.get("x-request-id")
        request_id = incoming or str(uuid.uuid4())

        # Store on request.state so handlers can read it.
        request.state.request_id = request_id

        response = await call_next(request)

        # Echo back so clients can correlate logs.
        response.headers["X-Request-ID"] = request_id
        return response