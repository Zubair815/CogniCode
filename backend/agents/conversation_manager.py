"""
Module: backend.agents.conversation_manager
Purpose: Classifies student intent and detects whether the student has made a
         genuine problem-solving attempt (via code, explicit reasoning, or by
         answering the Tutor's Socratic guiding question).

Created: 10/10/2026
Updated: 18/11/2026
"""

import re

from agents.state import AgentState, ChatMessage, Intent


# --- Regex Patterns (Ordered by specificity) ---
_QUIZ_PATTERNS = [
    r"\bquiz\b",
    r"\btest me\b",
    r"\bask me (a|some) question",
]

_DEBUG_PATTERNS = [
    r"\b(not working|doesn'?t work|isn'?t working|broken|fails|failing|error|bug|traceback|exception|segfault)\b",
    r"\bwhy (does|is|isn'?t|doesn'?t)\b.*\b(work|fail|error|bug|crash)\b",
    r"\bmy code\b",
    r"\bdebug\b",
]

_CODE_REQUEST_PATTERNS = [
    r"\b(write|give|show|provide|implement|code|create|generate|build)\b.*\b(code|function|method|class|implementation|implimentation|program|solution|algorithm|script)\b",
    r"\b(can you|could you|please)\s+(write|give|show|provide|implement|code|solve)\b",
    r"\bgive me (the )?(answer|solution|code)\b",
    r"\bhow (to|do i|can i|would i) (write|implement|code|program)\b",
    r"\bsolve (this|it) for me\b",
]

_CONCEPT_PATTERNS = [
    r"^\s*(what|why|how|when|where|which)\b",
    r"\b(explain|teach me|clarify|describe)\b",
    r"\bwhat (is|are|does)\b",
    r"\bdifference between\b",
    r"\bhelp me understand\b",
    r"\b(give|tell|teach)\s+me\s+(the\s+)?concept",
    r"\bfrom scratch\b",
    r"\b(don'?t|do not)\s+know\s+(the\s+)?(concept|basics|idea|anything|how)",
]

# --- Excuses / Non-Attempt Bypass Phrases ---
_EXCUSE_OR_DEMAND_PATTERNS = [
    r"\b(don'?t|do not)\s+know\b",
    r"\bno idea\b",
    r"\bsubmit\s+(my\s+)?assignment\b",
    r"\bdue\s+(today|tonight|now|soon)\b",
    r"\bjust\s+(give|tell|write|show)\s+me\b",
]

# --- Genuine Attempt Detection Patterns ---
_CODE_SYNTAX_PATTERNS = [
    r"```",                                              # Fenced code block
    r"\bdef\s+[a-zA-Z_]\w*\s*\(",                        # Python function definition
    r"\bclass\s+[a-zA-Z_]\w*",                           # Class definition
    r"\b(for|while)\s*\(.+\)",                           # C/Java/JS loop
    r"\bfor\s+[a-zA-Z_]\w*\s+in\s+",                     # Python for-in loop
    r"\bwhile\s+[^:?]+:",                                # Python while loop
    r"\bif\s+[^:?]+:\s*\n",                              # Python multiline if
    r"\breturn\s+[a-zA-Z0-9_\[\(\'\"]",                  # Return statement
    r"\b(int|void|double|float|string|bool|public|private|static)\s+[a-zA-Z_]\w*\s*\(",  # Typed function
    r"[a-zA-Z_]\w*\s*(\[[^\]]+\])?\s*=\s*[^=\n]+;\s*",   # Semicolon assignment
    r"=>|->|\.next\b|\.left\b|\.right\b|\.append\(",     # Pointer / data structure ops
]

_REASONING_PATTERNS = [
    r"\b(i think|i tried|i wrote|my approach|my logic|my idea|i guess|my solution|my attempt)\b",
    r"\b(so far i|here is my|this is what i)\b",
    r"\b(we (need|have|should|can|would) to|i (need|have|should|would) to)\b",
    r"\b(keep track of|step\s*1|first\s+we|iterate|loop\s+through|compare|swap|base\s+case|two\s+pointers|recursively|time\s+complexity|o\([n1log\s\^2]+\))\b",
]

# Domain vocabulary that signals a student is answering a Socratic question about CS/programming
_DOMAIN_REASONING_TERMS = (
    r"\b(key|keys|value|values|pair|pairs|index|indices|bucket|buckets|hash|hashing|"
    r"collision|array|list|node|nodes|pointer|pointers|next|prev|previous|current|head|tail|"
    r"shift|shifting|insert|inserting|delete|deleting|remove|removing|search|lookup|traverse|"
    r"loop|iterate|iteration|swap|compare|element|elements|stack|queue|tree|graph|sort|"
    r"recursion|recursive|base\s+case|variable|variables|function|return|condition|if|else)\b"
)


