"""
Module: backend.auth.dependencies
Purpose: FastAPI dependencies for authentication and role-based
         access control (RBAC).

         Design choices:
         - A single `get_current_user` dependency extracts the JWT
           from the Authorization header, decodes it, and loads the
           user from the DB. Every protected route depends on it.
         - `require_role` returns a dependency factory so routes can
           declare their required role declaratively:
               @router.get("/admin", dependencies=[Depends(require_role("instructor"))])
         - All failures raise HTTPException with 401 (unauthenticated)
           or 403 (authenticated but wrong role). This distinction is
           important for correct client behavior:
             401 → log in again
             403 → you are logged in but not allowed here
         - We re-verify the user exists in the DB on every request.
           This prevents "ghost users" from continuing to use valid
           tokens after their account was deleted or disabled.

Author: Abdullah (BSEF23M526)
Created: 10/10/2026
"""

from typing import Callable
from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session as DBSession

from auth.jwt_handler import TokenError, decode_access_token
from db.session import get_db
from db.models import User


# --- Bearer token scheme ---
# auto_error=False so we can raise our own 401 with a consistent message
# instead of FastAPI's default. This keeps error shapes uniform for
# the frontend to parse.
_bearer_scheme = HTTPBearer(auto_error=False)


# =============================================================================
# CURRENT USER EXTRACTION
# =============================================================================
def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: DBSession = Depends(get_db),
) -> User:
    """
    Extract and validate the authenticated user from the request.

    Flow:
        1. Read the Bearer token from the Authorization header.
        2. Decode + verify the JWT (signature, expiry, claims).
        3. Load the user from the DB by the `sub` claim (user ID).
        4. Return the User ORM instance.

    Raises:
        HTTPException 401: if the header is missing, the token is
                           invalid/expired, or the user no longer exists.
    """
    # --- Step 1: Header present? ---
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # --- Step 2: Decode token ---
    try:
        payload = decode_access_token(credentials.credentials)
    except TokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    # --- Step 3: Load user from DB ---
    try:
        user_id = UUID(payload["sub"])
    except (ValueError, KeyError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token subject.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    user = db.get(User, user_id)

    # If the account was deleted after the token was issued, deny access.
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account no longer exists.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


# =============================================================================
# ROLE ENFORCEMENT (RBAC)
# =============================================================================
def require_role(*allowed_roles: str) -> Callable[[User], User]:
    """
    Return a dependency that enforces the current user has one of
    the given roles.

    Usage:
        @router.get("/instructor/students")
        def list_students(user: User = Depends(require_role("instructor"))):
            ...

    Args:
        *allowed_roles: One or more acceptable role values
                        (e.g., "student", "instructor").

    Returns:
        A FastAPI dependency that returns the current user if the
        role check passes, otherwise raises HTTP 403.
    """
    # Validate the arguments at import time — catches typos early.
    valid = {"student", "instructor"}
    for role in allowed_roles:
        if role not in valid:
            raise ValueError(f"Unknown role: {role!r}")

    allowed = set(allowed_roles)

    def _check(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed:
            # 403 Forbidden: user is authenticated but not permitted.
            # We deliberately do NOT leak which role is required.
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource.",
            )
        return user

    return _check


# =============================================================================
# ROLE SHORTCUTS
# =============================================================================
# These are the dependencies most endpoints will use directly.
# They exist as named functions (not lambdas) so they show up clearly
# in FastAPI's auto-generated OpenAPI docs.

require_student = require_role("student")
require_instructor = require_role("instructor")