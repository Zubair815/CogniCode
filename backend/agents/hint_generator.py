"""
Module: backend.agents.hint_generator
Purpose: 5-Level Progressive Hint State Machine.

Levels:
  Level 1: Conceptual Nudge — High-level idea or question; strictly NO code.
  Level 2: Concept Reminder — Algorithmic theorem, invariant, or structure reminder.
  Level 3: Pseudocode — Step-by-step logic outline (gated by understanding check).
  Level 4: Partial Implementation — Code skeleton / function signature with blanks.
  Level 5: Complete Solution — Full working code with walkthrough (last resort).

Created: 18/11/2026
"""

import logging
import re
from typing import Any

from agents.state import AgentState
from llm import LLMError, get_llm_client

logger = logging.getLogger("cognicode.agents.hint_generator")


_HINT_PROMPTS = {
    1: """You are CogniCode providing a LEVEL 1 HINT (Conceptual Nudge).
Topic: {topic}
Language: {language}

RULE:
1. Provide a high-level conceptual nudge or guiding question.
2. ABSOLUTELY NO CODE OR PSEUDOCODE. Do not write keywords like 'def', 'class', 'for', 'while', brackets, or semicolons.
3. Keep it brief (under 3 sentences). Help the student formulate an initial strategy.""",

    2: """You are CogniCode providing a LEVEL 2 HINT (Concept Reminder).
Topic: {topic}
Language: {language}

RULE:
1. Remind the student of the core theoretical concept, invariant, or mathematical rule needed (e.g. base case role in recursion, BST ordering, two-pointer convergence).
2. You may explain the concept conceptually, but DO NOT provide code syntax.
3. Keep it under 2 short paragraphs.""",

    3: """You are CogniCode providing a LEVEL 3 HINT (Pseudocode Outline).
Topic: {topic}
Language: {language}

RULE:
1. Provide a step-by-step algorithmic outline in clean English pseudocode.
2. Example format:
   Step 1: Check if input is empty...
   Step 2: Initialize pointers...
   Step 3: While condition holds...
3. Do NOT provide actual runnable {language} code syntax yet; focus on logical flow.""",

    4: """You are CogniCode providing a LEVEL 4 HINT (Partial Implementation Skeleton).
Topic: {topic}
Language: {language}

RULE:
1. Provide a code skeleton in {language} with function headers, parameter types, and comments.
2. Leave the critical inner logic as `# TODO: student fill in here` or comment placeholders.
3. Explain the purpose of each section without solving the entire problem for them.""",

    5: """You are CogniCode providing a LEVEL 5 HINT (Complete Solution Walkthrough).
Topic: {topic}
Language: {language}

RULE:
1. Provide the complete, working, well-commented solution in {language}.
2. Explain the time and space complexity.
3. Remind the student to reflect on what prevented them from solving it independently before moving to the next problem."""
}


class HintGenerator:
    """
    Manages the 5-level progressive hint state machine and policy gates.
    """

    def __init__(self, llm_client=None):
        self._llm = llm_client

    def calculate_next_level(self, state: AgentState) -> tuple[int, bool]:
        """
        Determine the next allowable hint level based on policy gates.
        Returns: (allowable_level, requires_understanding_check)
        """
        current = state.get("current_hint_level", 0)
        target = state.get("target_hint_level") or (current + 1 if state.get("hint_requested") else current)
        attempt_detected = state.get("attempt_detected", False)
        check_passed = state.get("understanding_check_passed", False)

        # Cap between 1 and 5
        target = max(1, min(5, target))

        # Gate 1: If jumping to Level 3 or higher, require understanding check or verified attempt
        if target >= 3 and not check_passed and not attempt_detected:
            # Cannot advance to Level 3 without check or attempt
            return min(2, max(1, current)), True

        # Gate 2: If jumping to Level 4 or 5 without any attempt, throttle to Level 2 or 3
        if target >= 4 and not attempt_detected:
            return min(3, max(1, current)), False

        return target, False

    async def generate_hint(self, state: AgentState, level: int) -> str:
        """Invoke LLM to produce a hint strictly adhering to the level prompt."""
        client = self._llm or get_llm_client()
        system_prompt = _HINT_PROMPTS.get(level, _HINT_PROMPTS[1]).format(
            topic=state.get("topic", "Programming"),
            language=state.get("preferred_language", "Python"),
        )

        user_prompt = f"""Student's question or current attempt:
\"{state.get('message', '')}\"

Please generate the Level {level} hint."""

        try:
            resp = await client.generate(
                system_prompt=system_prompt,
                user_message=user_prompt,
                max_tokens=350,
                temperature=0.2,
            )
            text = resp.text

            # Enforce safety filter for Levels 1 and 2 (no code leakage)
            if level in (1, 2):
                if "```" in text or re.search(r"\bdef\s+[a-zA-Z_]+", text):
                    # Sanitize code blocks
                    text = re.sub(r"```[\s\S]*?```", "[Code withheld for Level 1/2 hint. Focus on the concept.]", text)

            return text
        except LLMError as exc:
            logger.warning("HintGenerator LLM error: %s", exc)
            return f"Here is a guidance nudge for {state.get('topic')}: consider what initial conditions or invariants must hold true before each step."

    async def process(self, state: AgentState) -> AgentState:
        """Agent entry point for progressive hint generation."""
        level, needs_check = self.calculate_next_level(state)

        if needs_check and not state.get("understanding_check_passed"):
            state["understanding_check_required"] = True
            state["target_hint_level"] = 3
            state["current_hint_level"] = min(2, state.get("current_hint_level", 0))
            state["response"] = (
                "Before unlocking the Level 3 Pseudocode outline, let's verify your conceptual understanding! "
                "Please answer the concept check question below to confirm you grasp the core invariant."
            )
            return state

        hint_text = await self.generate_hint(state, level)
        state["current_hint_level"] = level
        state["hint_content"] = hint_text
        state["response"] = f"**[Hint Level {level}/5 — {_level_title(level)}]**\n\n{hint_text}"
        return state


def _level_title(level: int) -> str:
    titles = {
        1: "Conceptual Nudge",
        2: "Concept Reminder",
        3: "Pseudocode Outline",
        4: "Partial Implementation",
        5: "Complete Solution Walkthrough",
    }
    return titles.get(level, "Hint")
