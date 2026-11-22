"""
Module: backend.agents.memory
Purpose: Student Long-Term Memory Agent for personalizing tutoring sessions.

Leverages ChromaDB vector embeddings and relational history to personalize
hint scaffolding and recall previous misconceptions.

Created: 18/11/2026
"""

import logging
from typing import Any

from agents.state import AgentState
from vector.chroma_client import get_vector_store

logger = logging.getLogger("cognicode.agents.memory")


class StudentMemoryAgent:
    """
    Retrieves and manages cross-session student memory.
    """

    def __init__(self, vector_store=None):
        self._store = vector_store or get_vector_store()

    def personalize_context(self, state: AgentState) -> dict[str, Any]:
        """
        Queries past student learning signals to formulate personalized tutoring context.
        """
        student_id = str(state.get("student_id") or state.get("user_id") or "")
        topic = state.get("topic", "Programming")
        code_meta = (state.get("metadata") or {}).get("code_analysis") or {}
        student_code = state.get("student_code") or code_meta.get("code_raw") or ""

        if not student_id:
            return {}

        # 1. Query past memories for this student on this topic
        memories = self._store.query_student_memory(
            student_id=student_id,
            query=f"Student struggles, misconceptions, and takeaways on {topic}",
            limit=2,
        )

        # 2. Query relevant bug traps if code is present
        bug_traps = []
        if student_code:
            bug_traps = self._store.find_relevant_bug_traps(
                topic=topic,
                code_snippet=student_code,
                limit=1,
            )

        context_notes = []
        for mem in memories:
            doc = mem.get("content", "").strip()
            if doc:
                context_notes.append(f"- Previous session note: {doc}")

        for trap in bug_traps:
            probe = trap.get("probe", "").strip()
            if probe:
                context_notes.append(f"- Relevant cognitive probe: {probe}")

        memory_summary = "\n".join(context_notes) if context_notes else "First time session on this topic."

        return {
            "has_prior_history": len(memories) > 0,
            "memory_summary": memory_summary,
            "memories": memories,
            "bug_traps": bug_traps,
        }

    def record_session_learning(
        self,
        student_id: str,
        topic: str,
        learned_today: str,
        mistake_to_avoid: str,
    ) -> bool:
        """
        Stores end-of-session takeaways in persistent vector memory.
        """
        try:
            content = f"Topic: {topic}. Learned: {learned_today}. Avoid: {mistake_to_avoid}."
            doc_id = self._store.add_student_memory(
                student_id=student_id,
                topic=topic,
                content=content,
                metadata={"learned": learned_today[:100], "avoid": mistake_to_avoid[:100]},
            )
            return bool(doc_id)
        except Exception as exc:
            logger.warning("Failed to record student session memory: %s", exc)
            return False
