"""
Unit tests for Phase 5: Long-term Vector Memory, Reflection Agent, and Instructor Analytics.
"""

import asyncio
from uuid import uuid4
import pytest

from agents.memory import StudentMemoryAgent
from agents.reflection import ReflectionAgent
from agents.graph import tutoring_graph
from agents.state import new_state
from db.models import Base, Session, User
from db.session import SessionLocal, engine
from vector.chroma_client import ChromaVectorStore


@pytest.fixture(scope="module")
def setup_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    yield db
    db.close()


def test_chroma_vector_store(tmp_path):
    store = ChromaVectorStore(persist_dir=str(tmp_path / "chroma_test"))
    assert store.is_ready() is True

    # Test adding and querying student memory
    doc_id = store.add_student_memory(
        student_id="student-test-1",
        topic="Recursion",
        content="Student struggled with recursion base case when n is 0",
        metadata={"hint_level": 3},
    )
    assert len(doc_id) > 0

    results = store.query_student_memory(
        student_id="student-test-1",
        query="recursion base case",
        limit=2,
    )
    assert len(results) >= 1
    assert "Recursion" in results[0]["metadata"]["topic"]


def test_student_memory_agent(tmp_path):
    store = ChromaVectorStore(persist_dir=str(tmp_path / "chroma_mem"))
    agent = StudentMemoryAgent(vector_store=store)

    # Store initial learning
    agent.record_session_learning(
        student_id="student-mem-42",
        topic="Binary Search",
        learned_today="Binary search requires array to be sorted first and left <= right",
        mistake_to_avoid="Did not check mid overflow and used left < right",
    )

    state = {
        "user_id": "student-mem-42",
        "topic": "Binary Search",
        "student_code": "def bs(arr, t): left, right = 0, len(arr)",
        "messages": [],
        "metadata": {},
    }

    context = agent.personalize_context(state)
    assert context["has_prior_history"] is True
    assert "Binary Search" in context["memory_summary"]


def test_reflection_agent_draft():
    agent = ReflectionAgent()
    draft = asyncio.run(
        agent.generate_draft(
            topic="Dynamic Programming",
            hint_levels=[1, 2, 3],
            cds_score=45.0,
            cds_band="moderate",
            ast_summary="Contains memoization table dictionary",
        )
    )
    assert len(draft["learned_today"]) >= 100
    assert len(draft["mistake_to_avoid"]) >= 100


def test_reflection_agent_save(setup_database):
    db = setup_database
    agent = ReflectionAgent()

    user = User(
        id=uuid4(),
        name="Reflection Test Student",
        email=f"refl_student_{uuid4().hex[:6]}@cognicode.edu",
        password_hash="mock_hash_for_test",
        role="student",
    )
    db.add(user)
    db.commit()

    sess = Session(
        id=uuid4(),
        student_id=user.id,
        topic="Graph BFS",
        hint_levels_used=[1, 2],
        dependency_score=35.0,
        dependency_band="low",
    )
    db.add(sess)
    db.commit()

    learned = "Today I learned that Breadth First Search uses a queue to visit neighboring nodes in layer-by-layer radial traversal."
    avoid = "I will avoid forgetting to mark nodes as visited before pushing them into the FIFO queue to prevent infinite cycles."

    saved = agent.save_reflection(
        db_session=db,
        student_id=user.id,
        session_id=sess.id,
        topic="Graph BFS",
        learned_today=learned,
        mistake_to_avoid=avoid,
    )
    assert saved.id is not None
    assert len(saved.learned_today) >= 100
    assert len(saved.mistake_to_avoid) >= 100

    # Verify session marked as reflection stored
    db.refresh(sess)
    assert sess.reflection_stored is True


def test_graph_with_memory_node():
    state = new_state(
        student_id="test-student-mem",
        session_id="test-session-mem",
        topic="Recursion",
        message="Can you give me a nudge on recursion?",
    )
    state["hint_requested"] = True

    result = asyncio.run(tutoring_graph.ainvoke(state))
    assert result is not None
    # Verify memory node ran and attached profile
    assert "student_profile" in result.get("metadata", {})
