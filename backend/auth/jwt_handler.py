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

from config import get_settings, is_valid_jwt_secret


# --- Custom exception ---
class TokenError(Exception):
    """
    Raised when a JWT is missing, malformed, expired, or has an
    invalid signature. Callers should catch this and respond with
    401 Unauthorized.
    """
    pass


def _get_validated_jwt_config():
    settings = get_settings()
    if not is_valid_jwt_secret(settings.jwt_secret):
        raise RuntimeError(
            "JWT_SECRET is missing, a placeholder, or shorter than 32 characters. "
            "Configure a strong random JWT_SECRET before signing or verifying tokens."
        )
    return settings


def create_access_token(
    user_id: str | UUID,
    role: str,
    email: str,
    expires_in_minutes: int | None = None,
    expires_in_hours: int | None = None,
) -> str:
    """
    Create a short-lived signed JWT access token for a user.
    """
    if role not in ("student", "instructor"):
        raise ValueError(f"Invalid role: {role}")

    settings = _get_validated_jwt_config()
    now = datetime.now(timezone.utc)
    if expires_in_minutes is not None:
        delta = timedelta(minutes=expires_in_minutes)
    elif expires_in_hours is not None:
        delta = timedelta(hours=expires_in_hours)
    else:
        delta = timedelta(minutes=settings.access_token_expire_minutes)

    payload: dict[str, Any] = {
        "sub": str(user_id),
        "email": email,
        "role": role,
        "type": "access",
        "iat": int(now.timestamp()),
        "exp": int((now + delta).timestamp()),
    }

    return jwt.encode(
        payload,
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )


def decode_access_token(token: str) -> dict[str, Any]:
    """
    Decode and verify a JWT access token.
    """
    if not token:
        raise TokenError("Missing token")

    settings = _get_validated_jwt_config()
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
    except JWTError as exc:
        raise TokenError(f"Invalid token: {exc}") from exc

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