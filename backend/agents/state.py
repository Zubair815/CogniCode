"""
Module: backend.agents.state
Purpose: Shared state object passed between agents.

Created: 10/10/2026
Updated: 10/10/2026
"""

from typing import Any, Literal, TypedDict

Intent = Literal["concept_question", "code_request", "debug", "quiz", "other"]


class ChatMessage(TypedDict):
    """A single message in the conversation history."""
    role: Literal["student", "assistant"]
    content: str


class AgentState(TypedDict, total=False):
    """
    Shared state passed between agents.
    """
    # --- Identifiers ---
    student_id: str
    session_id: str

    # --- Session context ---
    topic: str
    preferred_language: str

    # --- Current interaction ---
    message: str
    intent: Intent
    response: str
    attempt_detected: bool

    # --- Context ---
    history: list[ChatMessage]

    # --- Metadata ---
    metadata: dict[str, Any]


def new_state(
    student_id: str,
    session_id: str,
    topic: str,
    message: str,
    history: list[ChatMessage] | None = None,
    preferred_language: str = "Python",
) -> AgentState:
    """Build a fresh AgentState for a single interaction."""
    return AgentState(
        student_id=student_id,
        session_id=session_id,
        topic=topic,
        message=message,
        history=history or [],
        preferred_language=preferred_language,
        attempt_detected=False,  # Default is False, detector will update it
        metadata={},
    )