"""
Module: backend.db.models
Purpose: SQLAlchemy ORM models for CogniCode.

         All tables, columns, relationships, and constraints are
         defined here — one source of truth for the schema.

         Design principles:
         - ACID "C" (Consistency) is enforced at the DATABASE level
           via CheckConstraints and Unique constraints, not only at
           the API layer.
         - ForeignKeys use ON DELETE CASCADE so parent deletion
           atomically removes children (ACID "A").
         - UUID primary keys avoid sequence contention under
           concurrency (ACID "I").
         - server_default=func.now() delegates timestamps to the DB
           so they survive app restarts (ACID "D").

         V1 simplification (10/10/2026):
         - Removed pucit_id column. CogniCode is open to learners
           from any university, college, or self-study background.

Created: 10/10/2026
Updated: 10/10/2026
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
from sqlalchemy import JSON, Uuid
from sqlalchemy.orm import relationship

from db.session import Base


# =============================================================================
# ENUM VALUES
# =============================================================================
USER_ROLES = ("student", "instructor")
DEPENDENCY_BANDS = ("low", "moderate", "high")
INTERACTION_INTENTS = ("concept", "code_request", "debug", "quiz")

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

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(Text, nullable=False)
    role = Column(Enum(*USER_ROLES, name="user_role"), nullable=False)

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
    course_enrollments = relationship(
        "CourseEnrollment", back_populates="student", cascade="all, delete-orphan"
    )
    refresh_tokens = relationship(
        "RefreshToken", back_populates="user", cascade="all, delete-orphan"
    )
    ws_tickets = relationship(
        "WsTicket", back_populates="user", cascade="all, delete-orphan"
    )
    received_reminders = relationship(
        "PracticeReminder",
        foreign_keys="PracticeReminder.student_id",
        back_populates="student",
        cascade="all, delete-orphan",
    )
    sent_reminders = relationship(
        "PracticeReminder",
        foreign_keys="PracticeReminder.instructor_id",
        back_populates="instructor",
        cascade="all, delete-orphan",
    )

    # --- Integrity Constraints (ACID "C") ---
    __table_args__ = (
        CheckConstraint(
            "length(name) >= 2",
            name="users_name_min_length",
        ),
        CheckConstraint("length(email) >= 5", name="users_email_min_length"),
    )

    def __repr__(self) -> str:
        return f"<User {self.email} ({self.role})>"


# =============================================================================
# INSTRUCTOR COURSES
# =============================================================================
class InstructorCourse(Base):
    """
    Maps an instructor to a course. Student enrollments are stored
    in the normalized `course_enrollments` table with FK integrity.
    """

    __tablename__ = "instructor_courses"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    instructor_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    course_name = Column(String(200), nullable=False)
    course_code = Column(String(20), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)

    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    instructor = relationship("User", back_populates="taught_courses")
    enrollments = relationship(
        "CourseEnrollment", back_populates="course", cascade="all, delete-orphan"
    )

    __table_args__ = (
        CheckConstraint(
            "length(course_name) >= 3",
            name="instructor_courses_name_min_length",
        ),
        CheckConstraint("length(course_code) >= 2", name="instructor_courses_code_min_length"),
    )

    def __repr__(self) -> str:
        return f"<InstructorCourse {self.course_code} — {self.course_name}>"


class CourseEnrollment(Base):
    """Normalized join table associating students with instructor courses."""

    __tablename__ = "course_enrollments"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("instructor_courses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    student_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    enrolled_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    course = relationship("InstructorCourse", back_populates="enrollments")
    student = relationship("User", back_populates="course_enrollments")

    __table_args__ = (
        UniqueConstraint(
            "course_id", "student_id",
            name="uq_course_student_enrollment",
        ),
    )

    def __repr__(self) -> str:
        return f"<CourseEnrollment course={self.course_id} student={self.student_id}>"


class RefreshToken(Base):
    """Opaque refresh tokens (stored as SHA-256 hashes) for HttpOnly cookie rotation."""

    __tablename__ = "refresh_tokens"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    token_hash = Column(String(64), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user = relationship("User", back_populates="refresh_tokens")


class WsTicket(Base):
    """Short-lived, single-use opaque ticket for authenticated WebSocket handshakes."""

    __tablename__ = "ws_tickets"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    session_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("sessions.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    token_hash = Column(String(64), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user = relationship("User", back_populates="ws_tickets")


class PracticeReminder(Base):
    """Instructor-sent practice reminder persisted and delivered to student dashboard."""

    __tablename__ = "practice_reminders"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    instructor_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    student_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    course_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("instructor_courses.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    topic = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    instructor = relationship(
        "User", foreign_keys=[instructor_id], back_populates="sent_reminders"
    )
    student = relationship(
        "User", foreign_keys=[student_id], back_populates="received_reminders"
    )


# =============================================================================
# SESSIONS
# =============================================================================
class Session(Base):
    """A single tutoring session between a student and CogniCode."""

    __tablename__ = "sessions"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    topic = Column(String(200), nullable=False)

    started_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    ended_at = Column(DateTime(timezone=True), nullable=True)

    dependency_score = Column(Float, default=0.0, nullable=False)
    dependency_band = Column(
        Enum(*DEPENDENCY_BANDS, name="dependency_band"), nullable=True
    )
    hint_levels_used = Column(JSON, default=list, nullable=False)
    solution_requests = Column(Integer, default=0, nullable=False)
    retry_count = Column(Integer, default=0, nullable=False)
    debugging_attempts = Column(Integer, default=0, nullable=False)

    reflection_stored = Column(Boolean, default=False, nullable=False)

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

    @property
    def max_hint_level(self) -> int:
        return max(self.hint_levels_used) if self.hint_levels_used else 0

    @max_hint_level.setter
    def max_hint_level(self, level: int) -> None:
        hints = list(self.hint_levels_used or [])
        if level not in hints:
            hints.append(level)
            self.hint_levels_used = hints

    def __repr__(self) -> str:
        return f"<Session {self.id} topic={self.topic}>"


# =============================================================================
# INTERACTIONS
# =============================================================================
class Interaction(Base):
    """A single message exchange within a session."""

    __tablename__ = "interactions"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    student_id = Column(
        Uuid(as_uuid=True),
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
    hint_level_given = Column(Integer, nullable=True)
    time_since_last = Column(Integer, nullable=True)

    timestamp = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    session = relationship("Session", back_populates="interactions")

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
    """Result of a concept quiz taken at the end of a topic."""

    __tablename__ = "quiz_results"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    session_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    topic = Column(String(200), nullable=False)
    score = Column(Integer, nullable=False)
    total_questions = Column(Integer, nullable=False)
    passed = Column(Boolean, nullable=False)

    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    student = relationship("User", back_populates="quiz_results")
    session = relationship("Session", back_populates="quiz_results")

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
    """Mandatory end-of-session reflection entries."""

    __tablename__ = "reflections"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    session_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("sessions.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )

    learned_today = Column(Text, nullable=False)
    mistake_to_avoid = Column(Text, nullable=False)

    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    student = relationship("User", back_populates="reflections")
    session = relationship("Session", back_populates="reflection")

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
    """Daily snapshots of a student's CDS score for trend charts."""

    __tablename__ = "dependency_history"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(
        Uuid(as_uuid=True),
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

    student = relationship("User", back_populates="dependency_history")

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
