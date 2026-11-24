"""
Module: backend.agents.socratic_tutor
Purpose: Intent-aware Socratic Tutor that uses native multi-turn conversation
         messages, adapts guidance to student intent, evaluates student answers
         for conceptual accuracy, and gates code until understanding is verified.

Created: 10/10/2026
Updated: 18/11/2026
"""

import re
from agents.state import AgentState
from llm import LLMError, get_llm_client


_BASE_SYSTEM_PROMPT = """You are CogniCode, an expert Socratic AI programming tutor for university computer science students.
Current Topic: {topic}
Preferred Programming Language: {language}

CORE TEACHING PRINCIPLES:
1. NEVER repeat a paragraph or example you already gave in an earlier message. Read the conversation history carefully and always move the conversation forward.
2. Be technically accurate in Computer Science (for example: a Hash Table uses a hash function to compute an index `hash(key) % size` for O(1) average lookup/insert/delete and handles collisions via chaining or open addressing—it does NOT shift array elements like a plain dynamic array).
3. Adapt to the student's current intent:
   - If the student asks for a CONCEPT explanation ("what is...", "from scratch", "I don't know the concept"): Explain the core intuition clearly in 1-2 short paragraphs with a concrete mini-example (no code dump), then ask ONE simple question to check their understanding.
   - If the student replies to your question with an answer or attempt: First tell them what is right in their answer and gently correct any misconception (e.g. confusing array shifting with hash bucket mapping), then guide them to the next logical step or ask the next deeper question.
   - If the student demands CODE before demonstrating understanding/attempt: Do not provide full code; break the problem into a small step and ask how they would handle that step.
   - Once the student has demonstrated understanding/attempt and asks for implementation help: Provide concise, step-by-step guidance or a short illustrative snippet (3-8 lines) and ask them how they would complete or test it.
4. Keep every response concise (1-2 short paragraphs, under 140 words) and end with ONE clear question."""


def _turn_instruction(intent: str, attempt: bool, current_turn_attempt: bool, topic: str) -> str:
    """
    Build a concise per-turn pedagogical instruction appended to the latest
    user turn so the system prompt remains cache-friendly while strictly
    steering the model for this turn.
    """
    if intent == "concept_question":
        return (
            f"[Tutor Instruction: The student is asking to understand the concept of {topic}. "
            "Explain the core mechanism accurately and simply (without giving full program code), "
            "do NOT repeat any earlier text, and end with 1 short question to check if they understood.]"
        )

    if intent == "code_request" and not attempt:
        return (
            f"[Tutor Instruction: The student is requesting code for {topic} without having shown "
            "an attempt or understanding yet. Do NOT output code blocks (` ``` `). Briefly state the "
            "core idea needed and ask 1 specific guiding question so they think through the logic first.]"
        )

    if intent == "code_request" and attempt:
        return (
            f"[Tutor Instruction: The student has already engaged with {topic} and is now asking for "
            "implementation guidance. Acknowledge what we discussed so far, show a small skeleton or "
            "key 3-6 line snippet for the core step (not the entire assignment), and ask how they "
            "would handle the remaining case.]"
        )

    if intent == "debug":
        if not attempt:
            return (
                "[Tutor Instruction: The student wants debugging help but hasn't shared code or details yet. "
                "Ask them to paste their code snippet and describe the error or unexpected output.]"
            )
        return (
            "[Tutor Instruction: Act as a Debugging Coach. Point the student to the specific variable, "
            "condition, or boundary they should inspect, and ask what value it holds—do not rewrite their whole code.]"
        )

    if intent == "quiz":
        return (
            f"[Tutor Instruction: Ask the student 1 clear conceptual or trace question about {topic} "
            "to test their understanding.]"
        )

    # intent == "other" (Student is replying to the tutor's question or making a statement)
    if current_turn_attempt or attempt:
        return (
            "[Tutor Instruction: The student is answering your previous question! "
            "1) Directly evaluate their statement—praise what is accurate, and if they stated a misconception "
            "(such as thinking hash tables shift array elements instead of computing `hash(key) % capacity`), "
            "kindly correct it in 1-2 sentences. "
            "2) Do NOT repeat your previous example. Move to the next step and ask 1 follow-up question.]"
        )

    return (
        f"[Tutor Instruction: The student has not attempted the question yet. Reassure them, break {topic} "
        "down into a very simple intuition or 2-choice question, and do NOT repeat your previous message.]"
    )


