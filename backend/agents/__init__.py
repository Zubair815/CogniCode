"""
Module: backend.agents
Purpose: Multi-agent orchestration for CogniCode.

Active Phase 3 & 4 Agents & Workflows:
  - Code Analysis Agent (Tree-sitter AST parsing & attempt validation)
  - Conversation Manager (intent classification & attempt detection)
  - Socratic Tutor (guided learning dialogue & no-code enforcement)
  - Debugging Coach (guided execution tracing)
  - Hint Generator (5-level progressive hint state machine)
  - Assessment Agent (pre-hint conceptual understanding checks)
  - LangGraph Tutoring Orchestrator (`tutoring_graph`)

Created: 10/10/2026
Updated: 18/11/2026
"""

from agents.state import AgentState, ChatMessage, ConceptCheckQuestion, Intent, new_state
from agents.code_analysis import CodeAnalysisAgent
from agents.conversation_manager import ConversationManager
from agents.debugging_coach import DebuggingCoach
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
    "CodeAnalysisAgent",
    "ConversationManager",
    "DebuggingCoach",
    "SocraticTutor",
    "HintGenerator",
    "AssessmentAgent",
    "tutoring_graph",
]
