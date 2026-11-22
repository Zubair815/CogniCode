"""
Module: backend.websocket.chat_handler
Purpose: WebSocket endpoint for real-time tutoring chat.

Security & Scalability Design:
  - Authenticates exclusively via short-lived, single-use opaque WebSocket
    tickets (`?ticket=...` minted by `POST /auth/ws-ticket`), keeping JWTs out of URLs.
  - Offloads synchronous SQLAlchemy queries via `asyncio.to_thread` using
    short-lived scoped sessions (never holds a DB connection idle during WS waits).
  - Enforces message size limits, sliding-window rate limits, and per-user
    active-turn concurrency locks before invoking the LLM workflow.
  - Persists quiz check evaluations to `QuizResult` and recomputes CDS cleanly.
"""

import asyncio
import hashlib
import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session as DBSession

from agents import new_state, tutoring_graph
from agents.assessment import AssessmentAgent
from config import get_settings
from core.cds_engine import compute_session_score
from core.rate_limit import rate_limiter
from db.models import Interaction, QuizResult, Session, User, WsTicket
from db.session import SessionLocal
from llm import LLMError
from websocket.connection_manager import manager


logger = logging.getLogger("cognicode.websocket")

router = APIRouter()
_assessment_agent = AssessmentAgent()


class WsAuthError(Exception):
    """Raised when a WebSocket ticket or session authorization fails."""
    def __init__(self, message: str, code: str = "auth_failed", ws_close_code: int = 4401):
        super().__init__(message)
        self.code = code
        self.ws_close_code = ws_close_code


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


def _consume_ticket_and_load_session(ticket: str | None, session_id: UUID) -> dict:
    """
    Validate & atomically consume single-use WS ticket, verify user + session
    ownership, and return initial session context and serialized history.
    """
    if not ticket or not ticket.strip():
        raise WsAuthError("Missing WebSocket authentication ticket.", "auth_failed", 4401)

    ticket_hash = hashlib.sha256(ticket.strip().encode("utf-8")).hexdigest()
    now = datetime.now(timezone.utc)

    with SessionLocal() as db:
        ticket_row = db.query(WsTicket).filter(WsTicket.token_hash == ticket_hash).first()
        if ticket_row is None or ticket_row.used_at is not None:
            raise WsAuthError("Invalid or already-used WebSocket ticket.", "auth_failed", 4401)

        expires_at = ticket_row.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at <= now:
            raise WsAuthError("WebSocket ticket expired.", "auth_failed", 4401)

        if ticket_row.session_id is not None and ticket_row.session_id != session_id:
            raise WsAuthError("WebSocket ticket is scoped to another session.", "session_forbidden", 4403)

        user = db.get(User, ticket_row.user_id)
        if user is None:
            raise WsAuthError("User no longer exists.", "auth_failed", 4401)

        session = db.get(Session, session_id)
        if session is None:
            raise WsAuthError("Session not found.", "session_forbidden", 4403)
        if session.student_id != user.id:
            raise WsAuthError("You do not have access to this session.", "session_forbidden", 4403)

        # Mark ticket consumed
        ticket_row.used_at = now
        db.commit()

        history_rows = (
            db.query(Interaction)
            .filter(Interaction.session_id == session_id)
            .order_by(Interaction.timestamp.asc())
            .all()
        )
        return {
            "user_id": user.id,
            "preferred_language": user.preferred_language or "Python",
            "session_id": session.id,
            "topic": session.topic,
            "history": [_serialize_interaction(i) for i in history_rows],
        }


def _close_session_in_db(session_id: UUID) -> None:
    """Mark session ended and recompute CDS score in a short-lived transaction."""
    with SessionLocal() as db:
        session = db.get(Session, session_id)
        if session and session.ended_at is None:
            session.ended_at = datetime.now(timezone.utc)
            try:
                compute_session_score(session, db)
            except Exception:
                logger.warning("Failed to compute CDS on session_end for %s", session_id)
            db.commit()


