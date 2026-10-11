"""
Module: backend.auth.jwt_handler
Purpose: JWT creation and verification utilities.

         Design choices:
         - HS256 (HMAC-SHA256) for development. Production should
           switch to RS256 with an asymmetric key pair (SEC-01 in PDR)
           so the public key can be shared with verifiers.
         - Expiry is enforced by the library via the `exp` claim.
         - We include standard claims (sub, iat, exp) plus our own
           `role` and `email` claims so the frontend can render
           role-specific UI without an extra lookup.
         - All errors are converted to a single TokenError so callers
           do not need to distinguish between expired, malformed, and
           tampered tokens.

Author: Abdullah (BSEF23M526)
Created: 10/10/2026
"""

from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from jose import JWTError, jwt

from config import get_settings


# --- Load settings once ---
settings = get_settings()


# --- Custom exception ---
class TokenError(Exception):
    """
    Raised when a JWT is missing, malformed, expired, or has an
    invalid signature. Callers should catch this and respond with
    401 Unauthorized.
    """
    pass


# --- Token payload typing ---
# We use a TypedDict-like structure via plain dict for simplicity,
# but document the expected shape here for reference.
#
# Payload shape:
# {
#   "sub": "<user-uuid>",
#   "email": "<user-email>",
#   "role": "student" | "instructor",
#   "iat": <issued-at unix timestamp>,
#   "exp": <expiry unix timestamp>,
# }


def create_access_token(
    user_id: str | UUID,
    role: str,
    email: str,
    expires_in_hours: int | None = None,
) -> str:
    """
    Create a signed JWT access token for a user.

    Args:
        user_id: The user's UUID (str or UUID instance).
        role: Either "student" or "instructor".
        email: The user's email (included for convenience).
        expires_in_hours: Override the default expiry. Useful for
                          short-lived tokens in tests.

    Returns:
        A signed JWT string.

    Raises:
        ValueError: If role is not one of the allowed values.
    """
    if role not in ("student", "instructor"):
        raise ValueError(f"Invalid role: {role}")

    now = datetime.now(timezone.utc)
    ttl_hours = expires_in_hours if expires_in_hours is not None else settings.jwt_expiry_hours

    payload: dict[str, Any] = {
        "sub": str(user_id),
        "email": email,
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=ttl_hours)).timestamp()),
    }

    return jwt.encode(
        payload,
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )


def decode_access_token(token: str) -> dict[str, Any]:
    """
    Decode and verify a JWT access token.

    Args:
        token: The JWT string from the Authorization header.

    Returns:
        The decoded payload as a dict.

    Raises:
        TokenError: If the token is missing, malformed, expired, or
                    has an invalid signature.
    """
    if not token:
        raise TokenError("Missing token")

    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
    except JWTError as exc:
        # jose raises various subclasses (ExpiredSignatureError,
        # JWTClaimsError, etc.) — collapse them into TokenError so
        # callers handle a single exception type.
        raise TokenError(f"Invalid token: {exc}") from exc

    # Sanity check: required claims present.
    for required in ("sub", "role", "exp"):
        if required not in payload:
            raise TokenError(f"Token missing required claim: {required}")

    return payload


def extract_token_from_header(authorization: str | None) -> str:
    """
    Extract the raw token from an Authorization header value.

    Expects the standard "Bearer <token>" format.

    Args:
        authorization: The raw header value (may be None).

    Returns:
        The token string.

    Raises:
        TokenError: If the header is missing or not in Bearer format.
    """
    if not authorization:
        raise TokenError("Missing Authorization header")

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise TokenError("Invalid Authorization header format")

    return parts[1]