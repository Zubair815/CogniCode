# CogniCode — Backend Analysis & Correction Report

## 1. Executive Summary

A full end-to-end backend analysis and correction pass was executed across the CogniCode FastAPI + PostgreSQL + LangGraph + ChromaDB backend (`backend/`). Every layer of the request lifecycle—from HTTP/WebSocket entry points, middleware, JWT authentication, role-based & ownership authorization, Pydantic validation, service/agent orchestration, and SQLAlchemy database persistence—was traced against the live React frontend (`frontend/src/`).

All identified runtime defects, broken multi-turn flows, authorization gaps, N+1 queries, and schema mismatches were resolved with minimal, targeted changes while preserving 100% of existing API contracts and frontend behavior.

---

## 2. End-to-End Backend Functionality Map

| Feature Area | Entry Point & Route | Auth & Authorization | Validation | Service / Agent Layer | Persistence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Authentication** | `POST /auth/register`<br>`POST /auth/login`<br>`GET /auth/me` | Public (`register`, `login`)<br>`get_current_user` (`me`) | `RegisterRequest`, `LoginRequest` (email normalization, role enum, min password length) | `auth.jwt_handler` (bcrypt cost 12, HS256 JWT with `sub` & `role`) | PostgreSQL `users` |
| **Tutoring Sessions** | `POST /session/start`<br>`GET /session/my-sessions`<br>`GET /session/{id}/history`<br>`POST /session/{id}/end`<br>`GET /session/student/cds-summary`<br>`GET /session/{id}/cds` | `require_student` + strict `session.student_id == current_user.id` ownership verification | `StartSessionRequest`, UUID path validation | `core.cds_engine` (`compute_session_score`, `get_student_cds_aggregate`) | PostgreSQL `sessions`, `interactions` |
| **Real-Time Socratic Chat** | `WS /ws/chat/{session_id}?token=<JWT>` | `_authenticate` (JWT) + `_load_session` (session ownership check) | JSON frame schema (`ping`, `chat`, `code_submission`, `session_end`) | LangGraph `tutoring_graph`: `CodeAnalysisAgent` → `StudentMemoryAgent` → `ConversationManager` → (`SocraticTutor` \| `HintGenerator` \| `AssessmentAgent` \| `DebuggingCoach`) | PostgreSQL `interactions`, `sessions`; ChromaDB `student_memories`, `bug_traps` |
| **Instructor Courses & Analytics** | `GET /instructor/courses`<br>`POST /instructor/courses`<br>`POST /instructor/join-course`<br>`GET /instructor/cohort-analytics`<br>`GET /instructor/cohort-analytics/export-pdf`<br>`GET /instructor/students/{id}`<br>`GET /instructor/heatmap` | `require_role("instructor")` on oversight routes; `get_current_user` on `join-course` | `CourseCreateRequest`, `JoinCourseRequest` | `core.cds_engine.get_student_cds_aggregate`, `core.report_generator.generate_cohort_pdf_report` | PostgreSQL `instructor_courses`, `users`, `sessions`, `reflections` |
| **Metacognitive Reflections** | `GET /instructor/reflections/student`<br>`POST /instructor/reflections/{session_id}/generate`<br>`POST /instructor/reflections/{session_id}/submit` | `get_current_user` + strict `sess.student_id == current_user.id` ownership verification | `ReflectionSubmitRequest` (100-char minimum metacognitive depth) | `ReflectionAgent` (`generate_draft`, `save_reflection`) + `StudentMemoryAgent` | PostgreSQL `reflections`, `sessions`; ChromaDB `student_memories` |

---

## 3. Issues Found & Fixes Applied

### Issue 1: `AttributeError` Crash on Instructor Cohort Analytics, PDF Export, and Student Drilldown
- **Problem:** Calling `GET /instructor/cohort-analytics`, `GET /instructor/cohort-analytics/export-pdf`, or `GET /instructor/students/{student_id}` when one or more students exist raised `AttributeError: 'CDSScoreResponse' object has no attribute 'overall_score'`.
- **Root Cause:** `get_student_cds_aggregate()` in `backend/core/cds_engine.py` returns a `CDSScoreResponse` model with fields `score`, `band`, and `breakdown`, whereas `backend/api/instructor.py` accessed `summary.overall_score`, `summary.risk_band`, and `summary.signals`. Additionally, `get_student_cds_aggregate()` did not clamp `solution_frequency` and `hint_depth` to `100.0`, which could trigger a Pydantic `ValidationError` (`le=100`) if a student had more than 10 solution requests in a single session.
- **Files Modified:**
  - `backend/schemas/cds.py`
  - `backend/core/cds_engine.py`
  - `backend/api/instructor.py`
