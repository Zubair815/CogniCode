"""
Module: backend.core
Purpose: Cross-cutting concerns (rate limiting, error handling,
         middleware) used across the application.
"""

from core.errors import register_exception_handlers
from core.middleware import RequestIdMiddleware
from core.rate_limit import (
    enforce_login_limit,
    enforce_register_limit,
    reset_all as reset_rate_limits,
)

__all__ = [
    "register_exception_handlers",
    "RequestIdMiddleware",
    "enforce_login_limit",
    "enforce_register_limit",
    "reset_rate_limits",
]