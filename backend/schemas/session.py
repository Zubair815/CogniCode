"""
Module: backend.schemas.session
Purpose: Pydantic schemas for session lifecycle endpoints.

         Sessions represent a single tutoring conversation between
         a student and CogniCode. A session is created when the
         student starts a new topic and ends when they submit their
         reflection.

Created: 10/10/2026
"""

from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


TOPIC_MIN_LENGTH = 3
TOPIC_MAX_LENGTH = 200


class StartSessionRequest(BaseModel):
    """Body for POST /session/start."""

    topic: str = Field(..., min_length=TOPIC_MIN_LENGTH, max_length=TOPIC_MAX_LENGTH)

    @field_validator("topic")
    @classmethod
    def topic_not_blank(cls, v: str) -> str:
        v = v.strip()
        if len(v) < TOPIC_MIN_LENGTH:
            raise ValueError(f"Topic must be at least {TOPIC_MIN_LENGTH} characters.")
        return v


class SessionResponse(BaseModel):
    """Public representation of a session."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    student_id: UUID
    topic: str
    started_at: datetime
    ended_at: Optional[datetime] = None

    dependency_score: float
    dependency_band: Optional[Literal["low", "moderate", "high"]] = None
    hint_levels_used: list[int]
    solution_requests: int
    retry_count: int
    debugging_attempts: int
    reflection_stored: bool


class SessionListResponse(BaseModel):
    """Response for GET /session/history."""

    sessions: list[SessionResponse]