- **Fix Applied:**
  - Updated `backend/api/instructor.py` to read `summary.score`, `summary.band`, and `summary.breakdown`.
  - Added `@property` aliases (`overall_score`, `risk_band`, `signals`) on `CDSScoreResponse` in `backend/schemas/cds.py` for full backward compatibility.
  - Clamped `solution_frequency` and `hint_depth` to `min(100.0, ...)` in `get_student_cds_aggregate()`.

### Issue 2: Multi-Turn Conceptual Check Quiz Gate Disconnected Across WebSocket Turns
- **Problem:** When a student requested a Level 3 hint without an attempt or prior quiz pass:
  1. `HintGenerator.process()` set `understanding_check_required = True` and returned an intro message telling the student to answer the concept check question below, but `hint_generator_node` terminated without invoking `AssessmentAgent` to render the multiple-choice question.
  2. On the following WebSocket message, when the student replied with `"A"`, `"B"`, `"C"`, or `"D"`, `_handle_chat` created a fresh `new_state()` with `understanding_check_required = False` and `quiz_question = None`, causing `ConversationManager` to classify the answer as `"other"` instead of grading the quiz.
- **Root Cause:** Missing handoff from `hint_generator_node` to `_assessment_agent.process(state)` when `understanding_check_required` is triggered, and stateless WebSocket turn initialization that did not restore active quiz state or prior quiz completion from session interaction history.
- **Files Modified:**
  - `backend/agents/graph.py`
  - `backend/websocket/chat_handler.py`
- **Fix Applied:**
  - Updated `hint_generator_node` in `backend/agents/graph.py` to invoke `_assessment_agent.process(state)` whenever `understanding_check_required` is set and `quiz_question` is not yet populated, appending the multiple-choice question directly to the response.
  - Updated `_handle_chat` in `backend/websocket/chat_handler.py` to inspect recent session interactions and restore `understanding_check_passed = True` (if `"Concept Check Passed"` appears in prior turns) or `understanding_check_required = True` + `quiz_question` (if the preceding assistant turn presented a `"Conceptual Understanding Check"`).

### Issue 3: Student Long-Term Vector Memory Not Retrieved or Injected Into Socratic Tutor
- **Problem:** `StudentMemoryAgent.personalize_context()` always returned `{}` during live WebSocket tutoring sessions, and `SocraticTutor` did not include `state["system_guidance"]` in its LLM system prompt.
- **Root Cause:** `new_state()` initializes `state["student_id"]`, whereas `StudentMemoryAgent.personalize_context()` looked up `state.get("user_id", "")` (which was empty) and `state.get("student_code", "")` (whereas `CodeAnalysisAgent` stores extracted code in `state["metadata"]["code_analysis"]["code_raw"]`). Furthermore, `SocraticTutor.generate_response()` formatted `_SYSTEM_PROMPT` without appending `state.get("system_guidance")`.
- **Files Modified:**
  - `backend/agents/memory.py`
  - `backend/agents/socratic_tutor.py`
- **Fix Applied:**
  - Updated `StudentMemoryAgent.personalize_context()` to resolve `student_id = str(state.get("student_id") or state.get("user_id") or "")` and fallback `student_code` to `code_meta.get("code_raw")`.
  - Updated `SocraticTutor.generate_response()` to append `state.get("system_guidance")` to `system_prompt` when available.

### Issue 4: Missing Real-Time CDS Score Recomputation & Behavioral Telemetry Counters on WebSocket Turns
- **Problem:** During WebSocket chat turns, `Interaction.time_since_last` remained `None`, `Session.retry_count` and `Session.debugging_attempts` remained `0`, and `Session.dependency_score` / `Session.dependency_band` were not updated unless `GET /session/{session_id}/cds` was explicitly called.
- **Root Cause:** `_handle_chat` in `backend/websocket/chat_handler.py` and `end_session` in `backend/api/session.py` did not compute `time_since_last`, increment `retry_count`/`debugging_attempts`, or invoke `compute_session_score(session, db)`.
- **Files Modified:**
  - `backend/websocket/chat_handler.py`
  - `backend/api/session.py`
- **Fix Applied:**
  - Computed `time_since_last` in seconds from the previous interaction's UTC timestamp.
  - Incremented `session.retry_count` when `attempt_detected` is `True` and `session.debugging_attempts` when `intent == "debug"`.
  - Invoked `compute_session_score(session, db)` after persisting each interaction and when closing a session via WebSocket `session_end` or `POST /session/{session_id}/end`.

### Issue 5: Missing Session Ownership Check (IDOR) on Reflection Endpoints & Role Check on Student Drilldown
- **Problem:** `POST /instructor/reflections/{session_id}/generate` and `POST /instructor/reflections/{session_id}/submit` loaded `Session` by `session_id` without verifying that `sess.student_id == current_user.id`. Additionally, `GET /instructor/students/{student_id}` did not verify `student.role == "student"`.
- **Root Cause:** Missing ownership check in `generate_reflection_draft` and `submit_reflection`, and missing role check in `get_student_detail`.
- **Files Modified:**
  - `backend/api/instructor.py`
