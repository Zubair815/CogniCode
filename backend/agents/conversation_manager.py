"""
Module: backend.agents.conversation_manager
Purpose: Classifies intent and detects if a student has attempted a problem.

Created: 10/10/2026
Updated: 18/11/2026
"""

import re

from agents.state import AgentState, Intent


# --- Regex Patterns ---
_HINT_PATTERNS = [
    r"\b(hint|clue|nudge|pseudocode|partial code|skeleton|next hint)\b",
    r"\bcan i get a hint\b",
    r"\bshow (me )?(a )?hint\b",
]

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
    r"\bhelp me understand\b",
]

# --- Strict Attempt Detection Patterns ---
_ATTEMPT_PATTERNS = [
    r"```",                   # Code block
    r"\b(i think|i tried|i wrote|my approach|my logic|i guess)\b",
    r"\b(so far|here is|this is what)\b",
    r"def\s+[a-zA-Z_]+",      # Python def
    r"for\s*\(.*\)",          # for loop
    r"while\s*\(.*\)",        # while loop
    r"return\s+",             # return statement
]


class ConversationManager:
    """
    Classifies student messages, detects attempts, and parses hint levels.
    """

    def classify(self, message: str, check_active: bool = False) -> Intent:
        """Classify a single message into an intent."""
        text = message.lower().strip()

        if not text:
            return "other"

        # If answering a pending conceptual check (single letter choice A-D)
        if check_active and re.match(r"^[a-d]$", text):
            return "quiz"

        # Explicit hint request
        if self._matches(text, _HINT_PATTERNS):
            return "hint_request"

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
        Heuristic check to see if the student is demonstrating effort or code.
        """
        text = message.lower().strip()
        intent = self.classify(message)

        # 1. Direct code request? They MUST show code or effort keywords.
        if intent == "code_request":
            return self._matches(text, _ATTEMPT_PATTERNS)

        # 2. Debugging? Usually they pasted code or described error.
        if intent == "debug":
            return True

        # 3. Concept or hint request without code is not a solution attempt.
        if intent in ("concept_question", "hint_request"):
            return self._matches(text, _ATTEMPT_PATTERNS)

        # 4. If code block is present, it's definitely an attempt.
        if "```" in message or self._matches(text, _ATTEMPT_PATTERNS):
            return True

        # 5. Explanations over 50 chars with reasoned thought.
        if len(text) > 50 and any(w in text for w in ("because", "since", "logic", "check", "step")):
            return True

        return False

    def process(self, state: AgentState) -> AgentState:
        """
        Agent entry point — classify intent, detect attempt, and extract hint requests.
        """
        message = state.get("message", "")
        check_active = state.get("understanding_check_required", False)

        intent = self.classify(message, check_active=check_active)
        attempt = self.detect_attempt(message)

        state["intent"] = intent
        state["attempt_detected"] = attempt

        if intent == "hint_request":
            state["hint_requested"] = True
            # Check if specific level requested e.g. "hint 3"
            lvl_match = re.search(r"hint\s*(?:level\s*)?([1-5])", message.lower())
            if lvl_match:
                state["target_hint_level"] = int(lvl_match.group(1))
            else:
                curr = state.get("current_hint_level", 0)
                state["target_hint_level"] = min(5, curr + 1)

        return state

    @staticmethod
    def _matches(text: str, patterns: list[str]) -> bool:
        return any(re.search(p, text) for p in patterns)
