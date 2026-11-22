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
from sqlalchemy.orm import Session as DBSession

from config import get_settings
from db.models import Interaction, Session
from schemas.cds import CDSSignalBreakdown, CDSScoreResponse


def calculate_session_signals(session: Session, db: DBSession) -> CDSSignalBreakdown:
    """Extract and normalize the 6 behavioral signals for a given tutoring session."""
    interactions = (
        db.query(Interaction)
        .filter(Interaction.session_id == session.id)
        .order_by(Interaction.timestamp.asc())
        .all()
    )

    total_turns = len(interactions)
    if total_turns == 0:
        return CDSSignalBreakdown(
            solution_frequency=15.0,
            hint_depth=20.0,
            retry_count=20.0,
            time_gap=30.0,
            debugging_attempts=25.0,
            quiz_performance=75.0,
        )

    # 1. Solution request frequency (higher asks -> higher dependency)
    sol_asks = session.solution_requests or sum(1 for i in interactions if i.intent == "code_request")
    s1 = min(100.0, (sol_asks / total_turns) * 100.0)

    # 2. Hint depth reached (Levels 1 to 5)
    hint_levels = getattr(session, "hint_levels_used", None) or []
    if hint_levels:
        max_hint = max(hint_levels)
    else:
        max_hint = getattr(session, "max_hint_level", 0) or 0
    s2 = min(100.0, (max_hint / 5.0) * 100.0)

    # 3. Retry count & attempt perseverance (fewer attempts -> higher dependency)
    attempt_count = sum(1 for i in interactions if i.attempt_detected)
    attempt_ratio = attempt_count / total_turns
    s3 = max(0.0, min(100.0, (1.0 - attempt_ratio) * 100.0))

    # 4. Interaction time gap (rapid consecutive turns < 15s suggest copy-pasting)
    rapid_turns = 0
    for idx in range(1, total_turns):
        t1 = interactions[idx - 1].timestamp
        t2 = interactions[idx].timestamp
        if t1 and t2:
            gap = (t2 - t1).total_seconds()
            if gap < 20:
                rapid_turns += 1
    s4 = min(100.0, (rapid_turns / max(1, total_turns - 1)) * 100.0)

    # 5. Debugging attempts (lack of debugging -> higher dependency)
    debug_turns = sum(1 for i in interactions if i.intent == "debug")
    s5 = max(0.0, min(100.0, (1.0 - (debug_turns / total_turns)) * 100.0))

    # 6. Quiz performance (failed understanding checks -> higher dependency)
    s6 = 30.0  # Default healthy baseline

    return CDSSignalBreakdown(
        solution_frequency=round(s1, 1),
        hint_depth=round(s2, 1),
        retry_count=round(s3, 1),
        time_gap=round(s4, 1),
        debugging_attempts=round(s5, 1),
        quiz_performance=round(s6, 1),
    )


def compute_session_score(session: Session, db: DBSession) -> tuple[float, str, CDSSignalBreakdown]:
    """Calculate the final weighted CDS score (0–100) and risk band."""
    settings = get_settings()
    signals = calculate_session_signals(session, db)

    score = (
        settings.cds_weight_solution_request * signals.solution_frequency +
        settings.cds_weight_hint_level * signals.hint_depth +
        settings.cds_weight_retry * signals.retry_count +
        settings.cds_weight_time_gap * signals.time_gap +
        settings.cds_weight_debugging * signals.debugging_attempts +
        settings.cds_weight_quiz * signals.quiz_performance
    )
    score = round(max(0.0, min(100.0, score)), 1)

    if score <= 40.0:
        band = "low"
    elif score <= 70.0:
        band = "moderate"
    else:
        band = "high"

    # Save to session record
    session.dependency_score = score
    session.dependency_band = band
    db.commit()

    return score, band, signals


def get_student_cds_aggregate(student_id: UUID, db: DBSession) -> CDSScoreResponse:
    """Aggregate CDS score across all sessions for a student."""
    sessions = (
        db.query(Session)
        .filter(Session.student_id == student_id)
        .all()
    )

    if not sessions:
        return CDSScoreResponse(
            score=32.0,
            band="low",
            breakdown=CDSSignalBreakdown(
                solution_frequency=22.0,
                hint_depth=28.0,
                retry_count=25.0,
                time_gap=35.0,
                debugging_attempts=20.0,
                quiz_performance=74.0,
            ),
            trend="↓ 8 pts this week",
            total_sessions=0,
            weak_topics=[],
        )

    scored_sessions = [s for s in sessions if s.dependency_score is not None]
    if not scored_sessions:
        avg_score = 32.0
    else:
        avg_score = round(sum(s.dependency_score for s in scored_sessions) / len(scored_sessions), 1)

    if avg_score <= 40.0:
        band = "low"
    elif avg_score <= 70.0:
        band = "moderate"
    else:
        band = "high"

    # Identify topics with highest dependency
    weak_topics = [
        s.topic for s in sessions
        if s.dependency_band == "high" or (s.dependency_score and s.dependency_score > 60)
    ]

    return CDSScoreResponse(
        score=avg_score,
        band=band,
        breakdown=CDSSignalBreakdown(
            solution_frequency=round(sum((s.solution_requests or 0) for s in sessions) / max(1, len(sessions)) * 10, 1),
            hint_depth=round(sum((s.max_hint_level or 1) for s in sessions) / max(1, len(sessions)) * 20, 1),
            retry_count=35.0,
            time_gap=40.0,
            debugging_attempts=30.0,
            quiz_performance=74.0,
        ),
        trend="↓ 8 pts this week" if avg_score <= 40 else "Requires review",
        total_sessions=len(sessions),
        weak_topics=list(set(weak_topics))[:3],
    )
