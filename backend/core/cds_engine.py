"""
Module: backend.core.cds_engine
Purpose: Mathematical Cognitive Dependency Score (CDS) engine.

Calculates the 6-factor behavioral telemetry metric:
  CDS = w1*S1 + w2*S2 + w3*S3 + w4*S4 + w5*S5 + w6*S6

Bands:
  Low: 0 to 40
  Moderate: 41 to 70
  High: 71 to 100

Created: 18/11/2026
"""

from uuid import UUID
from sqlalchemy import func
from sqlalchemy.orm import Session as DBSession

from config import get_settings
from db.models import Interaction, QuizResult, Session
from schemas.cds import CDSSignalBreakdown, CDSScoreResponse


def calculate_session_signals(session: Session, db: DBSession) -> CDSSignalBreakdown:
    """
    Extract and normalize the 6 behavioral signals (0-100) for a tutoring session.

    Signal directionality (aligned with UI & pedagogy):
      - solution_frequency:  % of turns asking directly for full code (lower = better; increases CDS)
      - hint_depth:          max hint level reached / 5 * 100 (lower = better; increases CDS)
      - retry_count:         % of turns with student code/reasoning attempt (higher = better; reduces CDS)
      - time_gap:            % of inter-turn gaps >= 20s / deliberate pacing (higher = better; reduces CDS)
      - debugging_attempts:  % of turns showing debugging effort (higher = better; reduces CDS)
      - quiz_performance:    % accuracy on session conceptual quizzes (higher = better; reduces CDS)
    """
    interactions = (
        db.query(Interaction)
        .filter(Interaction.session_id == session.id)
        .order_by(Interaction.timestamp.asc())
        .all()
    )
    quiz_rows = (
        db.query(QuizResult)
        .filter(QuizResult.session_id == session.id)
        .all()
    )

    total_turns = len(interactions)
    if total_turns == 0 and not quiz_rows:
        return CDSSignalBreakdown(
            solution_frequency=0.0,
            hint_depth=0.0,
            retry_count=0.0,
            time_gap=0.0,
            debugging_attempts=0.0,
            quiz_performance=0.0,
        )

    # 1. Solution request frequency (risk: higher -> higher CDS)
    if total_turns > 0:
        sol_asks = session.solution_requests or sum(
            1 for i in interactions if i.intent == "code_request"
        )
        s1 = min(100.0, (sol_asks / total_turns) * 100.0)
    else:
        s1 = 0.0

    # 2. Hint depth reached (risk: higher -> higher CDS)
    hint_levels = getattr(session, "hint_levels_used", None) or []
    max_hint = max(hint_levels) if hint_levels else (getattr(session, "max_hint_level", 0) or 0)
    s2 = min(100.0, (max_hint / 5.0) * 100.0)

    # 3. Attempt perseverance (protective: higher -> lower CDS)
    if total_turns > 0:
        attempt_count = sum(1 for i in interactions if i.attempt_detected)
        s3 = max(0.0, min(100.0, (attempt_count / total_turns) * 100.0))
    else:
        s3 = 0.0

    # 4. Deliberate response pacing (protective: >= 20s between turns -> higher -> lower CDS)
    if total_turns > 1:
        deliberate_turns = 0
        for idx in range(1, total_turns):
            gap = interactions[idx].time_since_last
            if gap is None:
                t1 = interactions[idx - 1].timestamp
                t2 = interactions[idx].timestamp
                if t1 and t2:
                    gap = (t2 - t1).total_seconds()
            if gap is None or gap >= 20:
                deliberate_turns += 1
        s4 = max(0.0, min(100.0, (deliberate_turns / (total_turns - 1)) * 100.0))
    elif total_turns == 1:
        s4 = 100.0
    else:
        s4 = 0.0

    # 5. Independent debugging effort (protective: higher -> lower CDS)
    if total_turns > 0:
        debug_turns = sum(1 for i in interactions if i.intent == "debug")
        s5 = max(0.0, min(100.0, (debug_turns / total_turns) * 100.0))
    else:
        s5 = 0.0

    # 6. Conceptual quiz accuracy (protective: higher -> lower CDS)
    total_q = sum(q.total_questions for q in quiz_rows)
    if total_q > 0:
        total_correct = sum(q.score for q in quiz_rows)
        s6 = max(0.0, min(100.0, (total_correct / total_q) * 100.0))
    else:
        s6 = 0.0

    return CDSSignalBreakdown(
        solution_frequency=round(s1, 1),
        hint_depth=round(s2, 1),
        retry_count=round(s3, 1),
        time_gap=round(s4, 1),
        debugging_attempts=round(s5, 1),
        quiz_performance=round(s6, 1),
    )


