"""
Module: backend.websocket.chat_handler
Purpose: WebSocket endpoint for real-time tutoring chat.

         Endpoint:
           WS /ws/chat/{session_id}?token=<JWT>

         The token is passed as a query parameter because the browser
         WebSocket API does not support custom headers.

         Lifecycle:
           1. Validate JWT and session ownership.
           2. Send {"type": "ready"} with session context and history.
           3. Loop: receive message → classify → generate → persist → reply.
           4. On disconnect: cleanup.

         Errors are sent as {"type": "error", "code", "message"} so
         the client can render them inline. Fatal errors close the
         socket; recoverable ones keep it open.

Created: 10/10/2026
"""

import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session as DBSession

from agents import ConversationManager, SocraticTutor, new_state
from auth.jwt_handler import TokenError, decode_access_token
from db.models import Interaction, Session, User
from db.session import SessionLocal
from llm import LLMError
from websocket.connection_manager import manager


logger = logging.getLogger("cognicode.websocket")

router = APIRouter()

# Instantiate agents once — they are stateless and thread-safe.
_conversation_manager = ConversationManager()
_socratic_tutor = SocraticTutor()


# =============================================================================
# HELPERS
# =============================================================================
def _authenticate(token: str, db: DBSession) -> User:
    """
    Validate the JWT and return the User. Raises on any failure.
    """
    payload = decode_access_token(token)  # raises TokenError
    user_id = UUID(payload["sub"])
    user = db.get(User, user_id)
    if user is None:
        raise TokenError("User no longer exists.")
    return user


def _load_session(session_id: UUID, user: User, db: DBSession) -> Session:
    """Load the session and verify ownership."""
    session = db.get(Session, session_id)
    if session is None:
        raise TokenError("Session not found.")
    if session.student_id != user.id:
        raise TokenError("You do not have access to this session.")
    return session


def _recent_history(db: DBSession, session_id: UUID, limit: int = 6):
    """
    Return the last N interactions formatted for the agent context.
    We fetch the most recent rows, then reverse to chronological order.
    """
    rows = (
        db.query(Interaction)
        .filter(Interaction.session_id == session_id)
        .order_by(Interaction.timestamp.desc())
        .limit(limit)
        .all()
    )
    rows.reverse()  # chronological order (oldest first)

    history = []
    for row in rows:
        history.append({
            "role": "student",
            "content": row.message,
            "attempt_detected": bool(row.attempt_detected),
        })
        history.append({"role": "assistant", "content": row.response})
    return history


def _serialize_interaction(interaction: Interaction) -> dict:
    return {
        "id": str(interaction.id),
        "session_id": str(interaction.session_id),
        "message": interaction.message,
        "response": interaction.response,
        "intent": interaction.intent,
        "attempt_detected": interaction.attempt_detected,
        "hint_level_given": interaction.hint_level_given,
        "timestamp": interaction.timestamp.isoformat(),
    }


# =============================================================================
# WEBSOCKET ENDPOINT
# =============================================================================
@router.websocket("/ws/chat/{session_id}")
async def chat_websocket(
    websocket: WebSocket,
    session_id: UUID,
    token: str = Query(..., description="JWT access token"),
):
    """
    Real-time tutoring chat over WebSocket.

    Query params:
        token — JWT access token (required)
    """
    db: DBSession = SessionLocal()

    try:
        # --- Authenticate ---
        try:
            user = _authenticate(token, db)
        except (TokenError, ValueError) as exc:
            await websocket.accept()
            await websocket.send_json({
                "type": "error",
                "code": "auth_failed",
                "message": str(exc) or "Authentication failed.",
            })
            await websocket.close(code=4401)
            return

        # --- Verify session ownership ---
        try:
            session = _load_session(session_id, user, db)
        except TokenError as exc:
            await websocket.accept()
            await websocket.send_json({
                "type": "error",
                "code": "session_forbidden",
                "message": str(exc),
            })
            await websocket.close(code=4403)
            return

        # --- Register connection ---
        await manager.connect(session_id, websocket)

        # --- Send ready frame with history ---
        history_rows = (
            db.query(Interaction)
            .filter(Interaction.session_id == session_id)
            .order_by(Interaction.timestamp.asc())
            .all()
        )
        await manager.send_to(session_id, websocket, {
            "type": "ready",
            "session_id": str(session.id),
            "topic": session.topic,
            "history": [_serialize_interaction(i) for i in history_rows],
        })

        # --- Message loop ---
        while True:
            try:
                raw = await websocket.receive_json()
            except WebSocketDisconnect:
                break
            except Exception:
                await manager.send_to(session_id, websocket, {
                    "type": "error",
                    "code": "invalid_json",
                    "message": "Message must be valid JSON.",
                })
                continue

            msg_type = (raw or {}).get("type")

            # --- Ping / pong keep-alive ---
            if msg_type == "ping":
                await manager.send_to(session_id, websocket, {"type": "pong"})
                continue

            # --- Session end ---
            if msg_type == "session_end":
                if session.ended_at is None:
                    session.ended_at = datetime.now(timezone.utc)
                    db.commit()
                await manager.send_to(session_id, websocket, {
                    "type": "session_ended",
                    "session_id": str(session.id),
                })
                break

            # --- Chat / code_submission ---
            if msg_type in ("chat", "code_submission"):
                content = (raw.get("content") or "").strip()
                if not content:
                    await manager.send_to(session_id, websocket, {
                        "type": "error",
                        "code": "empty_message",
                        "message": "Message cannot be empty.",
                    })
                    continue
                if msg_type == "code_submission" and "```" not in content:
                    content = f"```\n{content}\n```"
                await _handle_chat(
                    session_id,
                    session,
                    user,
                    content,
                    websocket,
                    db,
                    message_type=msg_type,
                )
                continue

            # --- Unknown type ---
            await manager.send_to(session_id, websocket, {
                "type": "error",
                "code": "unknown_type",
                "message": f"Unsupported message type: {msg_type!r}",
            })

    except WebSocketDisconnect:
        pass
    except Exception:
        logger.exception("Unexpected WS error for session %s", session_id)
    finally:
        await manager.disconnect(session_id, websocket)
        db.close()


