"""
Module: backend.db.session
Purpose: PostgreSQL SQLAlchemy engine, session factory, and declarative base.
         Provides a `get_db()` dependency for FastAPI routes.
"""

from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from config import get_settings


settings = get_settings()


def _normalize_postgres_url(raw_url: str) -> str:
    """
    Ensure PostgreSQL URLs use the SQLAlchemy 2.0 `postgresql+psycopg2://` driver.
    Cloud providers (Supabase, Neon, Render, Railway) often issue `postgres://`
    or `postgresql://` URIs.
    """
    url = (raw_url or "").strip()
    if not url:
        raise ValueError(
            "DATABASE_URL is not configured. Set a PostgreSQL connection URI in backend/.env."
        )
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg2://", 1)
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg2://", 1)
    return url


DATABASE_URL = _normalize_postgres_url(settings.database_url)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    echo=False,
    future=True,
)


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
