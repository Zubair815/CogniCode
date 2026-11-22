"""
Module: backend.api.auth
Purpose: Authentication REST endpoints with short-lived access tokens,
         HttpOnly rotating refresh cookies, single-use WebSocket tickets,
         instructor registration authorization, and sliding-window rate limits.
"""

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DBSession

from auth.dependencies import get_current_user
from auth.jwt_handler import create_access_token
from auth.security import hash_password, verify_password
from config import get_settings
from core.rate_limit import enforce_http_rate_limit
from db.models import RefreshToken, Session, User, WsTicket
from db.session import get_db
from schemas.auth import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
    WsTicketRequest,
    WsTicketResponse,
)


router = APIRouter(prefix="/auth", tags=["Authentication"])

REFRESH_COOKIE_NAME = "cognicode_refresh_token"


def _hash_opaque_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def _cookie_params(request: Request) -> dict:
    settings = get_settings()
    is_prod = settings.app_env == "production"
    samesite = (settings.cookie_samesite or ("none" if is_prod else "lax")).lower()
    secure = settings.cookie_secure if settings.cookie_secure is not None else is_prod
    if samesite == "none":
        secure = True
    return {
        "httponly": True,
        "secure": secure,
        "samesite": samesite,
        "path": "/auth",
    }


def _issue_session_tokens(
    user: User,
    request: Request,
    response: Response,
    db: DBSession,
) -> TokenResponse:
    """Create short-lived access JWT + DB-backed HttpOnly rotating refresh cookie."""
    settings = get_settings()
    raw_refresh = secrets.token_urlsafe(48)
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)

    db_refresh = RefreshToken(
        user_id=user.id,
        token_hash=_hash_opaque_token(raw_refresh),
        expires_at=expires_at,
    )
    db.add(db_refresh)
    db.commit()

    cookie_cfg = _cookie_params(request)
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=raw_refresh,
        max_age=settings.refresh_token_expire_days * 86400,
        **cookie_cfg,
    )

    access_token = create_access_token(
        user_id=user.id,
        role=user.role,
        email=user.email,
    )
    return TokenResponse(
        access_token=access_token,
        user=UserResponse.model_validate(user),
    )


# =============================================================================
# POST /auth/register
# =============================================================================
@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new student account (or authorized instructor account)",
)
def register(
    payload: RegisterRequest,
    request: Request,
    response: Response,
    db: DBSession = Depends(get_db),
) -> TokenResponse:
    """
    Register a new user.

    - Public self-registration is permitted for `student` accounts.
    - Registering as `instructor` requires a matching server-configured
      `INSTRUCTOR_INVITE_CODE`.
    - Rate limited per client IP.
    """
    settings = get_settings()
    enforce_http_rate_limit(
        request,
        bucket="auth_register",
        max_requests=settings.register_rate_limit_max,
        window_seconds=settings.register_rate_limit_window_seconds,
    )

    if payload.role == "instructor":
        configured_code = (settings.instructor_invite_code or "").strip()
        provided_code = (payload.invite_code or "").strip()
        if not configured_code or not provided_code or not hmac.compare_digest(
            provided_code, configured_code
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Instructor registration requires a valid institutional invite code.",
            )

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
    return _issue_session_tokens(new_user, request, response, db)


# =============================================================================
# POST /auth/login
# =============================================================================
@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Exchange credentials for a short-lived access JWT and refresh cookie",
)
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: DBSession = Depends(get_db),
) -> TokenResponse:
    """Authenticate a user by email + password with sliding-window rate limiting."""
    settings = get_settings()
    email = payload.identifier.strip().lower()
    enforce_http_rate_limit(
        request,
        bucket="auth_login_ip",
        max_requests=settings.auth_rate_limit_max,
        window_seconds=settings.auth_rate_limit_window_seconds,
    )
    enforce_http_rate_limit(
        request,
        bucket="auth_login_id",
        max_requests=settings.auth_rate_limit_max,
        window_seconds=settings.auth_rate_limit_window_seconds,
        extra_key=email,
    )

    user = db.query(User).filter(User.email == email).first()

    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials.",
        )

    return _issue_session_tokens(user, request, response, db)