def _load_turn_context(session_id: UUID, user_id: UUID) -> dict:
    """Load recent session interactions and hint state cleanly for one chat turn."""
    with SessionLocal() as db:
        session = db.get(Session, session_id)
        user = db.get(User, user_id)
        rows = (
            db.query(Interaction)
            .filter(Interaction.session_id == session_id)
            .order_by(Interaction.timestamp.desc())
            .limit(6)
            .all()
        )
        rows.reverse()

        history = []
        for row in rows:
            history.append({"role": "student", "content": row.message})
            history.append({"role": "assistant", "content": row.response})

        last_ts = rows[-1].timestamp if rows else None
        last_resp = (rows[-1].response or "") if rows else ""
        check_passed = any("Concept Check Passed" in (r.response or "") for r in rows)

        return {
            "topic": session.topic if session else "Programming",
            "preferred_language": (user.preferred_language if user else None) or "Python",
            "current_hint_level": (getattr(session, "max_hint_level", 0) or 0) if session else 0,
            "history": history,
            "last_timestamp": last_ts,
            "last_response": last_resp,
            "check_passed": check_passed,
        }


def _persist_turn_result(
    session_id: UUID,
    user_id: UUID,
    content: str,
    state: dict,
    time_since_last: int | None,
) -> Interaction:
    """Persist interaction, quiz result (if evaluated), session counters, and CDS atomically."""
    response_text = state.get("response") or "(no response)"
    hint_level_given = state.get("current_hint_level") or None

    with SessionLocal() as db:
        session = db.get(Session, session_id)
        if session is None:
            raise ValueError("Session no longer exists.")

        interaction = Interaction(
            session_id=session.id,
            student_id=user_id,
            message=content,
            response=response_text,
            intent=_map_intent(state.get("intent")),
            attempt_detected=state.get("attempt_detected", False),
            hint_level_given=hint_level_given,
            time_since_last=time_since_last,
        )
        db.add(interaction)

        if state.get("intent") == "code_request":
            session.solution_requests = (session.solution_requests or 0) + 1
        if state.get("attempt_detected"):
            session.retry_count = (session.retry_count or 0) + 1
        if state.get("intent") == "debug":
            session.debugging_attempts = (session.debugging_attempts or 0) + 1
        if hint_level_given and hint_level_given > (getattr(session, "max_hint_level", 0) or 0):
            session.max_hint_level = hint_level_given

        # Persist in-chat conceptual quiz check outcome to QuizResult
        if (
            "Concept Check Passed" in response_text
            or "Concept Check Review Needed" in response_text
        ):
            passed = "Concept Check Passed" in response_text
            db.add(
                QuizResult(
                    student_id=user_id,
                    session_id=session.id,
                    topic=session.topic,
                    score=1 if passed else 0,
                    total_questions=1,
                    passed=passed,
                )
            )

        db.flush()
        compute_session_score(session, db)
        db.commit()
        db.refresh(interaction)
        return interaction


@router.websocket("/ws/chat/{session_id}")
async def chat_websocket(
    websocket: WebSocket,
    session_id: UUID,
    ticket: str | None = Query(default=None, description="Single-use WebSocket auth ticket"),
):
    """Real-time tutoring chat over WebSocket using single-use ticket authentication."""
    try:
        ctx = await asyncio.to_thread(_consume_ticket_and_load_session, ticket, session_id)
    except WsAuthError as exc:
        await websocket.accept()
        await websocket.send_json({
            "type": "error",
            "code": exc.code,
            "message": str(exc),
        })
        await websocket.close(code=exc.ws_close_code)
        return
    except Exception:
        logger.exception("Unexpected error during WS handshake for session %s", session_id)
        await websocket.accept()
        await websocket.send_json({
            "type": "error",
            "code": "auth_failed",
            "message": "Authentication failed.",
        })
        await websocket.close(code=4401)
        return

    user_id: UUID = ctx["user_id"]
    turn_lock = manager.get_turn_lock(f"{user_id}:{session_id}")
    settings = get_settings()

    try:
        await manager.connect(session_id, websocket)

        await manager.send_to(session_id, websocket, {
            "type": "ready",
            "session_id": str(session_id),
            "topic": ctx["topic"],
            "history": ctx["history"],
        })

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

            if msg_type == "ping":
                await manager.send_to(session_id, websocket, {"type": "pong"})
                continue

            if msg_type == "session_end":
                await asyncio.to_thread(_close_session_in_db, session_id)
                await manager.send_to(session_id, websocket, {
                    "type": "session_ended",
                    "session_id": str(session_id),
                })
                break

            if msg_type in ("chat", "code_submission"):
                content = (raw.get("content") or "").strip()
                if not content:
                    await manager.send_to(session_id, websocket, {
                        "type": "error",
                        "code": "empty_message",
                        "message": "Message cannot be empty.",
                    })
                    continue
                if len(content) > settings.ws_max_message_chars:
                    await manager.send_to(session_id, websocket, {
                        "type": "error",
                        "code": "message_too_long",
                        "message": f"Message exceeds maximum length of {settings.ws_max_message_chars} characters.",
                    })
                    continue

                allowed, retry_after = rate_limiter.check(
                    f"ws_chat:{user_id}",
                    settings.ws_message_rate_limit_max,
                    settings.ws_message_rate_limit_window_seconds,
                )
                if not allowed:
                    await manager.send_to(session_id, websocket, {
                        "type": "error",
                        "code": "rate_limited",
                        "message": f"Rate limit exceeded. Please wait {retry_after}s before sending another message.",
                    })
                    continue

                if turn_lock.locked():
                    await manager.send_to(session_id, websocket, {
                        "type": "error",
                        "code": "concurrent_request",
                        "message": "A response is already in progress. Please wait for it to finish.",
                    })
                    continue

                async with turn_lock:
                    await _handle_chat(session_id, user_id, content, websocket)
                continue

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


