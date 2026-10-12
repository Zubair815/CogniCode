"""
Module: backend.api.auth
Purpose: Authentication REST endpoints.

         Endpoints:
           POST /auth/register          — create a new account
           POST /auth/login             — exchange credentials for a JWT
           GET  /auth/me                — current user (JWT required)
           POST /auth/logout            — client-side token invalidation
           POST /auth/forgot-password   — placeholder for reset flow

         Design choices:
         - Registration and login return the same TokenResponse.
         - Generic error messages for credential failures to prevent
           user enumeration.
         - Passwords are hashed with bcrypt before insert.
         - Rate limiting was removed for V1 and will return in V2
           with an email-aware policy.

Created: 10/10/2026
Updated: 10/10/2026
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DBSession

from auth.dependencies import get_current_user
from auth.jwt_handler import create_access_token
from auth.security import hash_password, verify_password
from db.models import User
from db.session import get_db
from schemas.auth import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
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

    - Email uniqueness (case-insensitive).
    - Password hashed with bcrypt.

    Raises:
        HTTPException 409: if the email is already registered.
    """
    email = payload.email.lower().strip()

    existing = db.query(User).filter(User.email == email).first()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    new_user = User(
        name=payload.name.strip(),
        email=email,
        password_hash=hash_password(payload.password),
        role=payload.role,
        preferred_language=payload.preferred_language.strip() or "Python",
        institution=payload.institution.strip() if payload.institution else None,
    )

    db.add(new_user)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Account already exists.",
        ) from exc

    db.refresh(new_user)

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
    Authenticate a user by email + password.

    Raises:
        HTTPException 401: on invalid credentials. Same message is
                           returned for unknown user and wrong
                           password to prevent user enumeration.
    """
    email = payload.identifier.strip().lower()

    user = db.query(User).filter(User.email == email).first()

    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials.",
        )

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
    """Return the authenticated user's public profile."""
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
    Stateless logout. Server-side token blacklisting is deferred
    to a future release.
    """
    return {"detail": "Logged out."}


# =============================================================================
# POST /auth/forgot-password
# =============================================================================
@router.post(
    "/forgot-password",
    response_model=ForgotPasswordResponse,
    status_code=status.HTTP_200_OK,
    summary="Request a password reset link",
)
def forgot_password(payload: ForgotPasswordRequest) -> ForgotPasswordResponse:
    """
    Placeholder endpoint for password reset.

    V1 behavior:
        - Always returns a generic success message regardless of
          whether the email exists. This prevents user enumeration.
        - In development, the reset token is logged to the server
          console (implemented in V2).

    V2 behavior:
        - Generate reset token, send email, verify on confirmation.
    """
    return ForgotPasswordResponse(
        detail="If an account exists for that email, a reset link has been sent."
    )