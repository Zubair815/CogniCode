"""
Shared pytest configuration and isolated database fixtures.

- Adds `backend/` to sys.path so pytest works whether invoked from the
  repository root or from `backend/`.
- Ensures `JWT_SECRET` has a valid test value when tests don't override it.
- Provides an isolated `db_session` fixture using `TEST_DATABASE_URL` when set
  (e.g. PostgreSQL 16 service container in CI), rolling back any nested
  transactions cleanly so tests never leave dirty rows behind.
"""

import os
import sys
from pathlib import Path

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

if not os.environ.get("JWT_SECRET") or len(os.environ.get("JWT_SECRET", "")) < 32:
    os.environ["JWT_SECRET"] = "test_jwt_secret_minimum_32_characters_long_abc123"

os.environ.setdefault("INSTRUCTOR_INVITE_CODE", "test-instructor-invite-code")

from config import get_settings  # noqa: E402
from core.rate_limit import rate_limiter  # noqa: E402


@pytest.fixture(autouse=True)
def _reset_rate_limiter_and_settings():
    """Keep rate-limiter windows and cached settings clean per test."""
    rate_limiter.reset()
    get_settings.cache_clear()
    yield
    rate_limiter.reset()
    get_settings.cache_clear()


@pytest.fixture(scope="session")
def test_db_engine():
    """
    Create a database engine dedicated to integration tests.

    Prefers `TEST_DATABASE_URL` (explicit test database). Only uses the
    configured `DATABASE_URL` if `ALLOW_TESTS_ON_DATABASE_URL=1` is set or
    the target host is localhost/127.0.0.1/postgres.
    """
    test_url = os.environ.get("TEST_DATABASE_URL", "").strip()
    if not test_url:
        cfg_url = get_settings().database_url
        is_local = any(
            h in cfg_url for h in ("localhost", "127.0.0.1", "@postgres:")
        )
        if is_local or os.environ.get("ALLOW_TESTS_ON_DATABASE_URL") == "1":
            test_url = cfg_url

    if not test_url:
        pytest.skip(
            "TEST_DATABASE_URL not set and configured DATABASE_URL is non-local; "
            "skipping DB integration test to protect remote database."
        )

    engine = create_engine(test_url, pool_pre_ping=True, future=True)
    yield engine
    engine.dispose()


@pytest.fixture()
def db_session(test_db_engine):
    """
    Yield an isolated SQLAlchemy session wrapped in a top-level SAVEPOINT
    transaction that rolls back completely after each test.
    """
    connection = test_db_engine.connect()
    transaction = connection.begin()
    TestSession = sessionmaker(
        bind=connection,
        autocommit=False,
        autoflush=False,
        expire_on_commit=False,
    )
    session = TestSession()
    nested = connection.begin_nested()

    @event.listens_for(session, "after_transaction_end")
    def _restart_savepoint(sess, trans):
        nonlocal nested
        if not nested.is_active and connection.in_transaction():
            nested = connection.begin_nested()

    try:
        yield session
    finally:
        session.close()
        if transaction.is_active:
            transaction.rollback()
        connection.close()
