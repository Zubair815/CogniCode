"""
Module: backend.db.session
Purpose: SQLAlchemy engine, session factory, and declarative base.
         Provides a `get_db()` dependency for FastAPI routes.
Author: Abdullah (BSEF23M526)
Created: 10/10/2026
"""

from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy import event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from config import get_settings


# Load settings once at module import time.
settings = get_settings()


# --- Engine ---
# `pool_pre_ping=True` verifies connections before use — prevents
# "server closed the connection unexpectedly" errors on stale pools.
# `echo=False` in production; set True temporarily to log SQL.
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    echo=False,
    future=True,
)

if engine.dialect.name == "sqlite":
    @event.listens_for(engine, "connect")
    def _enable_sqlite_foreign_keys(connection, _record):
        cursor = connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


# --- Session Factory ---
# `autocommit=False` and `autoflush=False` are the recommended defaults
# for explicit transaction control in FastAPI.
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
    class_=Session,
)


# --- Declarative Base ---
# All ORM models inherit from this Base.
class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""
    pass


# --- FastAPI Dependency ---
def get_db() -> Generator[Session, None, None]:
    """
    Yield a database session for the duration of a request.

    Ensures the session is always closed, even if an exception
    occurs during request handling.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
