"""
Module: backend.db.models
Purpose: SQLAlchemy ORM models for CogniCode.
         All tables, columns, relationships, and constraints
         are defined here — one source of truth for the schema.
Author: Abdullah (BSEF23M526)
Created: 2026-02-20
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import relationship

from db.session import Base


# =============================================================================
# ENUM VALUES
# =============================================================================
# Using string enums so values are stable across DB migrations.

USER_ROLES = ("student", "instructor")
DEPENDENCY_BANDS = ("low", "moderate", "high")
INTERACTION_INTENTS = ("concept", "code_request", "debug", "quiz")


# =============================================================================
# USERS
# =============================================================================
class User(Base):
    """
    Represents both students and instructors.

    The `role` column differentiates behavior. Common fields (name,
    email, password_hash) live here; role-specific data lives in
    relationship tables or nullable columns.
    """

    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(Text, nullable=False)
    role = Column(Enum(*USER_ROLES, name="user_role"), nullable=False)

    # Optional for PUCIT-affiliated users (students/instructors).
    # NULL for independent learners.
    pucit_id = Column(String(20), unique=True, nullable=True, index=True)

    preferred_language = Column(String(50), default="Python", nullable=False)
    institution = Column(String(200), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # --- Relationships ---
    sessions = relationship("Session", back_populates="student", cascade="all, delete-orphan")
    reflections = relationship("Reflection", back_populates="student", cascade="all, delete-orphan")
    quiz_results = relationship("QuizResult", back_populates="student", cascade="all, delete-orphan")
    dependency_history = relationship("DependencyHistory", back_populates="student", cascade="all, delete-orphan")
    taught_courses = relationship("InstructorCourse", back_populates="instructor", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("length(name) >= 2", name="users_name_min_length"),
    )

    def __repr__(self) -> str:
        return f"<User {self.email} ({self.role})>"


# =============================================================================
# INSTRUCTOR COURSES (Enrollment mapping)
# =============================================================================
class InstructorCourse(Base):
    """
    Maps an instructor to a course and its enrolled students.

    A student can be enrolled in multiple courses; an instructor
    can teach multiple courses. Enrollment is via course code —
    no separate join table needed since we store UUIDs in an array.
    """

    __tablename__ = "instructor_courses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    instructor_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    course_name = Column(String(200), nullable=False)
    course_code = Column(String(20), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)

    # Array of student UUIDs enrolled in this course.
    # PostgreSQL-native ARRAY — simple and fast for our scale (<200 students).
    enrolled_students = Column(ARRAY(UUID(as_uuid=True)), default=list, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # --- Relationships ---
    instructor = relationship("User", back_populates="taught_courses")

    def __repr__(self) -> str:
        return f"<InstructorCourse {self.course_code} — {self.course_name}>"


# =============================================================================
# SESSIONS
# =============================================================================
class Session(Base):
    """
    A single tutoring session between a student and CogniCode.

    A session begins when a student starts a new topic and ends
    when they submit their reflection. Stores aggregated signals
    used to compute the Cognitive Dependency Score.
    """

    __tablename__ = "sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    topic = Column(String(200), nullable=False)

    started_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    ended_at = Column(DateTime(timezone=True), nullable=True)

    # Aggregated session metrics (populated as the session progresses).
    dependency_score = Column(Float, default=0.0, nullable=False)
    dependency_band = Column(Enum(*DEPENDENCY_BANDS, name="dependency_band"), nullable=True)
    hint_levels_used = Column(ARRAY(Integer), default=list, nullable=False)
    solution_requests = Column(Integer, default=0, nullable=False)
    retry_count = Column(Integer, default=0, nullable=False)
    debugging_attempts = Column(Integer, default=0, nullable=False)

    reflection_stored = Column(Boolean, default=False, nullable=False)

    # --- Relationships ---
    student = relationship("User", back_populates="sessions")
    interactions = relationship("Interaction", back_populates="session", cascade="all, delete-orphan")
    quiz_results = relationship("QuizResult", back_populates="session", cascade="all, delete-orphan")
    reflection = relationship("Reflection", back_populates="session", uselist=False, cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Session {self.id} topic={self.topic}>"


# =============================================================================
# INTERACTIONS
# =============================================================================
class Interaction(Base):
    """
    A single message exchange within a session.

    Every student message + system response is logged here for
    audit trail, memory agent, and CDS computation.
    """

    __tablename__ = "interactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    message = Column(Text, nullable=False)
    response = Column(Text, nullable=False)

    intent = Column(Enum(*INTERACTION_INTENTS, name="interaction_intent"), nullable=True)
    attempt_detected = Column(Boolean, default=False, nullable=False)
    hint_level_given = Column(Integer, nullable=True)  # 0–5, NULL if not a hint
    time_since_last = Column(Integer, nullable=True)   # seconds since previous interaction

    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # --- Relationships ---
    session = relationship("Session", back_populates="interactions")

    def __repr__(self) -> str:
        return f"<Interaction {self.id} intent={self.intent}>"


# =============================================================================
# QUIZ RESULTS
# =============================================================================
class QuizResult(Base):
    """
    Stores the result of a concept quiz taken at the end of a topic.

    Quiz scores are one of the six signals used in the CDS formula.
    """

    __tablename__ = "quiz_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, index=True)

    topic = Column(String(200), nullable=False)
    score = Column(Integer, nullable=False)          # correct answers
    total_questions = Column(Integer, nullable=False)
    passed = Column(Boolean, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # --- Relationships ---
    student = relationship("User", back_populates="quiz_results")
    session = relationship("Session", back_populates="quiz_results")

    __table_args__ = (
        CheckConstraint("score >= 0 AND score <= total_questions", name="quiz_score_valid_range"),
    )

    def __repr__(self) -> str:
        return f"<QuizResult {self.score}/{self.total_questions}>"


# =============================================================================
# REFLECTIONS
# =============================================================================
class Reflection(Base):
    """
    Mandatory end-of-session reflection entries.

    Reflections are immutable once stored — audit trail requirement (BR-12).
    Minimum 20-word enforcement is done at the API layer, not here.
    """

    __tablename__ = "reflections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, unique=True)

    learned_today = Column(Text, nullable=False)
    mistake_to_avoid = Column(Text, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # --- Relationships ---
    student = relationship("User", back_populates="reflections")
    session = relationship("Session", back_populates="reflection")

    def __repr__(self) -> str:
        return f"<Reflection session={self.session_id}>"


# =============================================================================
# DEPENDENCY HISTORY
# =============================================================================
class DependencyHistory(Base):
    """
    Daily snapshots of a student's CDS score for trend charts.

    One row per student per day. Populated by a scheduled job or
    on session end. Trend dashboard reads from here.
    """

    __tablename__ = "dependency_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    date = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    score = Column(Float, nullable=False)
    band = Column(Enum(*DEPENDENCY_BANDS, name="dependency_band_history"), nullable=False)
    session_count = Column(Integer, default=0, nullable=False)

    # --- Relationships ---
    student = relationship("User", back_populates="dependency_history")

    __table_args__ = (
        UniqueConstraint("student_id", "date", name="dependency_history_unique_per_day"),
        CheckConstraint("score >= 0 AND score <= 100", name="dependency_score_valid_range"),
    )

    def __repr__(self) -> str:
        return f"<DependencyHistory {self.student_id} {self.date} score={self.score}>"