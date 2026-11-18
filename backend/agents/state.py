"""
Module: backend.agents.state
Purpose: Shared state object passed between multi-agent LangGraph nodes.

Created: 10/10/2026
Updated: 18/11/2026
"""

from typing import Any, Literal, TypedDict

Intent = Literal["concept_question", "code_request", "debug", "quiz", "hint_request", "other"]


class ChatMessage(TypedDict):
    """A single message in the conversation history."""
    role: Literal["student", "assistant"]
    content: str


class QuizOption(TypedDict):
    id: str
    text: str
    correct: bool


class ConceptCheckQuestion(TypedDict, total=False):
    """Conceptual code check required before Level 3+ hints."""
    id: str
    topic: str
    prompt: str
    code_snippet: str | None
    options: list[QuizOption]
    explanation: str


class AgentState(TypedDict, total=False):
    """
    Shared multi-agent state dictionary passed through LangGraph.
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

    # --- 5-Level Progressive Hint State Machine ---
    current_hint_level: int         # 0 = none yet, 1 to 5
    target_hint_level: int          # Target level requested or evaluated
    hint_requested: bool            # True if student explicitly requested a hint
    hint_content: str               # Extracted or generated hint text
    understanding_check_required: bool # True if advancing to Level 3+ requires a quiz
    understanding_check_passed: bool   # True if student answered check correctly
    quiz_question: ConceptCheckQuestion | None

    # --- Context ---
    history: list[ChatMessage]

    # --- Multi-agent routing ---
    next_node: str

    # --- Telemetry & Metadata ---
    metadata: dict[str, Any]


def new_state(
    student_id: str,
    session_id: str,
    topic: str,
    message: str,
    history: list[ChatMessage] | None = None,
    preferred_language: str = "Python",
    current_hint_level: int = 0,
) -> AgentState:
    """Build a fresh AgentState for a single turn."""
    return AgentState(
        student_id=student_id,
        session_id=session_id,
        topic=topic,
        message=message,
        history=history or [],
        preferred_language=preferred_language,
        attempt_detected=False,
        current_hint_level=current_hint_level,
        target_hint_level=max(1, current_hint_level),
        hint_requested=False,
        hint_content="",
        understanding_check_required=False,
        understanding_check_passed=False,
        quiz_question=None,
        next_node="conversation_manager",
        metadata={},
    )
