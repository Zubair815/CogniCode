"""
Module: backend.agents
Purpose: Multi-agent orchestration for CogniCode.

Active Phase 3 Agents & Workflows:
  - Conversation Manager (intent classification & attempt detection)
  - Socratic Tutor (guided learning dialogue & no-code enforcement)
  - Hint Generator (5-level progressive hint state machine)
  - Assessment Agent (pre-hint conceptual understanding checks)
  - LangGraph Tutoring Orchestrator (`tutoring_graph`)

Created: 10/10/2026
Updated: 18/11/2026
"""

from agents.state import AgentState, ChatMessage, ConceptCheckQuestion, Intent, new_state
from agents.conversation_manager import ConversationManager
from agents.socratic_tutor import SocraticTutor
from agents.hint_generator import HintGenerator
from agents.assessment import AssessmentAgent
from agents.graph import tutoring_graph

__all__ = [
    "AgentState",
    "ChatMessage",
    "ConceptCheckQuestion",
    "Intent",
    "new_state",
    "ConversationManager",
    "SocraticTutor",
    "HintGenerator",
    "AssessmentAgent",
    "tutoring_graph",
]
