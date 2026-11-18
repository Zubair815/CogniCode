"""
Module: backend.agents.debugging_coach
Purpose: Debugging Coach Agent.

Teaches systematic debugging methodology:
  1. Isolate the discrepancy between actual and expected behavior.
  2. State tracing: inspect variable values step-by-step.
  3. Boundary analysis: evaluate edge cases (0, empty, negative, single element).
  4. Hypothesis testing: prompt the student to test a fix without revealing the solution.

Created: 18/11/2026
"""

import logging
import re

from agents.state import AgentState
from llm import LLMError, get_llm_client

logger = logging.getLogger("cognicode.agents.debugging_coach")

_DEBUGGING_PROMPT = """You are CogniCode's Debugging Coach.
The student is debugging code for topic: {topic}.
Language: {language}.
Code Analysis AST Summary: {ast_summary}.

RULES:
1. You are a Debugging Coach. DO NOT fix the student's code.
2. DO NOT provide the corrected code block.
3. Guide the student to trace their code on a minimal test case (e.g. n=0, n=1, or empty list).
4. Ask a targeted question about what state or variable changes at the failing line.
5. Keep your answer encouraging and concise (2 paragraphs max)."""


class DebuggingCoach:
    """
    Guides students through debugging without fixing code directly.
    """

    def __init__(self, llm_client=None):
        self._llm = llm_client

    async def generate_guidance(self, state: AgentState) -> str:
        client = self._llm or get_llm_client()
        code_meta = state.get("metadata", {}).get("code_analysis", {})
        ast_summary = code_meta.get("summary", "No AST available")

        system_prompt = _DEBUGGING_PROMPT.format(
            topic=state.get("topic", "Programming"),
            language=state.get("preferred_language", "Python"),
            ast_summary=ast_summary,
        )

        user_prompt = f"""Student's debugging query:
\"{state.get('message', '')}\"

Guide the student to find and fix the issue themselves through execution tracing."""

        try:
            resp = await client.generate(
                system_prompt=system_prompt,
                user_message=user_prompt,
                max_tokens=300,
                temperature=0.2,
            )
            text = resp.text

            # Enforce safety filter: no code replacement leakage
            if "```" in text:
                text = re.sub(r"```[\s\S]*?```", "[Code withheld by Debugging Coach. Trace the logic manually.]", text)

            return text
        except LLMError as exc:
            logger.warning("DebuggingCoach LLM error: %s", exc)
            return (
                f"Let's trace this step by step. What is the value of your variables on the first iteration, "
                f"and does your condition behave as expected when given an edge case?"
            )

    async def process(self, state: AgentState) -> AgentState:
        """Agent entry point for debugging guidance."""
        guidance = await self.generate_guidance(state)
        state["response"] = f"**[Debugging Coach 🛠️]**\n\n{guidance}"
        return state
