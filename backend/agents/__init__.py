"""
Module: backend.agents
Purpose: Multi-agent orchestration for CogniCode.

         In Phase 1, only two agents are active:
           - Conversation Manager (intent classification)
           - Socratic Tutor (response generation)

         The full 9-agent pipeline is introduced in later phases.

Created: 10/10/2026
"""

from agents.state import AgentState, ChatMessage, Intent, new_state
from agents.conversation_manager import ConversationManager
from agents.socratic_tutor import SocraticTutor

__all__ = [
    "AgentState",
    "ChatMessage",
    "Intent",
    "new_state",
    "ConversationManager",
    "SocraticTutor",
]