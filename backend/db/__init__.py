"""
Module: backend.db
Purpose: Database package — exposes ORM base, session utilities,
         and all models.
"""
from db.session import Base, SessionLocal, engine, get_db

from db.models import (
    User,
    InstructorCourse,
    Session,
    Interaction,
    QuizResult,
    Reflection,
    DependencyHistory,
)

__all__ = [
    "Base",
    "SessionLocal",
    "engine",
    "get_db",
    "User",
    "InstructorCourse",
    "Session",
    "Interaction",
    "QuizResult",
    "Reflection",
    "DependencyHistory",
]