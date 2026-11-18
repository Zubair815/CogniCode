"""
Module: backend.schemas.chat
Purpose: Pydantic schemas for chat interactions and WebSocket
         message payloads.

         All WebSocket messages are JSON objects with a `type`
         discriminator so the frontend can route them cleanly.

         Message types:
           Client → Server:
             - chat           : a student message
             - code_submission: a student code block
             - session_end    : request to close the session
             - ping           : keep-alive

           Server → Client:
             - ready          : WS connection accepted
             - typing         : assistant is thinking
             - response       : assistant response
             - error          : something went wrong
             - session_ended  : session closed acknowledgement
             - pong           : keep-alive reply

Created: 10/10/2026
"""

from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


MESSAGE_MAX_LENGTH = 4000


# =============================================================================
# REST — Interaction history
# =============================================================================
class InteractionResponse(BaseModel):
    """A single message exchange persisted in the DB."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    session_id: UUID
    message: str
    response: str
    intent: Optional[Literal["concept", "code_request", "debug", "quiz"]] = None
    attempt_detected: bool
    hint_level_given: Optional[int] = None
    timestamp: datetime


class SessionHistoryResponse(BaseModel):
    """Response for GET /session/{id}/history."""

    session_id: UUID
    topic: str
    interactions: list[InteractionResponse]


# =============================================================================
# WebSocket — Client → Server
# =============================================================================
class WSClientMessage(BaseModel):
    """
    Base shape for any message the client sends over WebSocket.

    The `type` field discriminates between message kinds.
    """

    type: Literal["chat", "code_submission", "session_end", "ping"]
    content: str = Field(default="", max_length=MESSAGE_MAX_LENGTH)


# =============================================================================
# WebSocket — Server → Client
# =============================================================================
class WSServerReady(BaseModel):
    """Server tells the client the WS is ready and sends context."""

    type: Literal["ready"] = "ready"
    session_id: UUID
    topic: str
    history: list[InteractionResponse]


class WSServerTyping(BaseModel):
    """Server tells the client the AI is thinking."""

    type: Literal["typing"] = "typing"


class WSServerResponse(BaseModel):
    """Server delivers the assistant's reply."""

    type: Literal["response"] = "response"
    content: str
    intent: Optional[str] = None
    interaction_id: Optional[UUID] = None
    elapsed_seconds: Optional[float] = None


class WSServerError(BaseModel):
    """Server reports a recoverable error."""

    type: Literal["error"] = "error"
    code: str
    message: str


class WSServerSessionEnded(BaseModel):
    """Server acknowledges a session end request."""

    type: Literal["session_ended"] = "session_ended"
    session_id: UUID


class WSServerPong(BaseModel):
    """Keep-alive reply."""

    type: Literal["pong"] = "pong"