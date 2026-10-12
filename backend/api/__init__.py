"""
Module: backend.api
Purpose: REST API route modules.

Created: 10/10/2026
Updated: 10/10/2026
"""

from api.auth import router as auth_router

__all__ = ["auth_router"]