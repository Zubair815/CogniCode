"""
Module: backend.schemas
Purpose: Pydantic schemas for request validation and response
         serialization across the API.
"""

from schemas.auth import (
    ErrorResponse,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)

__all__ = [
    "ErrorResponse",
    "LoginRequest",
    "RegisterRequest",
    "TokenResponse",
    "UserResponse",
]