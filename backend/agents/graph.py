"""
Module: backend.agents.graph
Purpose: Multi-Agent LangGraph Orchestrator for CogniCode.

Orchestrates the turn lifecycle across:
  - Conversation Manager (Intent & Attempt Detection)
  - Socratic Tutor (Guiding dialogue & strict no-code policy)
  - Hint Generator (5-level progressive hint state machine)
  - Assessment Agent (Pre-hint conceptual code understanding checks)

Created: 18/11/2026
"""

import logging
from typing import Literal

from langgraph.graph import END, START, StateGraph

from agents.assessment import AssessmentAgent
from agents.conversation_manager import ConversationManager
from agents.hint_generator import HintGenerator
from agents.socratic_tutor import SocraticTutor
from agents.state import AgentState

logger = logging.getLogger("cognicode.agents.graph")

# Singletons for thread-safe stateless agents
_conversation_manager = ConversationManager()
_socratic_tutor = SocraticTutor()
_hint_generator = HintGenerator()
_assessment_agent = AssessmentAgent()


# --- Node Callables ---
async def conversation_manager_node(state: AgentState) -> AgentState:
    return _conversation_manager.process(state)


async def socratic_tutor_node(state: AgentState) -> AgentState:
    return await _socratic_tutor.process(state)


async def hint_generator_node(state: AgentState) -> AgentState:
    return await _hint_generator.process(state)


async def assessment_node(state: AgentState) -> AgentState:
    return await _assessment_agent.process(state)


def route_decision(state: AgentState) -> Literal["socratic_tutor", "hint_generator", "assessment"]:
    """
    Conditional routing edge based on intent, pending quiz, or hint flags.
    """
    intent = state.get("intent")

    # If currently in a quiz check or answering a quiz
    if intent == "quiz" or (state.get("understanding_check_required") and len(state.get("message", "").strip()) <= 4):
        return "assessment"

    # If asking for hints or nudges
    if intent == "hint_request" or state.get("hint_requested"):
        return "hint_generator"

    # Default learning path: Socratic Tutor
    return "socratic_tutor"


def build_tutoring_graph() -> StateGraph:
    """Build and compile the multi-agent tutoring graph."""
    graph = StateGraph(AgentState)

    # Register Nodes
    graph.add_node("conversation_manager", conversation_manager_node)
    graph.add_node("socratic_tutor", socratic_tutor_node)
    graph.add_node("hint_generator", hint_generator_node)
    graph.add_node("assessment", assessment_node)

    # Connect Edges
    graph.add_edge(START, "conversation_manager")

    graph.add_conditional_edges(
        "conversation_manager",
        route_decision,
        {
            "socratic_tutor": "socratic_tutor",
            "hint_generator": "hint_generator",
            "assessment": "assessment",
        },
    )

    graph.add_edge("socratic_tutor", END)
    graph.add_edge("hint_generator", END)
    graph.add_edge("assessment", END)

    return graph.compile()


# Compiled singleton graph
tutoring_graph = build_tutoring_graph()
