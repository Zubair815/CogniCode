"""
Module: backend.auth
Purpose: Authentication package — password hashing, JWT utilities,
         and (in later steps) FastAPI dependencies for request auth.
"""

from auth.security import hash_password, verify_password, needs_rehash
from auth.jwt_handler import (
    create_access_token,
    decode_access_token,
    extract_token_from_header,
    TokenError,
)

__all__ = [
    "hash_password",
    "verify_password",
    "needs_rehash",
    "create_access_token",
    "decode_access_token",
    "extract_token_from_header",
    "TokenError",
]