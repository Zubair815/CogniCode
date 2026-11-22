"""
Module: backend.vector.chroma_client
Purpose: ChromaDB vector client for student long-term memory and bug trap catalog.

Features:
  - Persistent disk storage for cross-session student personalization
  - Collections for:
      * student_memories: misconceptions, cognitive style, past reflections
      * bug_traps: recurring algorithmic bug patterns and Socratic probes
  - Defensive fallback: returns graceful empty results if Chroma fails.

Created: 18/11/2026
"""

import hashlib
import logging
import os
from typing import Any, Optional
from uuid import uuid4

import chromadb
from chromadb.api.types import Documents, EmbeddingFunction, Embeddings
from chromadb.config import Settings as ChromaSettings

from config import get_settings

logger = logging.getLogger("cognicode.vector.chroma")


class FastLocalEmbeddingFunction(EmbeddingFunction[Documents]):
    """
    Lightweight, deterministic local embedding function requiring zero downloads.
    Runs 100% offline and generates 32-dimensional float vectors from text.
    """

    def __init__(self):
        pass

    @staticmethod
    def name() -> str:
        return "fast_local"

    def get_config(self) -> dict:
        return {}

    @staticmethod
    def build_from_config(config: dict) -> "FastLocalEmbeddingFunction":
        return FastLocalEmbeddingFunction()

    def __call__(self, input: Documents) -> Embeddings:
        embeddings = []
        for text in input:
            vec = []
            for i in range(32):
                h = hashlib.sha256(f"{i}:{text}".encode("utf-8")).digest()
                val = (int.from_bytes(h[:4], "little") / 4294967295.0) * 2.0 - 1.0
                vec.append(float(val))
            embeddings.append(vec)
        return embeddings


class ChromaVectorStore:
    """Persistent ChromaDB client wrapper for CogniCode."""

    def __init__(self, persist_dir: Optional[str] = None):
        settings = get_settings()
        self.persist_dir = persist_dir or settings.chroma_persist_dir
        os.makedirs(self.persist_dir, exist_ok=True)
        self._embed_fn = FastLocalEmbeddingFunction()

        try:
            self.client = chromadb.PersistentClient(
                path=self.persist_dir,
                settings=ChromaSettings(anonymized_telemetry=False),
            )
            self._student_col = self.client.get_or_create_collection(
                name="student_memories",
                metadata={"description": "Cross-session student cognitive memory"},
                embedding_function=self._embed_fn,
            )
            self._bugs_col = self.client.get_or_create_collection(
                name="bug_traps",
                metadata={"description": "Known bug patterns and Socratic probes"},
                embedding_function=self._embed_fn,
            )
            self._ready = True
            logger.info("ChromaDB vector store initialized at %s", self.persist_dir)
            self._seed_default_bug_traps()
        except Exception as exc:
            logger.error("Failed to initialize ChromaDB: %s", exc)
            self._ready = False

    def is_ready(self) -> bool:
        return self._ready

    def add_student_memory(
        self,
        student_id: str,
        topic: str,
        content: str,
        metadata: Optional[dict[str, Any]] = None,
    ) -> str:
        """Store a student's misconception, takeaway, or learning preference."""
        if not self._ready or not content.strip():
            return ""

        doc_id = str(uuid4())
        meta = {
            "student_id": str(student_id),
            "topic": topic,
            **(metadata or {}),
        }

        try:
            self._student_col.add(
                ids=[doc_id],
                documents=[content.strip()],
                metadatas=[meta],
            )
            return doc_id
        except Exception as exc:
            logger.warning("Error storing student memory in Chroma: %s", exc)
            return ""

    def query_student_memory(
        self,
        student_id: str,
        query: str,
        limit: int = 3,
    ) -> list[dict[str, Any]]:
        """Retrieve historical student memories relevant to the current conversation."""
        if not self._ready or not query.strip():
            return []

        try:
            results = self._student_col.query(
                query_texts=[query],
                n_results=limit,
                where={"student_id": str(student_id)},
            )
            docs = results.get("documents", [[]])[0]
            metas = results.get("metadatas", [[]])[0]
            distances = results.get("distances", [[]])[0] if "distances" in results else []

            out = []
            for idx, doc in enumerate(docs):
                meta = metas[idx] if idx < len(metas) else {}
                dist = distances[idx] if idx < len(distances) else None
                out.append({
                    "content": doc,
                    "metadata": meta,
                    "distance": dist,
                })
            return out
        except Exception as exc:
            logger.warning("Error querying student memory in Chroma: %s", exc)
            return []

    def add_bug_trap(self, topic: str, pattern: str, socratic_probe: str) -> str:
        """Store a known bug trap and pedagogical probe."""
        if not self._ready:
            return ""

        doc_id = str(uuid4())
        try:
            self._bugs_col.add(
                ids=[doc_id],
                documents=[pattern.strip()],
                metadatas={"topic": topic, "probe": socratic_probe},
            )
            return doc_id
        except Exception as exc:
            logger.warning("Error adding bug trap: %s", exc)
            return ""

    def find_relevant_bug_traps(self, topic: str, code_snippet: str, limit: int = 2) -> list[dict[str, Any]]:
        """Find matching bug traps given student code snippet."""
        if not self._ready or not code_snippet.strip():
            return []

        try:
            results = self._bugs_col.query(
                query_texts=[code_snippet],
                n_results=limit,
            )
            docs = results.get("documents", [[]])[0]
            metas = results.get("metadatas", [[]])[0]

            out = []
            for idx, doc in enumerate(docs):
                meta = metas[idx] if idx < len(metas) else {}
                out.append({
                    "pattern": doc,
                    "topic": meta.get("topic", topic),
                    "probe": meta.get("probe", ""),
                })
            return out
        except Exception as exc:
            logger.warning("Error querying bug traps: %s", exc)
            return []

    def _seed_default_bug_traps(self):
        """Seed initial high-frequency bug traps for foundational topics."""
        try:
            count = self._bugs_col.count()
            if count > 0:
                return

            seed_traps = [
                (
                    "Recursion",
                    "Missing base case or base case never reached; recursive call doesn't decrement n",
                    "What happens to your input on each recursive call? Trace what happens when n reaches 0.",
                ),
                (
                    "Binary Search",
                    "Off-by-one in binary search boundary; while left < right instead of left <= right or mid calculation overflow",
                    "What happens when the target is at the very first or very last index? Walk through arr=[5] with target=5.",
                ),
                (
                    "Linked List",
                    "Dereferencing null pointer or lost head reference while traversing node.next",
                    "Before accessing node.next.val, what check guarantees that node.next is not None?",
                ),
                (
                    "Dynamic Programming",
                    "Subproblem state overlapping without memoization table, leading to exponential 2^n time",
                    "Notice how many times the same subproblem is recomputed. How can you store previous results?",
                ),
            ]

            ids = [str(uuid4()) for _ in seed_traps]
            docs = [t[1] for t in seed_traps]
            metas = [{"topic": t[0], "probe": t[2]} for t in seed_traps]
            self._bugs_col.add(ids=ids, documents=docs, metadatas=metas)
            logger.info("Seeded %d foundational bug traps into ChromaDB", len(seed_traps))
        except Exception as exc:
            logger.warning("Failed to seed bug traps: %s", exc)


_store_instance: Optional[ChromaVectorStore] = None


def get_vector_store() -> ChromaVectorStore:
    """Singleton accessor for vector store."""
    global _store_instance
    if _store_instance is None:
        _store_instance = ChromaVectorStore()
    return _store_instance
