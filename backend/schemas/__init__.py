"""
Module: backend.schemas
Purpose: Pydantic schemas for request validation and response
         serialization across the API.

Created: 10/10/2026
Updated: 10/10/2026
"""

from schemas.auth import (
    ErrorResponse,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)

__all__ = [
    "ErrorResponse",
    "ForgotPasswordRequest",
    "ForgotPasswordResponse",
    "LoginRequest",
    "RegisterRequest",
    "TokenResponse",
    "UserResponse",
]