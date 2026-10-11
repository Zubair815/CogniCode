"""
Module: backend.schemas.auth
Purpose: Pydantic schemas for authentication endpoints.

         Design choices:
         - Request and Response schemas are strictly separated so
           sensitive fields (password_hash) can never leak.
         - Field validators enforce business rules (password length,
           email format, name length, PUCIT ID format) at the schema
           level — the DB CheckConstraints are a backstop, not the
           primary defense.
         - `from_attributes=True` on response models allows returning
           SQLAlchemy ORM instances directly; Pydantic reads the
           attributes it needs.
         - Enum-valued fields (role) use Literal so OpenAPI docs
           show dropdowns in Swagger UI.

Author: Abdullah (BSEF23M526)
Created: 10/10/2026
"""

import re
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


# =============================================================================
# CONSTANTS
# =============================================================================
# Constraints are documented in one place so they stay consistent with
# the frontend validation and the DB CheckConstraints.

PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_LENGTH = 72   # bcrypt's 72-byte limit (see auth.security)
NAME_MIN_LENGTH = 2
NAME_MAX_LENGTH = 100
PUCIT_ID_PATTERN = re.compile(r"^(BSEF\d{2}M\d{3}|EMP-\d{3,4})$")
VALID_ROLES = ("student", "instructor")


# =============================================================================
# REQUEST SCHEMAS
# =============================================================================
class RegisterRequest(BaseModel):
    """
    Body for POST /auth/register.

    The `pucit_id` field is optional — independent learners do not
    have one. When provided, it must match the PUCIT format so we
    can distinguish student IDs from instructor IDs.
    """

    name: str = Field(..., min_length=NAME_MIN_LENGTH, max_length=NAME_MAX_LENGTH)
    email: EmailStr
    password: str = Field(..., min_length=PASSWORD_MIN_LENGTH, max_length=PASSWORD_MAX_LENGTH)
    role: Literal["student", "instructor"]
    pucit_id: Optional[str] = Field(default=None, max_length=20)
    preferred_language: str = Field(default="Python", max_length=50)
    institution: Optional[str] = Field(default=None, max_length=200)

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        """Reject names that are only whitespace."""
        v = v.strip()
        if len(v) < NAME_MIN_LENGTH:
            raise ValueError(f"Name must be at least {NAME_MIN_LENGTH} characters.")
        return v

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        """
        Enforce a minimum password policy.

        Rules (deliberately simple for V1):
        - At least 8 characters (already enforced by Field).
        - Must contain at least one letter and one digit.
        - Must not be only whitespace.

        Rationale: university context — we want reasonable security
        without frustrating users during a semester.
        """
        if not any(c.isalpha() for c in v):
            raise ValueError("Password must contain at least one letter.")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit.")
        return v

    @field_validator("pucit_id")
    @classmethod
    def pucit_id_format(cls, v: Optional[str]) -> Optional[str]:
        """
        If a PUCIT ID is provided, it must match the expected format.

        Format examples:
            BSEF23M526   → student
            EMP-001      → instructor
        """
        if v is None:
            return None
        v = v.strip().upper()
        if not PUCIT_ID_PATTERN.match(v):
            raise ValueError(
                "PUCIT ID must match BSEF<YY>M<NNN> or EMP-<NNN>."
            )
        return v

    @field_validator("role")
    @classmethod
    def role_matches_pucit_id(cls, v: str, info) -> str:
        """
        Cross-field consistency: instructor IDs (EMP-*) cannot
        register as students, and vice versa.
        """
        pucit_id = info.data.get("pucit_id")
        if pucit_id is None:
            return v
        is_instructor_id = pucit_id.startswith("EMP-")
        if is_instructor_id and v != "instructor":
            raise ValueError("EMP-* IDs must register as instructors.")
        if not is_instructor_id and v != "student":
            raise ValueError("BSEF* IDs must register as students.")
        return v


class LoginRequest(BaseModel):
    """
    Body for POST /auth/login.

    Accepts either email or PUCIT ID in the `identifier` field so
    users can log in with whichever they remember.
    """

    identifier: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=1, max_length=PASSWORD_MAX_LENGTH)


# =============================================================================
# RESPONSE SCHEMAS
# =============================================================================
class UserResponse(BaseModel):
    """
    Public representation of a user. Used in register/login responses
    and in `/auth/me`. Never contains password_hash.
    """

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    email: EmailStr
    role: Literal["student", "instructor"]
    pucit_id: Optional[str] = None
    preferred_language: str
    institution: Optional[str] = None


class TokenResponse(BaseModel):
    """
    Response shape for successful register/login.

    Contains the access token (the frontend stores it in memory or
    an HttpOnly cookie, never localStorage) and the user object so
    the UI can render role-specific views without an extra request.
    """

    access_token: str
    token_type: Literal["bearer"] = "bearer"
    user: UserResponse


# =============================================================================
# ERROR SCHEMAS
# =============================================================================
class ErrorResponse(BaseModel):
    """
    Standard error shape. All non-2xx responses should follow this
    shape so the frontend can render error messages consistently.
    """

    detail: str
    code: Optional[str] = None