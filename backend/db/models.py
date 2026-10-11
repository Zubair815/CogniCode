"""
Module: backend.db.models
Purpose: SQLAlchemy ORM models for CogniCode.
         All tables, columns, relationships, and constraints
         are defined here — one source of truth for the schema.

         Data-integrity strategy:
         - ACID "C" (Consistency) is enforced at the DATABASE level,
           not only at the API layer. CheckConstraints and Unique
           constraints reject invalid data even if the application
           has a bug or is bypassed.
         - ForeignKeys use ON DELETE CASCADE so parent deletion
           atomically removes children (ACID "A").
         - UUID primary keys avoid sequence contention under
           concurrency (ACID "I").
         - server_default=func.now() delegates timestamps to the DB
           so they survive app restarts (ACID "D").

Author: Abdullah (BSEF23M526)
Created: 2026-02-20
"""

import uuid
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
# Using named PostgreSQL enums so values are stable across migrations
# and visible in DB introspection tools.

USER_ROLES = ("student", "instructor")
DEPENDENCY_BANDS = ("low", "moderate", "high")
INTERACTION_INTENTS = ("concept", "code_request", "debug", "quiz")

# Bounds used in CheckConstraints — kept as constants to avoid
# magic numbers scattered across the file.
CDS_MIN = 0.0
CDS_MAX = 100.0
HINT_LEVEL_MIN = 0
HINT_LEVEL_MAX = 5


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

    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # --- Relationships ---
    sessions = relationship(
        "Session", back_populates="student", cascade="all, delete-orphan"
    )
    reflections = relationship(
        "Reflection", back_populates="student", cascade="all, delete-orphan"
    )
    quiz_results = relationship(
        "QuizResult", back_populates="student", cascade="all, delete-orphan"
    )
    dependency_history = relationship(
        "DependencyHistory", back_populates="student", cascade="all, delete-orphan"
    )
    taught_courses = relationship(
        "InstructorCourse", back_populates="instructor", cascade="all, delete-orphan"
    )

    # --- Integrity Constraints (ACID "C") ---
    __table_args__ = (
        CheckConstraint(
            "length(name) >= 2",
            name="users_name_min_length",
        ),
        # PostgreSQL case-insensitive email regex. Rejects obvious
        # malformed emails at the DB level, providing defense in
        # depth behind Pydantic validation.
        CheckConstraint(
            r"email ~* '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$'",
            name="users_email_format",
        ),
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
    instructor_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    course_name = Column(String(200), nullable=False)
    course_code = Column(String(20), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)

    # Array of student UUIDs enrolled in this course.
    # PostgreSQL-native ARRAY — simple and fast at our scale.
    enrolled_students = Column(
        ARRAY(UUID(as_uuid=True)), default=list, nullable=False
    )

    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # --- Relationships ---
    instructor = relationship("User", back_populates="taught_courses")

    # --- Integrity Constraints (ACID "C") ---
    __table_args__ = (
        CheckConstraint(
            "length(course_name) >= 3",
            name="instructor_courses_name_min_length",
        ),
        # Course codes are uppercase alphanumeric with hyphens
        # (e.g., CS301, OOP-B, DS-A1). This keeps codes URL-safe
        # and predictable when displayed to students.
        CheckConstraint(
            r"course_code ~ '^[A-Z0-9\-]+$'",
            name="instructor_courses_code_format",
        ),
    )

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
    student_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    topic = Column(String(200), nullable=False)

    started_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    ended_at = Column(DateTime(timezone=True), nullable=True)

    # --- Aggregated session metrics (populated as session progresses) ---
    dependency_score = Column(Float, default=0.0, nullable=False)
    dependency_band = Column(
        Enum(*DEPENDENCY_BANDS, name="dependency_band"), nullable=True
    )
    hint_levels_used = Column(ARRAY(Integer), default=list, nullable=False)
    solution_requests = Column(Integer, default=0, nullable=False)
    retry_count = Column(Integer, default=0, nullable=False)
    debugging_attempts = Column(Integer, default=0, nullable=False)

    reflection_stored = Column(Boolean, default=False, nullable=False)

    # --- Relationships ---
    student = relationship("User", back_populates="sessions")
    interactions = relationship(
        "Interaction", back_populates="session", cascade="all, delete-orphan"
    )
    quiz_results = relationship(
        "QuizResult", back_populates="session", cascade="all, delete-orphan"
    )
    reflection = relationship(
        "Reflection",
        back_populates="session",
        uselist=False,
        cascade="all, delete-orphan",
    )

    # --- Integrity Constraints (ACID "C") ---
    __table_args__ = (
        CheckConstraint(
            f"dependency_score >= {CDS_MIN} AND dependency_score <= {CDS_MAX}",
            name="session_cds_valid_range",
        ),
        CheckConstraint(
            "solution_requests >= 0",
            name="session_solution_requests_non_negative",
        ),
        CheckConstraint(
            "retry_count >= 0",
            name="session_retry_count_non_negative",
        ),
        CheckConstraint(
            "debugging_attempts >= 0",
            name="session_debugging_attempts_non_negative",
        ),
    )

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
    session_id = Column(
        UUID(as_uuid=True),
        ForeignKey("sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    student_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    message = Column(Text, nullable=False)
    response = Column(Text, nullable=False)

    intent = Column(
        Enum(*INTERACTION_INTENTS, name="interaction_intent"), nullable=True
    )
    attempt_detected = Column(Boolean, default=False, nullable=False)
    hint_level_given = Column(Integer, nullable=True)  # 0–5, NULL if not a hint
    time_since_last = Column(Integer, nullable=True)   # seconds since previous interaction

    timestamp = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # --- Relationships ---
    session = relationship("Session", back_populates="interactions")

    # --- Integrity Constraints (ACID "C") ---
    __table_args__ = (
        CheckConstraint(
            f"hint_level_given IS NULL OR "
            f"(hint_level_given >= {HINT_LEVEL_MIN} AND "
            f"hint_level_given <= {HINT_LEVEL_MAX})",
            name="interaction_hint_level_valid_range",
        ),
        CheckConstraint(
            "time_since_last IS NULL OR time_since_last >= 0",
            name="interaction_time_since_last_non_negative",
        ),
    )

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
    student_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    session_id = Column(
        UUID(as_uuid=True),
        ForeignKey("sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    topic = Column(String(200), nullable=False)
    score = Column(Integer, nullable=False)          # correct answers
    total_questions = Column(Integer, nullable=False)
    passed = Column(Boolean, nullable=False)

    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # --- Relationships ---
    student = relationship("User", back_populates="quiz_results")
    session = relationship("Session", back_populates="quiz_results")

    # --- Integrity Constraints (ACID "C") ---
    __table_args__ = (
        CheckConstraint(
            "score >= 0 AND score <= total_questions",
            name="quiz_score_valid_range",
        ),
        CheckConstraint(
            "total_questions > 0",
            name="quiz_total_questions_positive",
        ),
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
    Minimum 20-word enforcement is done at the API layer; the DB enforces
    a minimum character count as defense in depth (BR-05).
    """

    __tablename__ = "reflections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    session_id = Column(
        UUID(as_uuid=True),
        ForeignKey("sessions.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )

    learned_today = Column(Text, nullable=False)
    mistake_to_avoid = Column(Text, nullable=False)

    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # --- Relationships ---
    student = relationship("User", back_populates="reflections")
    session = relationship("Session", back_populates="reflection")

    # --- Integrity Constraints (ACID "C") ---
    # BR-05: reflection responses must be at least 20 words.
    # We approximate "20 words" as 100 characters at the DB level
    # (a 5-char avg per word). The API enforces the exact 20-word
    # count; the DB constraint is a backstop.
    __table_args__ = (
        CheckConstraint(
            "length(learned_today) >= 100",
            name="reflection_learned_min_length",
        ),
        CheckConstraint(
            "length(mistake_to_avoid) >= 100",
            name="reflection_mistake_min_length",
        ),
    )

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
    student_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    date = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    score = Column(Float, nullable=False)
    band = Column(
        Enum(*DEPENDENCY_BANDS, name="dependency_band_history"), nullable=False
    )
    session_count = Column(Integer, default=0, nullable=False)

    # --- Relationships ---
    student = relationship("User", back_populates="dependency_history")

    # --- Integrity Constraints (ACID "C") ---
    __table_args__ = (
        UniqueConstraint(
            "student_id", "date",
            name="dependency_history_unique_per_day",
        ),
        CheckConstraint(
            f"score >= {CDS_MIN} AND score <= {CDS_MAX}",
            name="dependency_score_valid_range",
        ),
        CheckConstraint(
            "session_count >= 0",
            name="dependency_history_session_count_non_negative",
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<DependencyHistory {self.student_id} "
            f"{self.date} score={self.score}>"
        )