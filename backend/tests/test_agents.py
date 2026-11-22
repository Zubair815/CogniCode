"""
Tests for Phase 3 Multi-Agent Tutoring & Hint State Machine.
"""

import asyncio
from agents.conversation_manager import ConversationManager
from agents.hint_generator import HintGenerator
from agents.assessment import AssessmentAgent
from agents.graph import tutoring_graph
from agents.state import new_state


def test_intent_classification():
    cm = ConversationManager()
    assert cm.classify("can you write the code for me?") == "code_request"
    assert cm.classify("give me a hint") == "hint_request"
    assert cm.classify("my code is not working with an error") == "debug"
    assert cm.classify("what is recursion?") == "concept_question"
    assert cm.classify("b", check_active=True) == "quiz"


def test_attempt_detection():
    cm = ConversationManager()
    # Code block indicates attempt
    assert cm.detect_attempt("```python\ndef solve(): pass\n```") is True
    # Reasoned attempt
    assert cm.detect_attempt("I tried using a while loop with a counter but it failed") is True
    # Bare question is NOT an attempt
    assert cm.detect_attempt("Can you give me the solution?") is False


def test_hint_generator_gating():
    hg = HintGenerator()
    
    # State with no attempt trying to jump to Level 3
    state = new_state("s1", "sess1", "Recursion", "hint 3")
    state["target_hint_level"] = 3
    state["attempt_detected"] = False
    state["understanding_check_passed"] = False
    
    lvl, needs_check = hg.calculate_next_level(state)
    # Must require understanding check before Level 3
    assert needs_check is True
    assert lvl <= 2

    # If understanding check is passed, can advance
    state["understanding_check_passed"] = True
    lvl2, needs_check2 = hg.calculate_next_level(state)
    assert lvl2 == 3
    assert needs_check2 is False


def test_assessment_evaluation():
    assessor = AssessmentAgent()
    q = assessor.get_or_generate_question("Recursion")
    assert q["topic"] == "Recursion"
    
    # Correct answer for recursion base case is B
    is_correct, explanation = assessor.evaluate_answer(q, "B")
    assert is_correct is True
    assert "terminat" in explanation.lower()

    # Incorrect answer
    is_wrong, _ = assessor.evaluate_answer(q, "A")
    assert is_wrong is False


def test_tutoring_graph_routing():
    # Turn 1: Hint request routes to hint generator
    state = new_state("s1", "sess1", "Recursion", "give me a hint")
    res = asyncio.run(tutoring_graph.ainvoke(state))
    assert res.get("intent") == "hint_request"
    assert res.get("current_hint_level") == 1
    assert "Hint Level 1/5" in res.get("response", "")
