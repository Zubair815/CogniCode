"""
Module: backend.agents.graph
Purpose: Multi-Agent LangGraph Orchestrator for CogniCode.

Orchestrates the turn lifecycle across:
  - Code Analysis Agent (Tree-sitter AST validation & pattern detection)
  - Conversation Manager (Intent & Attempt Detection)
  - Socratic Tutor (Guiding dialogue & strict no-code policy)
  - Hint Generator (5-level progressive hint state machine)
  - Assessment Agent (Pre-hint conceptual code understanding checks)
  - Debugging Coach (Step-by-step state tracing without giving code)

Created: 18/11/2026
"""

import logging
from typing import Literal

from langgraph.graph import END, START, StateGraph

from agents.assessment import AssessmentAgent
from agents.code_analysis import CodeAnalysisAgent
from agents.conversation_manager import ConversationManager
from agents.debugging_coach import DebuggingCoach
from agents.hint_generator import HintGenerator
from agents.memory import StudentMemoryAgent
from agents.socratic_tutor import SocraticTutor
from agents.state import AgentState

logger = logging.getLogger("cognicode.agents.graph")

# Singletons for thread-safe stateless agents
_code_analysis = CodeAnalysisAgent()
_conversation_manager = ConversationManager()
_socratic_tutor = SocraticTutor()
_hint_generator = HintGenerator()
_assessment_agent = AssessmentAgent()
_debugging_coach = DebuggingCoach()
_memory_agent = StudentMemoryAgent()


# --- Node Callables ---
async def code_analysis_node(state: AgentState) -> AgentState:
    return _code_analysis.process(state)


async def memory_node(state: AgentState) -> AgentState:
    profile = _memory_agent.personalize_context(state)
    meta = dict(state.get("metadata") or {})
    meta["student_profile"] = profile
    state["metadata"] = meta
    if profile.get("has_prior_history"):
        summary = profile.get("memory_summary", "")
        existing = state.get("system_guidance", "")
        state["system_guidance"] = f"{existing}\n[Memory Profile]: {summary}".strip()
    return state


async def conversation_manager_node(state: AgentState) -> AgentState:
    return _conversation_manager.process(state)


async def socratic_tutor_node(state: AgentState) -> AgentState:
    return await _socratic_tutor.process(state)


async def hint_generator_node(state: AgentState) -> AgentState:
    return await _hint_generator.process(state)


async def assessment_node(state: AgentState) -> AgentState:
    return await _assessment_agent.process(state)


async def debugging_coach_node(state: AgentState) -> AgentState:
    return await _debugging_coach.process(state)


def route_decision(state: AgentState) -> Literal["socratic_tutor", "hint_generator", "assessment", "debugging_coach"]:
    """
    Conditional routing edge based on intent, pending quiz, or hint flags.
    """
    intent = state.get("intent")

    # If debugging request
    if intent == "debug":
        return "debugging_coach"

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
    graph.add_node("code_analysis", code_analysis_node)
    graph.add_node("memory", memory_node)
    graph.add_node("conversation_manager", conversation_manager_node)
    graph.add_node("socratic_tutor", socratic_tutor_node)
    graph.add_node("hint_generator", hint_generator_node)
    graph.add_node("assessment", assessment_node)
    graph.add_node("debugging_coach", debugging_coach_node)

    # Connect Edges:
    # 1. Parse code AST first
    graph.add_edge(START, "code_analysis")
    # 2. Retrieve student memory & relevant bug traps
    graph.add_edge("code_analysis", "memory")
    # 3. Classify intent with AST & memory metadata available
    graph.add_edge("memory", "conversation_manager")

    # 3. Conditional routing to specialized agent
    graph.add_conditional_edges(
        "conversation_manager",
        route_decision,
        {
            "socratic_tutor": "socratic_tutor",
            "hint_generator": "hint_generator",
            "assessment": "assessment",
            "debugging_coach": "debugging_coach",
        },
    )

    graph.add_edge("socratic_tutor", END)
    graph.add_edge("hint_generator", END)
    graph.add_edge("assessment", END)
    graph.add_edge("debugging_coach", END)

    return graph.compile()


# Compiled singleton graph
tutoring_graph = build_tutoring_graph()
