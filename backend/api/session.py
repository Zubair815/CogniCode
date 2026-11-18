"""
Module: backend.api.session
Purpose: Session lifecycle REST endpoints.

         Endpoints:
           POST /session/start                 — create a new session
           GET  /session/{session_id}/history  — full interaction log
           GET  /session/my-sessions           — student's session list
           POST /session/{session_id}/end      — close a session

         Design choices:
         - Only the owning student can access their sessions.
           Ownership is verified on every request using JWT + DB check.
         - Session start is idempotent per topic: if the student has
           an open session on the same topic, we reuse it instead of
           creating duplicates. This avoids accidental double-clicks.
         - Session end is optional; sessions naturally expire when the
           student starts a new topic.

Created: 10/10/2026
"""

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession

from auth.dependencies import require_student
from db.models import Interaction, Session, User
from db.session import get_db
from schemas.session import (
    SessionListResponse,
    SessionResponse,
    StartSessionRequest,
)
from schemas.chat import InteractionResponse, SessionHistoryResponse


router = APIRouter(prefix="/session", tags=["Session"])


# =============================================================================
# POST /session/start
# =============================================================================
@router.post(
    "/start",
    response_model=SessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Start a new tutoring session",
)
def start_session(
    payload: StartSessionRequest,
    current_user: User = Depends(require_student),
    db: DBSession = Depends(get_db),
) -> SessionResponse:
    """
    Create a new session for the given topic.

    If the student already has an open session (no `ended_at`) on the
    same topic, we reuse it. This prevents accidental duplicates from
    double-clicks or page reloads.
    """
    topic = payload.topic.strip()

    # Check for an existing open session on the same topic.
    existing = (
        db.query(Session)
        .filter(
            Session.student_id == current_user.id,
            Session.topic == topic,
            Session.ended_at.is_(None),
        )
        .first()
    )
    if existing is not None:
        return SessionResponse.model_validate(existing)

    new_session = Session(
        student_id=current_user.id,
        topic=topic,
    )
    db.add(new_session)

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    db.refresh(new_session)
    return SessionResponse.model_validate(new_session)


# =============================================================================
# GET /session/{session_id}/history
# =============================================================================
@router.get(
    "/{session_id}/history",
    response_model=SessionHistoryResponse,
    summary="Get full interaction log for a session",
)
def get_session_history(
    session_id: UUID,
    current_user: User = Depends(require_student),
    db: DBSession = Depends(get_db),
) -> SessionHistoryResponse:
    """
    Return all interactions for the given session, in chronological order.

    Raises:
        HTTPException 404: if the session does not exist.
        HTTPException 403: if the session belongs to another student.
    """
    session = db.get(Session, session_id)
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found.",
        )

    if session.student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this session.",
        )

    interactions = (
        db.query(Interaction)
        .filter(Interaction.session_id == session_id)
        .order_by(Interaction.timestamp.asc())
        .all()
    )

    return SessionHistoryResponse(
        session_id=session.id,
        topic=session.topic,
        interactions=[InteractionResponse.model_validate(i) for i in interactions],
    )


# =============================================================================
# GET /session/my-sessions
# =============================================================================
@router.get(
    "/my-sessions",
    response_model=SessionListResponse,
    summary="List the authenticated student's sessions",
)
def list_my_sessions(
    current_user: User = Depends(require_student),
    db: DBSession = Depends(get_db),
) -> SessionListResponse:
    """
    Return all sessions for the authenticated student, most recent first.
    """
    sessions = (
        db.query(Session)
        .filter(Session.student_id == current_user.id)
        .order_by(Session.started_at.desc())
        .all()
    )
    return SessionListResponse(
        sessions=[SessionResponse.model_validate(s) for s in sessions]
    )


# =============================================================================
# POST /session/{session_id}/end
# =============================================================================
@router.post(
    "/{session_id}/end",
    response_model=SessionResponse,
    summary="End a session",
)
def end_session(
    session_id: UUID,
    current_user: User = Depends(require_student),
    db: DBSession = Depends(get_db),
) -> SessionResponse:
    """
    Mark a session as ended by setting `ended_at`.

    Idempotent: calling twice has no additional effect.
    """
    session = db.get(Session, session_id)
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found.",
        )
    if session.student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this session.",
        )

    if session.ended_at is None:
        session.ended_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(session)

    return SessionResponse.model_validate(session)