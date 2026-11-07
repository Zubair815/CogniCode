"""
Module: backend.agents.socratic_tutor
Purpose: Generates a Socratic response, utilizing history and attempt status.

Created: 10/10/2026
Updated: 10/10/2026
"""

from agents.state import AgentState
from llm import LLMError, get_llm_client


_SYSTEM_PROMPT_BASE = """You are CogniCode, a strict but patient programming tutor.
Your goal is to help the student LEARN — not to hand them the answer.

The current topic is: {topic}.
The student's preferred language is: {language}.

Here is what you must do based on the student's status:
{instruction}

Keep responses concise (2-4 short paragraphs max). Do not prefix your reply with labels like "CogniCode:"."""

_ATTEMPT_FALSE_INSTRUCTION = """The student has NOT made an attempt yet.
If they are asking for code or a direct solution, you MUST NOT give them the code.
Instead, ask them a guiding question about how they think the problem should be solved. Ask them what they have tried so far or what their initial thoughts are."""

_ATTEMPT_TRUE_INSTRUCTION = """The student HAS made an attempt or is engaging with the concept.
Acknowledge their effort. Guide them towards the next step. If they are stuck, give a small conceptual hint, but try to let them write the final code."""


class SocraticTutor:
    def __init__(self, llm_client=None):
        self._llm = llm_client

    async def generate_response(self, state: AgentState) -> str:
        client = self._llm or get_llm_client()

        attempt = state.get("attempt_detected", False)
        instruction = _ATTEMPT_TRUE_INSTRUCTION if attempt else _ATTEMPT_FALSE_INSTRUCTION

        system_prompt = _SYSTEM_PROMPT_BASE.format(
            topic=state.get("topic", "programming"),
            language=state.get("preferred_language", "Python"),
            instruction=instruction,
        )

        # Format history for the LLM
        history_text = ""
        for msg in state.get("history", []):
            role = "Student" if msg["role"] == "student" else "Tutor"
            history_text += f"{role}: {msg['content']}\n"
        
        if history_text:
            history_text = f"Previous conversation:\n{history_text}\n"

        user_message = f"{history_text}Student's new message: {state.get('message', '')}"

        response = await client.generate(
            system_prompt=system_prompt,
            user_message=user_message,
            max_tokens=300,
            temperature=0.6,
        )

        return response.text

    async def process(self, state: AgentState) -> AgentState:
        try:
            state["response"] = await self.generate_response(state)
        except LLMError as exc:
            state["response"] = (
                "I'm having trouble reaching the AI right now. "
                "Please try again in a moment."
            )
            state["metadata"]["llm_error"] = str(exc)
        return state