# <agent> agent — to be implemented

"""
Module: backend.agents.conversation_manager
Purpose: Classifies the intent of a student's message.

         Phase 1 implementation uses a lightweight rule-based
         classifier. This is intentional:
           - Fast (no LLM call needed just to classify)
           - Deterministic (testable)
           - Free (no API cost)

         In Phase 2, we will introduce an LLM-based classifier
         that runs as a fallback when the rule-based approach is
         uncertain. The public interface (classify()) will not
         change, so callers are unaffected.

         Intents recognized:
           - concept_question : "what is a linked list?"
           - code_request     : "write me a function that..."
           - debug            : "my code is not working", "why does this fail?"
           - quiz             : "quiz me on X"
           - other            : anything else

Created: 10/10/2026
"""

import re

from agents.state import AgentState, Intent


# --- Keyword patterns ---
# Lowercased patterns matched against the student's message.
# Order matters: more specific patterns first.

_CODE_REQUEST_PATTERNS = [
    r"\b(write|give|show|provide)\s+(me\s+)?(a\s+)?(the\s+)?(code|function|implementation|program|solution)",
    r"\b(can you|could you)\s+(write|give|show|provide)",
    r"\b(implement|code)\s+(this|that|it|the)",
    r"\bgive me the (answer|solution|code)\b",
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


class ConversationManager:
    """
    Classifies student messages into intents.

    Stateless — safe to instantiate once and reuse.
    """

    def classify(self, message: str) -> Intent:
        """
        Classify a single message.

        Args:
            message: The raw student message.

        Returns:
            One of: concept_question, code_request, debug, quiz, other.
        """
        text = message.lower().strip()

        if not text:
            return "other"

        # Order: most specific → least specific.
        # Debug before code_request: "why is my code failing" should not
        # be treated as a code request.
        if self._matches(text, _QUIZ_PATTERNS):
            return "quiz"
        if self._matches(text, _DEBUG_PATTERNS):
            return "debug"
        if self._matches(text, _CONCEPT_PATTERNS):
            return "concept_question"
        if self._matches(text, _CODE_REQUEST_PATTERNS):
            return "code_request"

        return "other"

    def process(self, state: AgentState) -> AgentState:
        """
        Agent entry point — classify the message in state and return
        the updated state.
        """
        state["intent"] = self.classify(state.get("message", ""))
        return state

    @staticmethod
    def _matches(text: str, patterns: list[str]) -> bool:
        return any(re.search(p, text) for p in patterns)