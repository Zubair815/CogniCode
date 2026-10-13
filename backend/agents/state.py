# <agent> agent — to be implemented

"""
Module: backend.agents.state
Purpose: Shared state object passed between agents.

         In Phase 1, this is a small dict-like structure. In later
         phases, when we adopt LangGraph, this will become the graph
         state. Keeping the shape stable now avoids refactoring later.

         Fields:
           student_id        — UUID string of the student
           session_id        — UUID string of the current session
           topic             — Programming topic (e.g., "Linked Lists")
           message           — Latest student message
           intent            — Classified intent (set by Conversation Manager)
           response          — Final response (set by Socratic Tutor)
           history           — Recent messages for context
           preferred_language— Student's language (from memory profile)

Created: 10/10/2026
"""

from typing import Any, Literal, TypedDict


# Intent categories recognized by the Conversation Manager.
# For Phase 1, we use a simple set. Phase 2 will refine classification.
Intent = Literal["concept_question", "code_request", "debug", "quiz", "other"]


class ChatMessage(TypedDict):
    """A single message in the conversation history."""
    role: Literal["student", "assistant"]
    content: str


class AgentState(TypedDict, total=False):
    """
    Shared state passed between agents.

    `total=False` means all keys are optional — agents fill them in
    as they run. This keeps partial state valid during processing.
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

    # --- Context ---
    history: list[ChatMessage]
    attempt_detected: bool

    # --- Metadata (for logging/debugging) ---
    metadata: dict[str, Any]


def new_state(
    student_id: str,
    session_id: str,
    topic: str,
    message: str,
    history: list[ChatMessage] | None = None,
    preferred_language: str = "Python",
) -> AgentState:
    """
    Build a fresh AgentState for a single interaction.

    Using a factory keeps the state shape consistent across the
    codebase and avoids repeating the same dict literal everywhere.
    """
    return AgentState(
        student_id=student_id,
        session_id=session_id,
        topic=topic,
        message=message,
        history=history or [],
        preferred_language=preferred_language,
        attempt_detected=False,
        metadata={},
    )