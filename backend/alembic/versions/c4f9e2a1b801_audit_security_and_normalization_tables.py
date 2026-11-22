"""audit: add normalized enrollments, refresh tokens, ws tickets, practice reminders

Revision ID: c4f9e2a1b801
Revises: bac0a6820dfa
Create Date: 2026-11-22 22:05:00.000000

"""
from typing import Sequence, Union
import json
from uuid import UUID

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c4f9e2a1b801"
down_revision: Union[str, None] = "bac0a6820dfa"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    # 1. Normalized course enrollments table
    if not inspector.has_table("course_enrollments"):
        op.create_table(
            "course_enrollments",
            sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
            sa.Column("course_id", sa.Uuid(as_uuid=True), nullable=False),
            sa.Column("student_id", sa.Uuid(as_uuid=True), nullable=False),
            sa.Column(
                "enrolled_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.ForeignKeyConstraint(["course_id"], ["instructor_courses.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["student_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("course_id", "student_id", name="uq_course_student_enrollment"),
        )
        op.create_index(
            op.f("ix_course_enrollments_course_id"),
            "course_enrollments",
            ["course_id"],
            unique=False,
        )
        op.create_index(
            op.f("ix_course_enrollments_student_id"),
            "course_enrollments",
            ["student_id"],
            unique=False,
        )

    # Backfill valid student enrollments from legacy JSON column if present
    course_cols = {c["name"] for c in inspector.get_columns("instructor_courses")}
    if "enrolled_students" in course_cols:
        existing_students = {
            row[0]
            for row in conn.execute(sa.text("SELECT id FROM users WHERE role = 'student'")).fetchall()
        }
        courses = conn.execute(
            sa.text("SELECT id, enrolled_students FROM instructor_courses")
        ).fetchall()
        import uuid as _uuid

        for course_id, raw_list in courses:
            if isinstance(raw_list, str):
                try:
                    raw_list = json.loads(raw_list)
                except Exception:
                    raw_list = []
            if not isinstance(raw_list, list):
                continue
            seen = set()
            for item in raw_list:
                try:
                    sid = UUID(str(item))
                except ValueError:
                    continue
                if sid in existing_students and sid not in seen:
                    seen.add(sid)
                    conn.execute(
                        sa.text(
                            "INSERT INTO course_enrollments (id, course_id, student_id) "
                            "VALUES (:id, :cid, :sid) ON CONFLICT DO NOTHING"
                        ),
                        {"id": _uuid.uuid4(), "cid": course_id, "sid": sid},
                    )
        op.drop_column("instructor_courses", "enrolled_students")

    # 2. Refresh tokens table (HttpOnly rotating refresh sessions)
    if not inspector.has_table("refresh_tokens"):
        op.create_table(
            "refresh_tokens",
            sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
            sa.Column("user_id", sa.Uuid(as_uuid=True), nullable=False),
            sa.Column("token_hash", sa.String(length=64), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            op.f("ix_refresh_tokens_token_hash"),
            "refresh_tokens",
            ["token_hash"],
            unique=True,
        )
        op.create_index(
            op.f("ix_refresh_tokens_user_id"),
            "refresh_tokens",
            ["user_id"],
            unique=False,
        )

    # 3. Single-use WebSocket auth tickets table
    if not inspector.has_table("ws_tickets"):
        op.create_table(
            "ws_tickets",
            sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
            sa.Column("user_id", sa.Uuid(as_uuid=True), nullable=False),
            sa.Column("session_id", sa.Uuid(as_uuid=True), nullable=True),
            sa.Column("token_hash", sa.String(length=64), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.ForeignKeyConstraint(["session_id"], ["sessions.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            op.f("ix_ws_tickets_session_id"),
            "ws_tickets",
            ["session_id"],
            unique=False,
        )
        op.create_index(
            op.f("ix_ws_tickets_token_hash"),
            "ws_tickets",
            ["token_hash"],
            unique=True,
        )
        op.create_index(
            op.f("ix_ws_tickets_user_id"),
            "ws_tickets",
            ["user_id"],
            unique=False,
        )

    # 4. Practice reminders table
    if not inspector.has_table("practice_reminders"):
        op.create_table(
            "practice_reminders",
            sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
            sa.Column("instructor_id", sa.Uuid(as_uuid=True), nullable=False),
            sa.Column("student_id", sa.Uuid(as_uuid=True), nullable=False),
            sa.Column("course_id", sa.Uuid(as_uuid=True), nullable=True),
            sa.Column("topic", sa.String(length=200), nullable=False),
            sa.Column("message", sa.Text(), nullable=False),
            sa.Column("is_read", sa.Boolean(), nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.ForeignKeyConstraint(["course_id"], ["instructor_courses.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["instructor_id"], ["users.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["student_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            op.f("ix_practice_reminders_course_id"),
            "practice_reminders",
            ["course_id"],
            unique=False,
        )
        op.create_index(
            op.f("ix_practice_reminders_instructor_id"),
            "practice_reminders",
            ["instructor_id"],
            unique=False,
        )
        op.create_index(
            op.f("ix_practice_reminders_student_id"),
            "practice_reminders",
            ["student_id"],
            unique=False,
        )


def downgrade() -> None:
    op.drop_index(op.f("ix_practice_reminders_student_id"), table_name="practice_reminders")
    op.drop_index(op.f("ix_practice_reminders_instructor_id"), table_name="practice_reminders")
    op.drop_index(op.f("ix_practice_reminders_course_id"), table_name="practice_reminders")
    op.drop_table("practice_reminders")

    op.drop_index(op.f("ix_ws_tickets_user_id"), table_name="ws_tickets")
    op.drop_index(op.f("ix_ws_tickets_token_hash"), table_name="ws_tickets")
    op.drop_index(op.f("ix_ws_tickets_session_id"), table_name="ws_tickets")
    op.drop_table("ws_tickets")

    op.drop_index(op.f("ix_refresh_tokens_user_id"), table_name="refresh_tokens")
    op.drop_index(op.f("ix_refresh_tokens_token_hash"), table_name="refresh_tokens")
    op.drop_table("refresh_tokens")

    op.add_column(
        "instructor_courses",
        sa.Column("enrolled_students", sa.JSON(), server_default=sa.text("'[]'::json"), nullable=False),
    )
    op.drop_index(op.f("ix_course_enrollments_student_id"), table_name="course_enrollments")
    op.drop_index(op.f("ix_course_enrollments_course_id"), table_name="course_enrollments")
    op.drop_table("course_enrollments")
