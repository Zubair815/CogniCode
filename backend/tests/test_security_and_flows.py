"""
End-to-end security, RBAC, IDOR, rate limiting, WebSocket ticket,
normalized enrollment, quiz/reflection persistence, CDS alignment,
and PDF course-scoping tests.
"""

from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from auth.jwt_handler import create_access_token
from config import get_settings, is_valid_jwt_secret
from db.session import get_db
from main import app


def test_jwt_secret_validation_blocks_empty_and_weak():
    assert is_valid_jwt_secret("") is False
    assert is_valid_jwt_secret("short-secret") is False
    assert is_valid_jwt_secret("change_this_to_a_long_random_string") is False
    assert is_valid_jwt_secret("replace_with_a_long_random_secret") is False
    assert is_valid_jwt_secret("a" * 32) is True


def test_jwt_handler_refuses_empty_secret(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "")
    get_settings.cache_clear()
    with pytest.raises(RuntimeError, match="JWT_SECRET"):
        create_access_token(uuid4(), "student", "a@b.com")


def test_cors_allows_only_approved_origin_not_wildcards():
    client = TestClient(app)
    ok = client.options(
        "/auth/login",
        headers={
            "Origin": "https://cognicode-dpq4.vercel.app",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert ok.status_code == 200
    assert ok.headers.get("access-control-allow-origin") == "https://cognicode-dpq4.vercel.app"

    bad = client.options(
        "/auth/login",
        headers={
            "Origin": "https://attacker.vercel.app",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert bad.status_code == 400
    assert "access-control-allow-origin" not in bad.headers


def test_cds_zero_session_and_signal_consistency(db_session):
    from core.cds_engine import compute_session_score, get_student_cds_aggregate
    from db.models import Interaction, QuizResult, Session, User

    student = User(
        id=uuid4(),
        name="CDS Consistency Student",
        email=f"cds_{uuid4().hex[:6]}@cognicode.edu",
        password_hash="hash",
        role="student",
    )
    db_session.add(student)
    db_session.flush()

    empty_agg = get_student_cds_aggregate(student.id, db_session)
    assert empty_agg.score == 0.0
    assert empty_agg.total_sessions == 0
    assert empty_agg.breakdown.quiz_performance == 0.0

    sess = Session(
        id=uuid4(),
        student_id=student.id,
        topic="Recursion",
        hint_levels_used=[1],
        solution_requests=0,
    )
    db_session.add(sess)
    db_session.flush()

    # Independent interaction + passing quiz should yield low dependency score
    db_session.add(
        Interaction(
            session_id=sess.id,
            student_id=student.id,
            message="def f(n): return 1 if n <= 1 else n * f(n - 1)",
            response="Good base case check.",
            intent="debug",
            attempt_detected=True,
            hint_level_given=1,
            time_since_last=35,
        )
    )
    db_session.add(
        QuizResult(
            student_id=student.id,
            session_id=sess.id,
            topic="Recursion",
            score=1,
            total_questions=1,
            passed=True,
        )
    )
    db_session.flush()

    score, band, signals = compute_session_score(sess, db_session)
    assert band == "low"
    assert score <= 20.0
    assert signals.retry_count == 100.0
    assert signals.debugging_attempts == 100.0
    assert signals.quiz_performance == 100.0


def test_end_to_end_api_security_rbac_idor_ws_quiz_reflection(db_session, monkeypatch):
    """Full API + WebSocket integration check against isolated DB transaction."""
    monkeypatch.setenv("JWT_SECRET", "integration_test_jwt_secret_minimum_32_chars_999")
    monkeypatch.setenv("INSTRUCTOR_INVITE_CODE", "inst-secret-code-2026")
    get_settings.cache_clear()

    def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    try:
        client = TestClient(app)

        # 1. Self-registering as instructor WITHOUT valid invite code -> 403
        bad_inst = client.post(
            "/auth/register",
            json={
                "name": "Fake Instructor",
                "email": f"fake_inst_{uuid4().hex[:6]}@edu.org",
                "password": "Password123",
                "role": "instructor",
            },
        )
        assert bad_inst.status_code == 403

        # 2. Valid instructor registration WITH invite code -> 201 + HttpOnly cookie
        inst_a_email = f"inst_a_{uuid4().hex[:6]}@edu.org"
        inst_a_res = client.post(
            "/auth/register",
            json={
                "name": "Instructor Alpha",
                "email": inst_a_email,
                "password": "Password123",
                "role": "instructor",
                "invite_code": "inst-secret-code-2026",
            },
        )
        assert inst_a_res.status_code == 201
        inst_a_token = inst_a_res.json()["access_token"]
        assert "cognicode_refresh_token" in inst_a_res.cookies

        # Second instructor B
        inst_b_res = client.post(
            "/auth/register",
            json={
                "name": "Instructor Beta",
                "email": f"inst_b_{uuid4().hex[:6]}@edu.org",
                "password": "Password123",
                "role": "instructor",
                "invite_code": "inst-secret-code-2026",
            },
        )
        assert inst_b_res.status_code == 201
        inst_b_token = inst_b_res.json()["access_token"]

        # 3. Default student registration (role omitted defaults to student)
        stu_email = f"stu_{uuid4().hex[:6]}@edu.org"
        stu_res = client.post(
            "/auth/register",
            json={
                "name": "Alice Student",
                "email": stu_email,
                "password": "Password123",
            },
        )
        assert stu_res.status_code == 201
        stu_data = stu_res.json()
        stu_id = stu_data["user"]["id"]
        stu_token = stu_data["access_token"]
        assert stu_data["user"]["role"] == "student"

        # 4. Instructor A creates course; Student joins via code
        course_code = f"CS{uuid4().hex[:4].upper()}"
        course_res = client.post(
            "/instructor/courses",
            headers={"Authorization": f"Bearer {inst_a_token}"},
            json={"course_name": "Algorithms II", "course_code": course_code},
        )
        assert course_res.status_code == 201
        course_id = course_res.json()["id"]

        join_res = client.post(
            "/instructor/join-course",
            headers={"Authorization": f"Bearer {stu_token}"},
            json={"course_code": course_code},
        )
        assert join_res.status_code == 200

        # Student sees only joined course
        stu_courses = client.get(
            "/instructor/student/courses",
            headers={"Authorization": f"Bearer {stu_token}"},
        )
        assert stu_courses.status_code == 200
        assert len(stu_courses.json()) == 1
        assert stu_courses.json()[0]["course_code"] == course_code

        # 5. IDOR test: Instructor B MUST NOT view Alice's student details or remind Alice -> 403
        idor_res = client.get(
            f"/instructor/students/{stu_id}",
            headers={"Authorization": f"Bearer {inst_b_token}"},
        )
        assert idor_res.status_code == 403

        idor_rem = client.post(
            f"/instructor/students/{stu_id}/remind",
            headers={"Authorization": f"Bearer {inst_b_token}"},
            json={"topic": "Recursion", "message": "Practice recursion base cases."},
        )
        assert idor_rem.status_code == 403

        # Enrolled Instructor A CAN view student detail and send persisted reminder -> 200 / 201
        ok_detail = client.get(
            f"/instructor/students/{stu_id}",
            headers={"Authorization": f"Bearer {inst_a_token}"},
        )
        assert ok_detail.status_code == 200
        assert ok_detail.json()["student_id"] == stu_id

        ok_rem = client.post(
            f"/instructor/students/{stu_id}/remind",
            headers={"Authorization": f"Bearer {inst_a_token}"},
            json={"topic": "Recursion", "message": "Practice recursion base cases."},
        )
        assert ok_rem.status_code == 201
        rem_id = ok_rem.json()["id"]

        # Student receives & acknowledges reminder
        list_rem = client.get(
            "/instructor/student/reminders",
            headers={"Authorization": f"Bearer {stu_token}"},
        )
        assert list_rem.status_code == 200
        assert len(list_rem.json()) == 1
        assert list_rem.json()[0]["id"] == rem_id

        ack_rem = client.post(
            f"/instructor/student/reminders/{rem_id}/acknowledge",
            headers={"Authorization": f"Bearer {stu_token}"},
        )
        assert ack_rem.status_code == 200
        assert ack_rem.json()["is_read"] is True

        # 6. PDF export scoped to course_id works cleanly
        pdf_res = client.get(
            f"/instructor/cohort-analytics/export-pdf?course_id={course_id}",
            headers={"Authorization": f"Bearer {inst_a_token}"},
        )
        assert pdf_res.status_code == 200
        assert pdf_res.content[:5] == b"%PDF-"

        # 7. Student starts session, submits Quiz (server graded + CDS updated), submits Reflection
        sess_res = client.post(
            "/session/start",
            headers={"Authorization": f"Bearer {stu_token}"},
            json={"topic": "Recursion"},
        )
        assert sess_res.status_code == 201
        sess_id = sess_res.json()["id"]

        q_res = client.get(
            "/quiz/questions?topic=Recursion",
            headers={"Authorization": f"Bearer {stu_token}"},
        )
        assert q_res.status_code == 200
        questions = q_res.json()
        assert len(questions) >= 1
        assert "correct" not in str(questions[0]["options"])

        q_submit = client.post(
            "/quiz/submit",
            headers={"Authorization": f"Bearer {stu_token}"},
            json={
                "session_id": sess_id,
                "answers": [{"question_id": "chk-rec-1", "selected_option": "B"}],
            },
        )
        assert q_submit.status_code == 201
        assert q_submit.json()["passed"] is True
        assert q_submit.json()["score"] == 1

        refl_submit = client.post(
            f"/instructor/reflections/{sess_id}/submit",
            headers={"Authorization": f"Bearer {stu_token}"},
            json={
                "learned_today": "I learned that every recursive function must reach a base case to terminate cleanly. " * 2,
                "mistake_to_avoid": "I must avoid calling the recursive case before checking the terminating base condition. " * 2,
            },
        )
        assert refl_submit.status_code == 201

        # 8. Refresh cookie rotation & logout revocation
        client.cookies.set("cognicode_refresh_token", stu_res.cookies.get("cognicode_refresh_token"))
        ref_res = client.post("/auth/refresh")
        assert ref_res.status_code == 200
        new_stu_token = ref_res.json()["access_token"]
        assert new_stu_token

        # Minted single-use WS ticket succeeds once for WS ticket endpoint and rejects replay
        ticket_res = client.post(
            "/auth/ws-ticket",
            headers={"Authorization": f"Bearer {new_stu_token}"},
            json={"session_id": sess_id},
        )
        assert ticket_res.status_code == 201
        ws_ticket = ticket_res.json()["ticket"]
        assert len(ws_ticket) >= 20

        # Ensure WebSocket handler runs cleanly inside the test SAVEPOINT transaction
        import websocket.chat_handler as ws_mod

        class _NonClosingDBProxy:
            def __init__(self, inner):
                self._inner = inner

            def __enter__(self):
                return self._inner

            def __exit__(self, exc_type, exc_val, exc_tb):
                if exc_type is not None:
                    self._inner.rollback()
                return False

        async def _inline_to_thread(fn, *args, **kwargs):
            return fn(*args, **kwargs)

        monkeypatch.setattr(ws_mod, "SessionLocal", lambda: _NonClosingDBProxy(db_session))
        monkeypatch.setattr(ws_mod.asyncio, "to_thread", _inline_to_thread)

        # Missing ticket (?token=jwt instead of ?ticket=...) must be rejected cleanly
        with client.websocket_connect(f"/ws/chat/{sess_id}?token={new_stu_token}") as bad_ws:
            bad_frame = bad_ws.receive_json()
            assert bad_frame["type"] == "error"
            assert bad_frame["code"] == "auth_failed"

        # Valid ticket connects cleanly, receives ready frame, and handles session_end
        with client.websocket_connect(f"/ws/chat/{sess_id}?ticket={ws_ticket}") as ws:
            ready = ws.receive_json()
            assert ready["type"] == "ready"
            assert ready["session_id"] == sess_id
            ws.send_json({"type": "session_end"})
            ended = ws.receive_json()
            assert ended["type"] == "session_ended"

        # Replaying the exact same single-use ticket must be rejected
        with client.websocket_connect(f"/ws/chat/{sess_id}?ticket={ws_ticket}") as replay_ws:
            err_frame = replay_ws.receive_json()
            assert err_frame["type"] == "error"
            assert err_frame["code"] == "auth_failed"

        # Logout revokes refresh session
        client.cookies.set("cognicode_refresh_token", ref_res.cookies.get("cognicode_refresh_token"))
        out_res = client.post("/auth/logout")
        assert out_res.status_code == 200

        ref_after_logout = client.post("/auth/refresh")
        assert ref_after_logout.status_code == 401

        # 9. Login rate limiting triggers 429 after threshold
        settings = get_settings()
        for idx in range(settings.auth_rate_limit_max):
            r = client.post(
                "/auth/login",
                json={"identifier": stu_email, "password": "WrongPassword1"},
            )
            assert r.status_code == 401

        blocked = client.post(
            "/auth/login",
            json={"identifier": stu_email, "password": "WrongPassword1"},
        )
        assert blocked.status_code == 429
        assert "retry-after" in blocked.headers
    finally:
        app.dependency_overrides.clear()