# =============================================================================
# POST /auth/refresh
# =============================================================================
@router.post(
    "/refresh",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Rotate HttpOnly refresh cookie and issue a fresh short-lived access JWT",
)
def refresh_session(
    request: Request,
    response: Response,
    cognicode_refresh_token: str | None = Cookie(default=None, alias=REFRESH_COOKIE_NAME),
    db: DBSession = Depends(get_db),
) -> TokenResponse:
    settings = get_settings()
    enforce_http_rate_limit(
        request,
        bucket="auth_refresh",
        max_requests=settings.auth_rate_limit_max * 3,
        window_seconds=settings.auth_rate_limit_window_seconds,
    )

    if not cognicode_refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired. Please sign in again.",
        )

    token_hash = _hash_opaque_token(cognicode_refresh_token)
    now = datetime.now(timezone.utc)
    stored = (
        db.query(RefreshToken)
        .filter(RefreshToken.token_hash == token_hash)
        .first()
    )
    if stored is None or stored.revoked_at is not None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked refresh session.",
        )

    expires_at = stored.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= now:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired. Please sign in again.",
        )

    user = db.get(User, stored.user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account no longer exists.",
        )

    # Rotate: revoke the used refresh token before issuing a new one.
    stored.revoked_at = now
    db.flush()
    return _issue_session_tokens(user, request, response, db)


# =============================================================================
# POST /auth/ws-ticket
# =============================================================================
@router.post(
    "/ws-ticket",
    response_model=WsTicketResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Mint a single-use short-lived ticket for WebSocket authentication",
)
def create_ws_ticket(
    request: Request,
    payload: WsTicketRequest | None = None,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
) -> WsTicketResponse:
    settings = get_settings()
    enforce_http_rate_limit(
        request,
        bucket="auth_ws_ticket",
        max_requests=30,
        window_seconds=60,
        extra_key=str(current_user.id),
    )

    session_id = payload.session_id if payload else None
    if session_id is not None:
        sess = db.get(Session, session_id)
        if sess is None or sess.student_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this session.",
            )

    raw_ticket = secrets.token_urlsafe(32)
    expires_in = settings.ws_ticket_expire_seconds
    ticket_row = WsTicket(
        user_id=current_user.id,
        session_id=session_id,
        token_hash=_hash_opaque_token(raw_ticket),
        expires_at=datetime.now(timezone.utc) + timedelta(seconds=expires_in),
    )
    db.add(ticket_row)
    db.commit()

    return WsTicketResponse(ticket=raw_ticket, expires_in=expires_in)


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
    summary="Revoke refresh session and clear cookie",
)
def logout(
    request: Request,
    response: Response,
    cognicode_refresh_token: str | None = Cookie(default=None, alias=REFRESH_COOKIE_NAME),
    db: DBSession = Depends(get_db),
) -> dict:
    """Revoke refresh cookie server-side and instruct browser to clear cookie."""
    if cognicode_refresh_token:
        token_hash = _hash_opaque_token(cognicode_refresh_token)
        stored = (
            db.query(RefreshToken)
            .filter(
                RefreshToken.token_hash == token_hash,
                RefreshToken.revoked_at.is_(None),
            )
            .first()
        )
        if stored:
            stored.revoked_at = datetime.now(timezone.utc)
            db.commit()

    cookie_cfg = _cookie_params(request)
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        path=cookie_cfg["path"],
        secure=cookie_cfg["secure"],
        httponly=True,
        samesite=cookie_cfg["samesite"],
    )
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
def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
) -> ForgotPasswordResponse:
    settings = get_settings()
    enforce_http_rate_limit(
        request,
        bucket="auth_forgot_pw",
        max_requests=settings.register_rate_limit_max,
        window_seconds=settings.register_rate_limit_window_seconds,
    )
    return ForgotPasswordResponse(
        detail="If an account exists for that email, a reset link has been sent."
    )