class ConversationManager:
    """
    Central router that classifies student input into an intent category
    and determines whether a genuine cognitive/coding attempt is present.
    """

    def classify(self, message: str) -> Intent:
        """
        Classify a single message into an intent.

        Priority order:
          1. quiz             — explicit quiz/self-test requests
          2. debug            — debugging / error-fixing requests
          3. code_request     — requests to write/generate code
          4. concept_question — conceptual questions or "teach me from scratch"
          5. other            — student reasoning replies / follow-ups
        """
        text = message.lower().strip()
        if not text:
            return "other"

        if self._matches(text, _QUIZ_PATTERNS):
            return "quiz"
        if self._matches(text, _DEBUG_PATTERNS):
            return "debug"
        if self._matches(text, _CODE_REQUEST_PATTERNS):
            return "code_request"
        if self._matches(text, _CONCEPT_PATTERNS):
            return "concept_question"

        return "other"

    def detect_attempt(
        self,
        message: str,
        message_type: str = "chat",
        history: list[ChatMessage] | None = None,
    ) -> bool:
        """
        Determine whether THIS message demonstrates a genuine attempt:
        1. Concrete code syntax or code_submission mode.
        2. Explicit algorithmic reasoning / hypothesis ("I think...", "we need to...", etc.).
        3. Answering a Socratic question from the Tutor using programming/algorithmic concepts.
        """
        text = message.strip()
        if not text:
            return False

        lower = text.lower()

        # 1. Explicit code submission mode with actual code/multiline content
        if message_type == "code_submission" and len(text) >= 10:
            if self._matches(text, _CODE_SYNTAX_PATTERNS) or "\n" in text:
                return True

        # 2. Concrete code syntax in regular chat
        if self._matches(text, _CODE_SYNTAX_PATTERNS) or self._matches(
            lower, _CODE_SYNTAX_PATTERNS
        ):
            return True

        # If the message is just an excuse ("I don't know, I have to submit assignment now")
        # or a direct demand for code/concept without code syntax, it is NOT an attempt.
        if self._matches(lower, _EXCUSE_OR_DEMAND_PATTERNS):
            return False

        intent = self.classify(message)
        if intent in ("code_request", "concept_question", "quiz"):
            # Pure question or code request without code syntax — check if they also included reasoning
            return self._matches(lower, _REASONING_PATTERNS) and bool(
                re.search(_DOMAIN_REASONING_TERMS, lower)
            )

        # 3. Explicit reasoning phrases with domain terms (e.g., "i need to keep track of their keys in form of pointers")
        if self._matches(lower, _REASONING_PATTERNS) and len(lower.split()) >= 4:
            if re.search(_DOMAIN_REASONING_TERMS, lower):
                return True

        # 4. Socratic dialogue response: Tutor already asked a question in history, and student
        #    replies (`intent == "other"`) with domain/algorithmic concepts (e.g., "to insert new pair
        #    of element we have to shift from the current index to next one only" or "yes we need to shift the elements").
        has_tutor_turn = any(m.get("role") == "assistant" for m in (history or []))
        if has_tutor_turn and intent == "other" and len(lower.split()) >= 4:
            domain_hits = re.findall(_DOMAIN_REASONING_TERMS, lower)
            if len(domain_hits) >= 1:
                return True

        return False

    def process(self, state: AgentState) -> AgentState:
        """
        Agent entry point — classify intent and compute cumulative attempt state.
        """
        message = state.get("message", "")
        message_type = state.get("message_type", "chat")
        history = state.get("history") or []

        intent = self.classify(message)
        current_attempt = self.detect_attempt(
            message, message_type=message_type, history=history
        )

        prior_attempt = bool(state.get("prior_attempt_exists", False)) or any(
            bool(m.get("attempt_detected"))
            for m in history
        )

        state["intent"] = intent
        state["current_turn_attempt"] = current_attempt
        state["prior_attempt_exists"] = prior_attempt
        state["attempt_detected"] = current_attempt or prior_attempt
        return state

    @staticmethod
    def _matches(text: str, patterns: list[str]) -> bool:
        return any(
            re.search(p, text, flags=re.IGNORECASE | re.DOTALL)
            for p in patterns
        )
