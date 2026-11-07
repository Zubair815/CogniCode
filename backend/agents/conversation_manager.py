"""
Module: backend.agents.conversation_manager
Purpose: Classifies intent and detects if a student has attempted a problem.

Created: 10/10/2026
Updated: 10/10/2026
"""

import re

from agents.state import AgentState, Intent


# --- Regex Patterns ---
_CODE_REQUEST_PATTERNS = [
    r"\b(write|give|show|provide|implement|code|create)\b.*\b(code|function|implementation|program|solution|algorithm|script)\b",
    r"\b(can you|could you)\s+(write|give|show|provide|implement|code)",
    r"\bgive me the (answer|solution|code)\b",
    r"\bhow to (write|implement|code|do)\b",
]

_DEBUG_PATTERNS = [
    r"\b(not working|doesn'?t work|isn'?t working|broken|fails|failing|error|bug)\b",
    r"\bwhy (does|is|isn'?t|doesn'?t)\b.*\b(work|fail|error|bug)\b",
    r"\bmy code\b",
    r"\bdebug\b",
]

_QUIZ_PATTERNS = [
    r"\bquiz\b",
    r"\btest me\b",
    r"\bask me (a|some) question",
]

_CONCEPT_PATTERNS = [
    r"^\s*(what|why|how|when|where|which)\b",
    r"\bexplain\b",
    r"\bwhat (is|are|does)\b",
    r"\bdifference between\b",
]

# --- Strict Attempt Detection Patterns ---
# Student MUST show actual code or explicit effort words.
_ATTEMPT_PATTERNS = [
    r"```",                   # Code block
    r"\b(i think|i tried|i wrote|my approach|my logic|i guess)\b",
    r"\b(so far|here is|this is what)\b",
    r"def\s+[a-zA-Z_]+",      # Python def
    r"for\s*\(.*\)",          # for loop
    r"while\s*\(.*\)",        # while loop
]


class ConversationManager:
    """
    Classifies student messages and detects attempts.
    """

    def classify(self, message: str) -> Intent:
        """Classify a single message into an intent."""
        text = message.lower().strip()

        if not text:
            return "other"

        # Order matters
        if self._matches(text, _QUIZ_PATTERNS):
            return "quiz"
        if self._matches(text, _DEBUG_PATTERNS):
            return "debug"
        if self._matches(text, _CONCEPT_PATTERNS):
            return "concept_question"
        if self._matches(text, _CODE_REQUEST_PATTERNS):
            return "code_request"

        return "other"

    def detect_attempt(self, message: str) -> bool:
        """
        Heuristic check to see if the student is making an effort.
        """
        text = message.lower().strip()
        
        intent = self.classify(message)

        # 1. Direct code request? They MUST show code/effort keywords.
        if intent == "code_request":
            return self._matches(text, _ATTEMPT_PATTERNS)

        # 2. Debugging? Usually they pasted code or described error.
        if intent == "debug":
            return True

        # 3. Concept question? Not solving a specific problem.
        if intent == "concept_question":
            return False

        # 4. "Other" intents: if it's a long explanation, give them the benefit of the doubt.
        if len(text) > 40:
            return True

        return False

    def process(self, state: AgentState) -> AgentState:
        """
        Agent entry point — classify intent and detect attempt.
        """
        message = state.get("message", "")
        state["intent"] = self.classify(message)
        state["attempt_detected"] = self.detect_attempt(message)
        return state

    @staticmethod
    def _matches(text: str, patterns: list[str]) -> bool:
        return any(re.search(p, text) for p in patterns)