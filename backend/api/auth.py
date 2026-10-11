"""
Module: backend.api.auth
Purpose: Authentication REST endpoints.

         Endpoints:
           POST /auth/register  — create a new account
           POST /auth/login     — exchange credentials for a JWT
           GET  /auth/me        — return the current user (JWT required)
           POST /auth/logout    — client-side token invalidation

         Design choices:
         - Registration and login return the same TokenResponse so
           the frontend has one code path after auth succeeds.
         - We return generic error messages for credential failures
           ("Invalid credentials") to prevent user enumeration.
         - PUCIT ID is stored uppercase and is unique when present.
         - Passwords are hashed with bcrypt before insert (never
           stored in plaintext, never logged).
         - Rate limiting is deliberately NOT implemented in this
           endpoint yet — it belongs in middleware (Step 0.10 will
           wire it). This keeps the endpoint focused on correctness.

Author: Abdullah (BSEF23M526)
Created: 10/10/2026
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DBSession

from auth.dependencies import get_current_user
from auth.jwt_handler import create_access_token
from auth.security import hash_password, verify_password
from db.models import User
from db.session import get_db
from schemas.auth import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)


router = APIRouter(prefix="/auth", tags=["Authentication"])


# =============================================================================
# POST /auth/register
# =============================================================================
@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new student or instructor account",
)
def register(
    payload: RegisterRequest,
    db: DBSession = Depends(get_db),
) -> TokenResponse:
    """
    Register a new user.

    Validation performed here:
        - Email uniqueness (case-insensitive).
        - PUCIT ID uniqueness (if provided).
        - Password hashed with bcrypt.

    Returns:
        TokenResponse with a freshly minted JWT and the public
        user object.

    Raises:
        HTTPException 409: if email or PUCIT ID is already registered.
    """
    # --- Normalize inputs ---
    email = payload.email.lower().strip()
    pucit_id = payload.pucit_id.upper() if payload.pucit_id else None

    # --- Check for existing user (email OR pucit_id) ---
    # We do this check before insert so we can return a friendly
    # message. The DB UNIQUE constraint is the authoritative guard;
    # the IntegrityError handler below catches the race condition.
    conditions = [User.email == email]
    if pucit_id:
        conditions.append(User.pucit_id == pucit_id)

    existing = db.query(User).filter(or_(*conditions)).first()
    if existing is not None:
        if existing.email == email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists.",
            )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this PUCIT ID already exists.",
        )

    # --- Create the user ---
    new_user = User(
        name=payload.name.strip(),
        email=email,
        password_hash=hash_password(payload.password),
        role=payload.role,
        pucit_id=pucit_id,
        preferred_language=payload.preferred_language.strip() or "Python",
        institution=payload.institution.strip() if payload.institution else None,
    )

    db.add(new_user)

    try:
        db.commit()
    except IntegrityError as exc:
        # Race condition: another request inserted the same email
        # or PUCIT ID between our check and our commit.
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Account already exists.",
        ) from exc

    db.refresh(new_user)

    # --- Issue token ---
    token = create_access_token(
        user_id=new_user.id,
        role=new_user.role,
        email=new_user.email,
    )

    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(new_user),
    )


# =============================================================================
# POST /auth/login
# =============================================================================
@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Exchange credentials for a JWT",
)
def login(
    payload: LoginRequest,
    db: DBSession = Depends(get_db),
) -> TokenResponse:
    """
    Authenticate a user by email OR PUCIT ID + password.

    Returns:
        TokenResponse with a fresh JWT and the public user object.

    Raises:
        HTTPException 401: on invalid credentials. The same message
                           is returned for unknown user and wrong
                           password to prevent user enumeration.
    """
    # --- Lookup by identifier (email OR PUCIT ID) ---
    identifier = payload.identifier.strip()
    email_candidate = identifier.lower()
    pucit_candidate = identifier.upper()

    user = (
        db.query(User)
        .filter(
            or_(
                User.email == email_candidate,
                User.pucit_id == pucit_candidate,
            )
        )
        .first()
    )

    # --- Verify credentials ---
    # Use a single generic error message for both cases so an
    # attacker cannot tell whether the account exists.
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials.",
        )

    # --- Issue token ---
    token = create_access_token(
        user_id=user.id,
        role=user.role,
        email=user.email,
    )

    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


# =============================================================================
# GET /auth/me
# =============================================================================
@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Return the currently authenticated user",
)
def me(current_user: User = Depends(get_current_user)) -> UserResponse:
    """
    Return the authenticated user's public profile.

    The heavy lifting (token parsing, DB lookup, existence check)
    happens in `get_current_user`. This endpoint simply serializes
    the result.
    """
    return UserResponse.model_validate(current_user)


# =============================================================================
# POST /auth/logout
# =============================================================================
@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    summary="Client-side logout",
)
def logout(current_user: User = Depends(get_current_user)) -> dict:
    """
    Stateless logout.

    Since we issue stateless JWTs, the server does not need to do
    anything except confirm the request. The client must discard
    the token. Endpoint exists so:
        - The frontend has a canonical "logout" URL.
        - We can add token blacklisting or audit logging later
          without changing the frontend.
    """
    return {"detail": "Logged out."}