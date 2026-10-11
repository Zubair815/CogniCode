"""
Module: backend.core.errors
Purpose: Global exception handlers that shape every error response
         into a single, consistent schema.

         Response shape:
             {
               "error": {
                 "code":    "<machine-readable>",
                 "message": "<human-readable>",
                 "details": <optional>
               },
               "request_id": "<uuid>"
             }

         Having one shape for all errors means the frontend can
         render error states with a single component.

         Design choices:
         - HTTPException from FastAPI keeps its status code but is
           reshaped.
         - RequestValidationError (422) is grouped into a single
           error with a summary and a per-field breakdown.
         - Unhandled exceptions return 500 with a generic message;
           the full traceback is logged server-side only (never
           leaked to the client).

Author: Abdullah (BSEF23M526)
Created: 10/10/2026
"""

import logging
import uuid

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException


logger = logging.getLogger("cognicode.errors")


# =============================================================================
# HELPERS
# =============================================================================
def _error_body(code: str, message: str, request_id: str, details=None) -> dict:
    """Build the standard error envelope."""
    body = {
        "error": {
            "code": code,
            "message": message,
        },
        "request_id": request_id,
    }
    if details is not None:
        body["error"]["details"] = details
    return body


def _request_id(request: Request) -> str:
    """Return the request ID set by middleware, or generate one."""
    return getattr(request.state, "request_id", str(uuid.uuid4()))


# =============================================================================
# HANDLERS
# =============================================================================
async def http_exception_handler(request: Request, exc: HTTPException):
    """Reshape FastAPI HTTPExceptions into the standard envelope."""
    code = _status_to_code(exc.status_code)
    return JSONResponse(
        status_code=exc.status_code,
        content=_error_body(code, str(exc.detail), _request_id(request)),
        headers=getattr(exc, "headers", None),
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Reshape Pydantic validation errors.

    The frontend needs to know WHICH field failed and WHY. We
    return both a summary message and the field-level details.
    """
    fields = []
    for err in exc.errors():
        loc = ".".join(str(p) for p in err.get("loc", []) if p != "body")
        fields.append(
            {
                "field": loc or "<body>",
                "message": err.get("msg", "Invalid value"),
                "type": err.get("type"),
            }
        )

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=_error_body(
            code="validation_error",
            message="Some fields are invalid. Please review and try again.",
            request_id=_request_id(request),
            details=fields,
        ),
    )


async def integrity_error_handler(request: Request, exc: IntegrityError):
    """
    Handle DB integrity errors that escape the route layer.

    Routes are expected to catch IntegrityError themselves when
    they can give a specific message. This handler is a backstop
    for anything that slips through.
    """
    logger.warning("Unhandled IntegrityError on %s: %s", request.url.path, exc)
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content=_error_body(
            code="conflict",
            message="The request conflicts with existing data.",
            request_id=_request_id(request),
        ),
    )


async def sqlalchemy_error_handler(request: Request, exc: SQLAlchemyError):
    """Backstop for any other SQLAlchemy error."""
    logger.exception("SQLAlchemy error on %s", request.url.path)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=_error_body(
            code="database_error",
            message="A database error occurred. Please try again.",
            request_id=_request_id(request),
        ),
    )


async def unhandled_exception_handler(request: Request, exc: Exception):
    """
    Catch-all for anything not handled above.

    The full traceback is logged; the client sees only a generic
    message with the request ID for support.
    """
    logger.exception("Unhandled exception on %s", request.url.path)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=_error_body(
            code="internal_error",
            message="Something went wrong on our end. Please try again.",
            request_id=_request_id(request),
        ),
    )


# =============================================================================
# REGISTRATION
# =============================================================================
def register_exception_handlers(app: FastAPI) -> None:
    """
    Attach all handlers to the FastAPI app.

    Order matters: specific handlers must be registered before the
    generic Exception handler.
    """
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(IntegrityError, integrity_error_handler)
    app.add_exception_handler(SQLAlchemyError, sqlalchemy_error_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)


# =============================================================================
# STATUS CODE NAMING
# =============================================================================
_CODE_MAP = {
    400: "bad_request",
    401: "unauthorized",
    403: "forbidden",
    404: "not_found",
    409: "conflict",
    422: "validation_error",
    429: "rate_limited",
    500: "internal_error",
}


def _status_to_code(status_code: int) -> str:
    """Map HTTP status to a short machine-readable code."""
    return _CODE_MAP.get(status_code, f"http_{status_code}")