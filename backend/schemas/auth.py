"""
Module: backend.schemas.auth
Purpose: Pydantic schemas for authentication endpoints.

         Design choices:
         - Request and Response schemas are strictly separated so
           sensitive fields (password_hash) can never leak.
         - Field validators enforce business rules (password length,
           email format, name length) at the schema level — the DB
           CheckConstraints are a backstop, not the primary defense.
         - `from_attributes=True` on response models allows returning
           SQLAlchemy ORM instances directly.

         V1 simplification (10/10/2026):
         - Removed PUCIT ID entirely. CogniCode serves learners
           from any institution or self-study background.

Created: 10/10/2026
Updated: 10/10/2026
"""

from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_LENGTH = 72
NAME_MIN_LENGTH = 2
NAME_MAX_LENGTH = 100
VALID_ROLES = ("student", "instructor")


# =============================================================================
# REQUEST SCHEMAS
# =============================================================================
class RegisterRequest(BaseModel):
    """
    Body for POST /auth/register.

    Open to any learner — no institutional identifier required.
    The optional `institution` field is free text.
    """

    name: str = Field(..., min_length=NAME_MIN_LENGTH, max_length=NAME_MAX_LENGTH)
    email: EmailStr
    password: str = Field(..., min_length=PASSWORD_MIN_LENGTH, max_length=PASSWORD_MAX_LENGTH)
    role: Literal["student", "instructor"]
    preferred_language: str = Field(default="Python", max_length=50)
    institution: Optional[str] = Field(default=None, max_length=200)

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        v = v.strip()
        if len(v) < NAME_MIN_LENGTH:
            raise ValueError(f"Name must be at least {NAME_MIN_LENGTH} characters.")
        return v

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        """
        Minimum password policy:
        - At least 8 characters (enforced by Field).
        - Must contain at least one letter and one digit.
        """
        if not any(c.isalpha() for c in v):
            raise ValueError("Password must contain at least one letter.")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit.")
        return v


class LoginRequest(BaseModel):
    """Body for POST /auth/login."""

    identifier: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=1, max_length=PASSWORD_MAX_LENGTH)


class ForgotPasswordRequest(BaseModel):
    """Body for POST /auth/forgot-password."""

    email: EmailStr


# =============================================================================
# RESPONSE SCHEMAS
# =============================================================================
class UserResponse(BaseModel):
    """Public representation of a user (no password_hash)."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    email: EmailStr
    role: Literal["student", "instructor"]
    preferred_language: str
    institution: Optional[str] = None


class TokenResponse(BaseModel):
    """Response shape for successful register/login."""

    access_token: str
    token_type: Literal["bearer"] = "bearer"
    user: UserResponse


class ForgotPasswordResponse(BaseModel):
    """Response for POST /auth/forgot-password."""

    detail: str


# =============================================================================
# ERROR SCHEMAS
# =============================================================================
class ErrorResponse(BaseModel):
    """Standard error shape."""

    detail: str
    code: Optional[str] = None