async def _handle_chat(
    session_id: UUID,
    user_id: UUID,
    content: str,
    websocket: WebSocket,
):
    """Process one chat turn end-to-end without holding open DB sessions across LLM I/O."""
    await manager.send_to(session_id, websocket, {"type": "typing"})

    turn_ctx = await asyncio.to_thread(_load_turn_context, session_id, user_id)
    topic = turn_ctx["topic"]

    state = new_state(
        student_id=str(user_id),
        session_id=str(session_id),
        topic=topic,
        message=content,
        history=turn_ctx["history"],
        preferred_language=turn_ctx["preferred_language"],
        current_hint_level=turn_ctx["current_hint_level"],
    )

    if turn_ctx["check_passed"]:
        state["understanding_check_passed"] = True
    elif (
        "Conceptual Understanding Check" in turn_ctx["last_response"]
        or "unlock Level 3" in turn_ctx["last_response"]
    ):
        state["understanding_check_required"] = True
        state["quiz_question"] = _assessment_agent.get_or_generate_question(topic)

    try:
        state = await tutoring_graph.ainvoke(state)
    except LLMError as exc:
        logger.warning("LLM error in graph invocation: %s", exc)
        await manager.send_to(session_id, websocket, {
            "type": "error",
            "code": "llm_error",
            "message": str(exc) or "The AI is unavailable. Please try again.",
        })
        return
    except Exception:
        logger.exception("Unexpected error in multi-agent graph")
        await manager.send_to(session_id, websocket, {
            "type": "error",
            "code": "agent_error",
            "message": "An error occurred while processing your request.",
        })
        return

    now_utc = datetime.now(timezone.utc)
    time_since_last = None
    prev_ts = turn_ctx["last_timestamp"]
    if prev_ts:
        if prev_ts.tzinfo is None:
            prev_ts = prev_ts.replace(tzinfo=timezone.utc)
        time_since_last = max(0, int((now_utc - prev_ts).total_seconds()))

    try:
        interaction = await asyncio.to_thread(
            _persist_turn_result, session_id, user_id, content, state, time_since_last
        )
    except Exception:
        logger.exception("Failed to persist interaction for session %s", session_id)
        await manager.send_to(session_id, websocket, {
            "type": "error",
            "code": "persistence_error",
            "message": "Failed to save your message. Please try again.",
        })
        return

    response_text = state.get("response") or "(no response)"
    await manager.send_to(session_id, websocket, {
        "type": "response",
        "content": response_text,
        "intent": state.get("intent"),
        "attempt_detected": state.get("attempt_detected", False),
        "hint_level": state.get("current_hint_level", 0),
        "understanding_check_required": state.get("understanding_check_required", False),
        "understanding_check_passed": state.get("understanding_check_passed", False),
        "interaction_id": str(interaction.id),
        "elapsed_seconds": state.get("metadata", {}).get("elapsed_seconds"),
    })


def _map_intent(intent: str | None) -> str | None:
    """Map agent-level intents to the DB enum values."""
    if intent is None:
        return None
    if intent in ("concept_question", "hint_request"):
        return "concept"
    if intent in ("code_request", "debug", "quiz"):
        return intent
    return None
