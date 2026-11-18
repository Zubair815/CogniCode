"""
Module: backend.agents.socratic_tutor
Purpose: Generates a Socratic response, utilizing history and attempt status.

Created: 10/10/2026
Updated: 10/10/2026
"""

import re
from agents.state import AgentState
from llm import LLMError, get_llm_client


_SYSTEM_PROMPT = """You are CogniCode, a strict AI programming tutor.
The topic is: {topic}.
The student's language is: {language}.

Current Status: {status}

RULES:
1. You are the Tutor. Do NOT roleplay as the student.
2. Read the history and respond ONLY to the Student's latest message.
3. {no_code_rule}
4. Keep responses short (2-3 paragraphs max)."""


_JAILBREAK_PATTERNS = [
    r"ignore\s+(all\s+|previous\s+|your\s+)?(instructions|rules|prompts|guidelines)",
    r"system\s+(prompt|override|reset)",
    r"developer\s+mode",
    r"dan\s+mode",
    r"unrestricted\s+(ai|model|assistant|compiler|interpreter)",
    r"pretend\s+you\s+(are|can)",
    r"disregard\s+(all\s+)?(rules|instructions)",
    r"bypass\s+(safety|guardrails|socratic)",
]


class SocraticTutor:
    def __init__(self, llm_client=None):
        self._llm = llm_client

    def detect_adversarial_jailbreak(self, message: str) -> bool:
        """Detect prompt injection, roleplay bypass, or instruction overrides."""
        msg_lower = message.lower()
        for pattern in _JAILBREAK_PATTERNS:
            if re.search(pattern, msg_lower):
                return True
        return False

    async def generate_response(self, state: AgentState) -> str:
        student_message = state.get("message", "")

        # 1. 🛡️ Adversarial Jailbreak Defense
        if self.detect_adversarial_jailbreak(student_message):
            return (
                "I see what you're trying to do! As your CogniCode tutor, my role is to help you "
                "build mental models and independent problem-solving skills rather than executing system bypasses. "
                "Let's refocus on the problem: what invariant or logic step are you currently working through?"
            )

        client = self._llm or get_llm_client()

        attempt = state.get("attempt_detected", False)
        
        if attempt:
            status = "ATTEMPT DETECTED"
            no_code_rule = "The student has made an attempt. Acknowledge their effort and guide them to the next step. You may show small code snippets if necessary."
        else:
            status = "NO ATTEMPT YET"
            no_code_rule = "CRITICAL: The student has NOT made an attempt. YOU MUST REFUSE TO PROVIDE CODE. Do NOT output any code blocks. Instead, ask a guiding Socratic question about how they think the problem should be solved."

        system_prompt = _SYSTEM_PROMPT.format(
            topic=state.get("topic", "Programming"),
            language=state.get("preferred_language", "Python"),
            status=status,
            no_code_rule=no_code_rule
        )

        history_text = ""
        for msg in state.get("history", []):
            role = "Student" if msg["role"] == "student" else "Tutor"
            history_text += f"[{role}]: {msg['content']}\n"
        
        user_message = f"""=== CHAT HISTORY ===
{history_text}
=== END HISTORY ===

Here is my latest message as the Student:
"{state.get('message', '')}"

(Respond to this latest message as the Tutor):"""

        response = await client.generate(
            system_prompt=system_prompt,
            user_message=user_message,
            max_tokens=250,
            temperature=0.2,
        )

        response_text = response.text

        # ==========================================
        # 🚨 ANTI-CODE SAFETY FILTER (Only if no attempt)
        # ==========================================
        if not attempt:
            # Check if LLM leaked code (looks for ``` or python def or print()
            has_code_block = "```" in response_text
            has_python_def = re.search(r"\bdef\s+[a-zA-Z_]+", response_text) is not None
            has_brackets = re.search(r"\{\s*\n", response_text) is not None # C/Java style

            if has_code_block or has_python_def or has_brackets:
                # LLM broke the rule! We reject this response.
                # Return a hardcoded fallback Socratic question instead.
                return (
                    "I cannot give you the code just yet. Before I help, "
                    "tell me: how do you think we should approach this problem? "
                    "What steps or loops do you think we need?"
                )

        return response_text

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