"""
Module: backend.schemas
Purpose: Pydantic schemas for request validation and response
         serialization across the API.

Created: 10/10/2026
"""

from schemas.auth import (
    ErrorResponse,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from schemas.session import (
    SessionListResponse,
    SessionResponse,
    StartSessionRequest,
)
from schemas.chat import (
    InteractionResponse,
    SessionHistoryResponse,
    WSClientMessage,
    WSServerError,
    WSServerPong,
    WSServerReady,
    WSServerResponse,
    WSServerSessionEnded,
    WSServerTyping,
)

__all__ = [
    # Auth
    "ErrorResponse",
    "ForgotPasswordRequest",
    "ForgotPasswordResponse",
    "LoginRequest",
    "RegisterRequest",
    "TokenResponse",
    "UserResponse",
    # Session
    "StartSessionRequest",
    "SessionResponse",
    "SessionListResponse",
    # Chat
    "InteractionResponse",
    "SessionHistoryResponse",
    "WSClientMessage",
    "WSServerReady",
    "WSServerTyping",
    "WSServerResponse",
    "WSServerError",
    "WSServerSessionEnded",
    "WSServerPong",
]