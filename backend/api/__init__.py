"""
Module: backend.api
Purpose: REST API route modules.

Created: 10/10/2026
"""

from api.auth import router as auth_router
from api.session import router as session_router
from api.instructor import router as instructor_router

__all__ = ["auth_router", "session_router", "instructor_router"]