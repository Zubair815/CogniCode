"""
Module: backend.api
Purpose: REST API route modules.
"""

from api.auth import router as auth_router

__all__ = ["auth_router"]