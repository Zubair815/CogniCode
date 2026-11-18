"""
Module: backend.core
Purpose: Cross-cutting concerns (middleware, error handling)
         used across the application.

         Rate limiting was removed for V1 and will return in V2
         with an email-aware policy.

Created: 10/10/2026
Updated: 10/10/2026
"""

from core.errors import register_exception_handlers
from core.middleware import RequestIdMiddleware

__all__ = [
    "register_exception_handlers",
    "RequestIdMiddleware",
]