class SocraticTutor:
    def __init__(self, llm_client=None):
        self._llm = llm_client

    @staticmethod
    def _contains_leaked_code(text: str) -> bool:
        """
        Detect whether an LLM response leaked a multi-line program implementation.
        Ignores short conceptual diagrams or inline expressions.
        """
        # Check if there is a fenced code block containing actual code statements
        for match in re.finditer(r"```(?:\w+)?\n(.*?)```", text, flags=re.DOTALL):
            block = match.group(1)
            if re.search(
                r"\b(def\s+\w+|class\s+\w+|for\s+.+:|while\s+.+:|return\s+|public\s+|int\s+\w+\s*\()",
                block,
            ):
                return True
        if re.search(r"(?m)^\s*def\s+[a-zA-Z_]\w*\s*\([^)]*\)\s*:", text):
            return True
        if re.search(r"(?m)^\s*class\s+[a-zA-Z_]\w*.*:", text):
            return True
        return False

    @staticmethod
    def _strip_leaked_code(text: str, topic: str) -> str:
        """
        If the LLM included a code block when `attempt_detected` is False,
        strip only the code block while preserving the tutor's explanation
        and guiding question (never repeating a static canned paragraph).
        """
        cleaned = re.sub(
            r"```(?:\w+)?\n.*?```",
            "",
            text,
            flags=re.DOTALL,
        ).strip()
        # Also remove raw `def ...:` blocks if unfenced
        cleaned = re.sub(
            r"(?ms)^\s*def\s+[a-zA-Z_]\w*\s*\([^)]*\)\s*:.*",
            "",
            cleaned,
        ).strip()

        if len(cleaned) >= 40:
            if "?" not in cleaned:
                cleaned += f"\n\nBefore we write the code for {topic}, how would you describe the main step in your own words?"
            return cleaned

        return (
            f"Before we jump into the code for {topic}, let's make sure the core logic is clear: "
            f"what input does this operation take, and what should happen to the data structure step by step?"
        )

    async def generate_response(self, state: AgentState) -> str:
        client = self._llm or get_llm_client()

        topic = state.get("topic") or "Programming"
        language = state.get("preferred_language") or "Python"
        intent = state.get("intent") or "other"
        attempt = bool(state.get("attempt_detected", False))
        current_turn_attempt = bool(state.get("current_turn_attempt", False))

        system_prompt = _BASE_SYSTEM_PROMPT.format(
            topic=topic,
            language=language,
        )

        # Build native multi-turn conversation messages so the LLM has real memory
        messages: list[dict[str, str]] = []
        for msg in state.get("history", []):
            role = "user" if msg.get("role") == "student" else "assistant"
            content = (msg.get("content") or "").strip()
            if content:
                messages.append({"role": role, "content": content})

        instruction = _turn_instruction(
            intent=intent,
            attempt=attempt,
            current_turn_attempt=current_turn_attempt,
            topic=topic,
        )
        latest_user_content = f"{state.get('message', '').strip()}\n\n{instruction}"
        messages.append({"role": "user", "content": latest_user_content})

        response = await client.generate(
            system_prompt=system_prompt,
            user_message=latest_user_content,
            max_tokens=220,
            temperature=0.35,
            messages=messages,
        )

        if response.elapsed_seconds is not None:
            state.setdefault("metadata", {})["elapsed_seconds"] = response.elapsed_seconds

        response_text = response.text.strip()
        response_text = re.sub(
            r"^\s*\[?(?:Tutor|Assistant)\]?\s*:\s*",
            "",
            response_text,
            flags=re.IGNORECASE,
        )
        # Strip any echoed [Tutor Instruction: ...] tag if the model repeated it
        response_text = re.sub(
            r"\[Tutor Instruction:.*?\]",
            "",
            response_text,
            flags=re.DOTALL | re.IGNORECASE,
        ).strip()

        # Enforce Anti-Code Safety Guard ONLY when no attempt has been made
        if not attempt and self._contains_leaked_code(response_text):
            state.setdefault("metadata", {})["anti_code_filtered"] = True
            return self._strip_leaked_code(response_text, topic)

        return response_text

    async def process(self, state: AgentState) -> AgentState:
        try:
            state["response"] = await self.generate_response(state)
        except LLMError as exc:
            state["response"] = (
                "I'm having trouble reaching the AI model right now. "
                "Please check that your LLM service is running and try again."
            )
            state.setdefault("metadata", {})["llm_error"] = str(exc)
        return state
