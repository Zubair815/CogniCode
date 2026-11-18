"""
Unit tests for Phase 4: Tree-sitter AST Code Analysis, Debugging Coach, and CDS Telemetry Engine.
"""

import pytest
import asyncio
from datetime import datetime, timezone
from uuid import uuid4

from agents.code_analysis import CodeAnalysisAgent
from agents.debugging_coach import DebuggingCoach
from core.cds_engine import compute_session_score, calculate_session_signals
from db.models import Session, Interaction, User
import db.models
from db.session import Base, engine, SessionLocal
from llm.base import LLMResponse


@pytest.fixture(scope="module")
def setup_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    yield db
    db.close()


def test_code_analysis_ast():
    agent = CodeAnalysisAgent()

    code = """
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)
"""
    report = agent.analyze_python_ast(code)
    assert report["has_code"] is True
    assert report["syntax_valid"] is True
    assert "factorial" in report["functions"]
    assert report["has_recursion"] is True
    assert report["has_base_case"] is True
    assert report["attempt_confidence"] >= 0.8


def test_code_analysis_syntax_error():
    agent = CodeAnalysisAgent()

    malformed_code = """
def broken_fn(x)
    return x + 1
"""
    report = agent.analyze_python_ast(malformed_code)
    assert report["syntax_valid"] is False
    assert len(report["syntax_errors"]) > 0


def test_code_analysis_loops():
    agent = CodeAnalysisAgent()

    loop_code = """
def sum_items(items):
    total = 0
    for x in items:
        total += x
    return total
"""
    report = agent.analyze_python_ast(loop_code)
    assert report["syntax_valid"] is True
    assert report["has_loops"] is True
    assert report["has_recursion"] is False


def test_code_fence_extraction():
    agent = CodeAnalysisAgent()
    markdown_message = """
Here is what I wrote so far:
```python
def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
    return -1
```
Can you tell me why it loops forever?
"""
    extracted = agent.extract_code(markdown_message)
    assert "def binary_search" in extracted
    assert "while left <= right:" in extracted


def test_debugging_coach_no_code_leakage():
    class DummyLLM:
        async def generate(self, user_message=None, system_prompt=None, max_tokens=None, temperature=None):
            return LLMResponse(
                text="Trace line 2 when n=1. What does f(1) return?",
                model="dummy-model",
                provider="dummy",
            )

    coach = DebuggingCoach(llm_client=DummyLLM())
    state = {
        "session_id": "test-session",
        "user_id": "test-user",
        "topic": "Recursion",
        "student_code": "def f(n): return f(n)",
        "messages": [],
        "intent": "debug",
        "attempt_detected": True,
        "metadata": {
            "code_analysis": {"summary": "Infinite recursion detected"}
        }
    }
    guidance = asyncio.run(coach.generate_guidance(state))
    assert len(guidance) > 0
    assert "def " not in guidance.lower()
    assert "trace" in guidance.lower()


def test_cds_engine_scoring(setup_database):
    db = setup_database
    
    # Create mock user and session
    user = User(
        id=uuid4(),
        name="CDS Test Student",
        email=f"test_cds_{uuid4().hex[:6]}@cognicode.edu",
        password_hash="mocked_hash_for_testing",
        role="student",
    )
    db.add(user)
    db.commit()

    session = Session(
        id=uuid4(),
        student_id=user.id,
        topic="Binary Search",
        hint_levels_used=[1, 2],
        solution_requests=1,
    )
    db.add(session)
    db.commit()

    # Add mock interactions
    i1 = Interaction(
        id=uuid4(),
        session_id=session.id,
        student_id=user.id,
        message="I need help with binary search",
        response="What have you tried so far?",
        intent="code_request",
        attempt_detected=True,
        hint_level_given=1,
        timestamp=datetime.now(timezone.utc),
    )
    i2 = Interaction(
        id=uuid4(),
        session_id=session.id,
        student_id=user.id,
        message="Here is my code for midpoint calculation",
        response="Notice what happens when left and right are large numbers.",
        intent="debug",
        attempt_detected=True,
        hint_level_given=2,
        timestamp=datetime.now(timezone.utc),
    )
    db.add_all([i1, i2])
    db.commit()

    score, band, signals = compute_session_score(session, db)
    assert 0.0 <= score <= 100.0
    assert band in ("low", "moderate", "high")
    assert 0.0 <= signals.solution_frequency <= 100.0
    assert 0.0 <= signals.hint_depth <= 100.0
