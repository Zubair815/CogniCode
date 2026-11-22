"""
Module: backend.db.session
Purpose: SQLAlchemy engine, session factory, and declarative base.
         Provides a `get_db()` dependency for FastAPI routes.
         Supports both local SQLite and cloud PostgreSQL (Supabase, Neon, Render, Railway).
"""

from typing import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from config import get_settings


settings = get_settings()


def _normalize_database_url(raw_url: str) -> str:
    """
    Ensure PostgreSQL URLs use the SQLAlchemy 2.0 `postgresql+psycopg2://` scheme.
    Many cloud providers (Render, Heroku, Supabase, Neon) issue `postgres://` URLs.
    """
    url = (raw_url or "").strip()
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg2://", 1)
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg2://", 1)
    return url or "sqlite:///./cognicode.db"


DATABASE_URL = _normalize_database_url(settings.database_url)

engine = create_engine(
    DATABASE_URL,
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


SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
    class_=Session,
)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""
    pass


def get_db() -> Generator[Session, None, None]:
    """
    Yield a database session for the duration of a request.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
