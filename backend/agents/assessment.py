"""
Module: backend.agents.assessment
Purpose: Assessment Agent & Conceptual Understanding Checks.

Generates pre-hint verification MCQs and evaluates student answers to ensure
cognitive engagement before unlocking higher-level assistance (Level 3+).

Created: 18/11/2026
"""

import json
import logging
import re
from typing import Any

from agents.state import AgentState, ConceptCheckQuestion
from llm import LLMError, get_llm_client

logger = logging.getLogger("cognicode.agents.assessment")

_CONCEPTUAL_CHECKS_FALLBACK = {
    "recursion": {
        "id": "chk-rec-1",
        "topic": "Recursion",
        "prompt": "What is the primary role of the base case in a recursive function?",
        "code_snippet": "int func(int n) {\n    if (n <= 1) return 1; // Base case\n    return n * func(n - 1);\n}",
        "options": [
            {"id": "A", "text": "To optimize cache memory locality.", "correct": False},
            {"id": "B", "text": "To terminate the recursive call chain and prevent stack overflow.", "correct": True},
            {"id": "C", "text": "To dynamically allocate heap memory for local variables.", "correct": False},
            {"id": "D", "text": "To guarantee O(1) time complexity.", "correct": False},
        ],
        "explanation": "The base case acts as the termination condition that stops further frames from being pushed onto the call stack.",
    },
    "binary tree": {
        "id": "chk-tree-1",
        "topic": "Binary Search Trees",
        "prompt": "Which traversal of a valid Binary Search Tree always outputs elements in non-decreasing sorted order?",
        "code_snippet": None,
        "options": [
            {"id": "A", "text": "Preorder Traversal (Root, Left, Right)", "correct": False},
            {"id": "B", "text": "Inorder Traversal (Left, Root, Right)", "correct": True},
            {"id": "C", "text": "Postorder Traversal (Left, Right, Root)", "correct": False},
            {"id": "D", "text": "Level-order (BFS)", "correct": False},
        ],
        "explanation": "Because all nodes in the left subtree are smaller than root, and all nodes in right subtree are larger, Inorder traversal strictly yields sorted keys.",
    },
    "general": {
        "id": "chk-gen-1",
        "topic": "Algorithmic Invariants",
        "prompt": "Before optimizing an algorithm with dynamic programming, which two properties must the problem exhibit?",
        "code_snippet": None,
        "options": [
            {"id": "A", "text": "Optimal substructure and overlapping subproblems.", "correct": True},
            {"id": "B", "text": "Constant space complexity and monotonic growth.", "correct": False},
            {"id": "C", "text": "Sorted input arrays and hash table collision freedom.", "correct": False},
            {"id": "D", "text": "Depth-first recursive branching and greedy choices.", "correct": False},
        ],
        "explanation": "Dynamic programming applies when the optimal solution can be constructed from optimal sub-solutions, and identical subproblems are solved repeatedly.",
    },
}


class AssessmentAgent:
    """
    Generates and scores conceptual understanding checks.
    """

    def __init__(self, llm_client=None):
        self._llm = llm_client

    def get_or_generate_question(self, topic: str) -> ConceptCheckQuestion:
        """Find matching conceptual check by topic or fallback."""
        key = topic.lower().strip()
        for t_key, check in _CONCEPTUAL_CHECKS_FALLBACK.items():
            if t_key in key:
                return check
        return _CONCEPTUAL_CHECKS_FALLBACK["general"]

    def evaluate_answer(self, question: ConceptCheckQuestion, student_answer: str) -> tuple[bool, str]:
        """
        Evaluate student's answer against the active check question.
        Returns: (is_correct, explanation)
        """
        ans = student_answer.strip().upper()
        correct_opt = next((opt for opt in question["options"] if opt.get("correct")), None)

        if not correct_opt:
            return True, "Check completed."

        # Check single letter choice (e.g. "B") or text substring
        if ans == correct_opt["id"] or correct_opt["text"].lower() in student_answer.lower():
            return True, f"Correct! {question['explanation']}"

        return False, f"Not quite. {question['explanation']}"

    async def process(self, state: AgentState) -> AgentState:
        """
        Evaluate an existing check if student submitted an answer,
        or provide a fresh question if check is required.
        """
        msg = state.get("message", "").strip()

        # If evaluating an answer to a question
        active_q = state.get("quiz_question")
        if active_q and len(msg) <= 4:
            passed, explanation = self.evaluate_answer(active_q, msg)
            state["understanding_check_passed"] = passed
            if passed:
                state["response"] = (
                    f"**[Concept Check Passed! 🎉]**\n\n{explanation}\n\n"
                    "You have demonstrated conceptual understanding. You may now request the Level 3 Pseudocode outline!"
                )
                state["understanding_check_required"] = False
            else:
                state["response"] = (
                    f"**[Concept Check Review Needed]**\n\n{explanation}\n\n"
                    "Take a moment to review this core concept before advancing to higher-level hints."
                )
            return state

        # Otherwise, present the question for the topic
        q = self.get_or_generate_question(state.get("topic", "general"))
        state["quiz_question"] = q
        state["understanding_check_required"] = True

        options_text = "\n".join([f"- **{opt['id']}**: {opt['text']}" for opt in q["options"]])
        snippet_text = f"\n```\n{q['code_snippet']}\n```\n" if q.get("code_snippet") else ""

        state["response"] = (
            f"**[Conceptual Understanding Check: {q['topic']}]**\n\n"
            f"{q['prompt']}\n{snippet_text}\n"
            f"{options_text}\n\n"
            "*(Reply with A, B, C, or D to verify and unlock Level 3+ hints)*"
        )
        return state