- **Fix Applied:**
  - Added strict ownership check (`if sess.student_id != current_user.id: raise HTTPException(status_code=403, ...)`) on both reflection generation and reflection submission endpoints.
  - Added `student.role != "student"` check in `get_student_detail`.

### Issue 6: Course Creation Input Normalization, Join-Code Collision Handling & Rollback Safety
- **Problem:** `POST /instructor/courses` did not strip whitespace from `course_name` or `course_code`, only checked for random code collision once, and did not wrap `db.commit()` in an `IntegrityError` rollback handler.
- **Root Cause:** Unvalidated whitespace and unguarded commit in `create_course`.
- **Files Modified:**
  - `backend/api/instructor.py`
- **Fix Applied:**
  - Stripped and validated `course_name` (min 3 characters) and `course_code` (min 4 characters, uppercase).
  - Returned `409 Conflict` if an explicitly provided `course_code` is already taken, retried auto-generated join codes up to 5 times, and wrapped `db.commit()` in `try / except IntegrityError` with `db.rollback()`.

### Issue 7: Duplicate & N+1 SQL Queries in Cohort Analytics and Student Reflections
- **Problem:**
  - `get_cohort_analytics` queried `Session` twice per student (`2 * N` queries).
  - `get_student_detail` queried `Session` twice (`get_student_cds_aggregate` + session list).
  - `get_student_reflections` ran `db.get(Session, r.session_id)` inside a loop (`N + 1` queries).
- **Files Modified:**
  - `backend/core/cds_engine.py`
  - `backend/api/instructor.py`
- **Fix Applied:**
  - Added optional `sessions: list[Session] | None = None` parameter to `get_student_cds_aggregate()`.
  - Batched all student session lookups in `get_cohort_analytics` into a single `Session.student_id.in_(student_ids)` query and reused the loaded sessions in `get_student_cds_aggregate()` and `get_student_detail()`.
  - Batched session lookups in `get_student_reflections` into a single `Session.id.in_(session_ids)` query.

### Issue 8: ChromaDB `build_from_config` Deprecation & Dynamic `get_llm_client()` Settings Resolution
- **Problem:** `FastLocalEmbeddingFunction` in `backend/vector/chroma_client.py` triggered a ChromaDB deprecation warning because `build_from_config` was missing, and `get_llm_client()` in `backend/llm/__init__.py` read a module-level `_settings` cache instead of calling `get_settings()` on each call as documented.
- **Files Modified:**
  - `backend/vector/chroma_client.py`
  - `backend/llm/__init__.py`
- **Fix Applied:**
  - Added `@staticmethod def build_from_config(config: dict)` on `FastLocalEmbeddingFunction`.
  - Updated `get_llm_client()` to call `get_settings()` dynamically.

---

## 4. Security, Database, API Contract & AI Integration Audit

- **Authentication & Authorization:**
  - Passwords hashed with `bcrypt` (cost factor 12).
  - JWT tokens signed with `HS256`, validated on every protected HTTP endpoint (`HTTPBearer`) and WebSocket handshake (`?token=`).
  - Role guards (`require_student`, `require_instructor`, `require_role`) and resource ownership checks (`session.student_id == current_user.id`) enforced across all session and reflection routes.
- **Database Integrity (Pure PostgreSQL):**
  - SQLAlchemy 2.0 connection pooling configured with `pool_pre_ping=True`, `pool_size=10`, `max_overflow=20`.
  - All transactions properly committed or rolled back on exception; request-scoped sessions closed in `finally` blocks (`get_db` and `chat_websocket`).
- **Frontend-Backend Contract Compatibility:**
  - Verified all endpoint paths, status codes, and response shapes against `frontend/src/services/api.js`, `AuthContext.jsx`, `useChatSession.js`, `Dashboard.jsx`, `Chat.jsx`, `Reflections.jsx`, and `InstructorDashboard.jsx`. No breaking contract changes were introduced.
- **AI / LLM & Multi-Agent Resilience:**
  - `GroqClient`, `ClaudeClient`, and `OllamaClient` enforce timeouts and raise normalized `LLMError` exceptions caught gracefully by agents and WebSocket handlers.
  - `SocraticTutor`, `HintGenerator`, and `DebuggingCoach` enforce strict anti-code-leakage filters and adversarial prompt-injection defenses.

---

## 5. Validation Results

- **Backend Test Suite (`pytest`):** Executed and passed all unit and integration tests across `test_agents.py`, `test_phase4.py`, `test_phase5.py`, and `test_phase6.py` (including new regression tests for `CDSScoreResponse` aliases, `StudentMemoryAgent` state lookup, Level 3 hint concept-check handoff, and reflection session ownership `403` enforcement).
- **Frontend Build & Lint Check:** Executed `npm --prefix frontend run lint` and `npm --prefix frontend run build` with zero errors.
