"""
Unit tests for ConversationManager and SocraticTutor (Phase 2).
"""

import asyncio
import sys
from pathlib import Path
from typing import Optional

BACKEND_DIR = Path(__file__).resolve().parents[2] / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from agents.conversation_manager import ConversationManager  # noqa: E402
from agents.socratic_tutor import SocraticTutor  # noqa: E402
from agents.state import new_state  # noqa: E402
from llm.base import LLMClient, LLMResponse  # noqa: E402


class _StubLLMClient(LLMClient):
    def __init__(self, reply: str):
        self._reply = reply
        self.last_messages: Optional[list[dict[str, str]]] = None

    async def generate(
        self,
        system_prompt: str,
        user_message: str,
        max_tokens: int = 1024,
        temperature: float = 0.7,
        messages: Optional[list[dict[str, str]]] = None,
    ) -> LLMResponse:
        self.last_messages = messages
        return LLMResponse(
            text=self._reply,
            model="stub-model",
            provider="stub",
            elapsed_seconds=0.05,
        )

    async def is_available(self) -> bool:
        return True


def test_intent_classification_code_and_concept_priority():
    cm = ConversationManager()
    assert cm.classify("How do I write bubble sort code in Python?") == "code_request"
    assert cm.classify("Now give me code implimetation for adding deleting a new element of an array") == "code_request"
    assert cm.classify("What is a hash map?") == "concept_question"
    assert cm.classify("Give me concept from scratch") == "concept_question"
    assert cm.classify("i dont know the concepts i am to submit assignment right know") == "concept_question"
    assert cm.classify("My code is throwing an IndexError on line 4") == "debug"
    assert cm.classify("Quiz me on recursion") == "quiz"


def test_attempt_detection_blocks_filler_and_detects_socratic_answers():
    cm = ConversationManager()
    # Excuses / filler must NOT count as an attempt
    assert cm.detect_attempt("i dont know the concepts i am to submit assignment right know") is False
    assert cm.detect_attempt("My code doesn't work, please fix it for me") is False

    # Student answering a Socratic question with domain reasoning MUST count as an attempt
    history = [
        {"role": "student", "content": "Give me code for hash tables"},
        {"role": "assistant", "content": "What variables or keys would you keep track of?"},
    ]
    assert (
        cm.detect_attempt(
            "i need to keep track of therir keys in form of pointers",
            history=history,
        )
        is True
    )
    assert (
        cm.detect_attempt(
            "to insert new pair of element we have to shift from the currnt index to next one only",
            history=history,
        )
        is True
    )
    assert cm.detect_attempt("def reverse(head):\n    prev = None") is True


def test_cumulative_session_attempt_persists_across_turns():
    cm = ConversationManager()
    history = [
        {
            "role": "student",
            "content": "I think each node's next pointer should point to prev.",
            "attempt_detected": True,
        },
        {
            "role": "assistant",
            "content": "Spot on! What happens to the rest of the list when you overwrite next?",
        },
    ]
    state = new_state(
        student_id="stu-1",
        session_id="sess-1",
        topic="Linked Lists",
        message="What should I check next?",
        history=history,
    )
    out = cm.process(state)
    assert out["current_turn_attempt"] is False
    assert out["attempt_detected"] is True


def test_socratic_tutor_passes_native_multiturn_messages_and_strips_leaked_code():
    leaked_llm = _StubLLMClient(
        "To implement a hash table, we map each key to an index using a hash function.\n"
        "```python\ndef insert(table, key, val):\n    table[hash(key)] = val\n```\n"
        "How do you think we should handle two keys that map to the same index?"
    )
    tutor = SocraticTutor(llm_client=leaked_llm)
    history = [
        {"role": "student", "content": "What is a hash table?"},
        {"role": "assistant", "content": "A hash table stores key-value pairs using a hash function."},
    ]
    state = new_state(
        student_id="stu-1",
        session_id="sess-1",
        topic="Hash Tables",
        message="Give me code for hash tables",
        history=history,
    )
    state["intent"] = "code_request"
    state["attempt_detected"] = False

    out = asyncio.run(tutor.process(state))
    assert "```" not in out["response"]
    assert "How do you think we should handle two keys" in out["response"]
    assert out["metadata"].get("anti_code_filtered") is True
    # Verify native multi-turn messages were sent to the LLM client
    assert leaked_llm.last_messages is not None
    assert len(leaked_llm.last_messages) == 3
    assert leaked_llm.last_messages[0]["role"] == "user"
    assert leaked_llm.last_messages[1]["role"] == "assistant"
    assert leaked_llm.last_messages[2]["role"] == "user"


def test_socratic_tutor_allows_inline_braces_in_conceptual_explanation():
    clean_llm = _StubLLMClient(
        "A set or dictionary in Python is written like {1, 2, 3}.\n"
        "How do you think a hash function decides which bucket a key goes into?"
    )
    tutor = SocraticTutor(llm_client=clean_llm)
    state = new_state(
        student_id="stu-1",
        session_id="sess-1",
        topic="Hash Tables",
        message="What is a hash map?",
    )
    state["intent"] = "concept_question"
    state["attempt_detected"] = False

    out = asyncio.run(tutor.process(state))
    assert out["metadata"].get("anti_code_filtered") is None
    assert "{1, 2, 3}" in out["response"]