async def _handle_chat(
    session_id: UUID,
    session: Session,
    user: User,
    content: str,
    websocket: WebSocket,
    db: DBSession,
    message_type: str = "chat",
):
    """
    Process one chat message end-to-end.

    Steps:
        1. Notify client that the assistant is thinking.
        2. Build agent state from history + new message.
        3. Classify intent & attempt state (Conversation Manager).
        4. Generate response (Socratic Tutor, calls LLM).
        5. Persist the interaction & behavioral signals.
        6. Send the response back.
    """
    await manager.send_to(session_id, websocket, {"type": "typing"})

    # Check prior interactions for time gap & cumulative attempt status
    last_interaction = (
        db.query(Interaction)
        .filter(Interaction.session_id == session.id)
        .order_by(Interaction.timestamp.desc())
        .first()
    )
    prior_attempt_exists = (
        db.query(Interaction.id)
        .filter(
            Interaction.session_id == session.id,
            Interaction.attempt_detected.is_(True),
        )
        .first()
        is not None
    )

    now = datetime.now(timezone.utc)
    time_since_last: int | None = None
    if last_interaction and last_interaction.timestamp:
        last_ts = last_interaction.timestamp
        if last_ts.tzinfo is None:
            last_ts = last_ts.replace(tzinfo=timezone.utc)
        time_since_last = max(0, int((now - last_ts).total_seconds()))

    state = new_state(
        student_id=str(user.id),
        session_id=str(session.id),
        topic=session.topic,
        message=content,
        history=_recent_history(db, session.id),
        preferred_language=user.preferred_language or "Python",
        message_type="code_submission" if message_type == "code_submission" else "chat",
        prior_attempt_exists=prior_attempt_exists,
    )

    # Classify intent & attempt status
    state = _conversation_manager.process(state)

    # Generate response
    try:
        state = await _socratic_tutor.process(state)
    except LLMError as exc:
        logger.warning("LLM error: %s", exc)
        await manager.send_to(session_id, websocket, {
            "type": "error",
            "code": "llm_error",
            "message": str(exc) or "The AI is unavailable. Please try again.",
        })
        return

    response_text = state.get("response") or "(no response)"
    attempt_detected = bool(state.get("attempt_detected", False))
    current_turn_attempt = bool(state.get("current_turn_attempt", False))
    intent = state.get("intent")

    # Persist interaction
    interaction = Interaction(
        session_id=session.id,
        student_id=user.id,
        message=content,
        response=response_text,
        intent=_map_intent(intent),
        attempt_detected=attempt_detected,
        hint_level_given=None,
        time_since_last=time_since_last,
    )
    db.add(interaction)

    # Update session behavioral signals for CDS computation
    if intent == "code_request" and not current_turn_attempt:
        session.solution_requests = (session.solution_requests or 0) + 1
    if intent == "debug" and current_turn_attempt:
        session.debugging_attempts = (session.debugging_attempts or 0) + 1
    if prior_attempt_exists and current_turn_attempt:
        session.retry_count = (session.retry_count or 0) + 1

    try:
        db.commit()
        db.refresh(interaction)
    except Exception:
        db.rollback()
        logger.exception("Failed to persist interaction")
        await manager.send_to(session_id, websocket, {
            "type": "error",
            "code": "persistence_error",
            "message": "Failed to save your message. Please try again.",
        })
        return

    # Reply
    await manager.send_to(session_id, websocket, {
        "type": "response",
        "content": response_text,
        "intent": intent,
        "attempt_detected": attempt_detected,
        "interaction_id": str(interaction.id),
        "elapsed_seconds": state.get("metadata", {}).get("elapsed_seconds"),
    })


def _map_intent(intent: str | None) -> str | None:
    """
    Map agent-level intents to the DB enum values.

    DB enum: concept | code_request | debug | quiz
    Agent intents: concept_question | code_request | debug | quiz | other
    """
    if intent is None:
        return None
    if intent == "concept_question":
        return "concept"
    if intent in ("code_request", "debug", "quiz"):
        return intent
    return None