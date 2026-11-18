"""
Module: backend.auth
Purpose: Authentication package — password hashing, JWT utilities,
         and FastAPI dependencies for request authentication and
         role-based access control.
"""

from auth.security import hash_password, verify_password, needs_rehash
from auth.jwt_handler import (
    create_access_token,
    decode_access_token,
    extract_token_from_header,
    TokenError,
)
from auth.dependencies import (
    get_current_user,
    require_role,
    require_student,
    require_instructor,
)

__all__ = [
    # Security
    "hash_password",
    "verify_password",
    "needs_rehash",
    # JWT
    "create_access_token",
    "decode_access_token",
    "extract_token_from_header",
    "TokenError",
    # FastAPI dependencies
    "get_current_user",
    "require_role",
    "require_student",
    "require_instructor",
]