def compute_session_score(
    session: Session,
    db: DBSession,
    commit: bool = False,
) -> tuple[float, str, CDSSignalBreakdown]:
    """
    Calculate the weighted CDS score (0-100) and risk band without breaking
    caller transaction boundaries (calls db.flush() unless commit=True).
    """
    settings = get_settings()
    signals = calculate_session_signals(session, db)

    interaction_count = (
        db.query(func.count(Interaction.id))
        .filter(Interaction.session_id == session.id)
        .scalar()
        or 0
    )
    quiz_count = (
        db.query(func.count(QuizResult.id))
        .filter(QuizResult.session_id == session.id)
        .scalar()
        or 0
    )

    if interaction_count == 0 and quiz_count == 0:
        score = 0.0
        band = "low"
    else:
        quiz_risk = (100.0 - signals.quiz_performance) if quiz_count > 0 else 50.0
        score = (
            settings.cds_weight_solution_request * signals.solution_frequency
            + settings.cds_weight_hint_level * signals.hint_depth
            + settings.cds_weight_retry * (100.0 - signals.retry_count)
            + settings.cds_weight_time_gap * (100.0 - signals.time_gap)
            + settings.cds_weight_debugging * (100.0 - signals.debugging_attempts)
            + settings.cds_weight_quiz * quiz_risk
        )
        score = round(max(0.0, min(100.0, score)), 1)

        if score <= 40.0:
            band = "low"
        elif score <= 70.0:
            band = "moderate"
        else:
            band = "high"

    session.dependency_score = score
    session.dependency_band = band
    db.flush()
    if commit:
        db.commit()

    return score, band, signals


def get_student_cds_aggregate(
    student_id: UUID,
    db: DBSession,
    sessions: list[Session] | None = None,
) -> CDSScoreResponse:
    """Aggregate real CDS score and behavioral telemetry across a student's sessions."""
    if sessions is None:
        sessions = (
            db.query(Session)
            .filter(Session.student_id == student_id)
            .all()
        )

    if not sessions:
        return CDSScoreResponse(
            score=0.0,
            band="low",
            breakdown=CDSSignalBreakdown(
                solution_frequency=0.0,
                hint_depth=0.0,
                retry_count=0.0,
                time_gap=0.0,
                debugging_attempts=0.0,
                quiz_performance=0.0,
            ),
            trend="No sessions yet",
            total_sessions=0,
            weak_topics=[],
        )

    session_ids = [s.id for s in sessions]
    interactions = (
        db.query(Interaction)
        .filter(Interaction.session_id.in_(session_ids))
        .order_by(Interaction.timestamp.asc())
        .all()
    )
    quiz_rows = (
        db.query(QuizResult)
        .filter(QuizResult.student_id == student_id)
        .all()
    )

    scored_sessions = [s for s in sessions if s.dependency_score is not None]
    avg_score = (
        round(sum(s.dependency_score for s in scored_sessions) / len(scored_sessions), 1)
        if scored_sessions
        else 0.0
    )

    if avg_score <= 40.0:
        band = "low"
    elif avg_score <= 70.0:
        band = "moderate"
    else:
        band = "high"

    weak_topics = [
        s.topic
        for s in sessions
        if s.dependency_band == "high" or (s.dependency_score and s.dependency_score > 60)
    ]

    total_turns = len(interactions)
    if total_turns > 0:
        total_sol_asks = sum((s.solution_requests or 0) for s in sessions)
        sol_freq = min(100.0, round((total_sol_asks / total_turns) * 100.0, 1))
        attempt_turns = sum(1 for i in interactions if i.attempt_detected)
        retry_rate = min(100.0, round((attempt_turns / total_turns) * 100.0, 1))
        debug_turns = sum(1 for i in interactions if i.intent == "debug")
        debug_rate = min(100.0, round((debug_turns / total_turns) * 100.0, 1))

        gaps = [i.time_since_last for i in interactions if i.time_since_last is not None]
        if gaps:
            deliberate = sum(1 for g in gaps if g >= 20)
            time_gap_rate = round((deliberate / len(gaps)) * 100.0, 1)
        else:
            time_gap_rate = 100.0
    else:
        sol_freq = 0.0
        retry_rate = 0.0
        debug_rate = 0.0
        time_gap_rate = 0.0

    hint_depth = min(
        100.0,
        round(sum((s.max_hint_level or 0) for s in sessions) / max(1, len(sessions)) * 20.0, 1),
    )

    total_q = sum(q.total_questions for q in quiz_rows)
    quiz_perf = (
        min(100.0, round((sum(q.score for q in quiz_rows) / total_q) * 100.0, 1))
        if total_q > 0
        else 0.0
    )

    return CDSScoreResponse(
        score=avg_score,
        band=band,
        breakdown=CDSSignalBreakdown(
            solution_frequency=sol_freq,
            hint_depth=hint_depth,
            retry_count=retry_rate,
            time_gap=time_gap_rate,
            debugging_attempts=debug_rate,
            quiz_performance=quiz_perf,
        ),
        trend=f"{len(sessions)} session{'s' if len(sessions) != 1 else ''} recorded",
        total_sessions=len(sessions),
        weak_topics=list(dict.fromkeys(weak_topics))[:3],
    )
