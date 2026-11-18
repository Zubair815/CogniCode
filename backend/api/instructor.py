"""
Module: backend.api.instructor
Purpose: Instructor analytics, cohort oversight, courses, and reflection endpoints.

Endpoints:
  - GET  /instructor/courses
  - POST /instructor/courses
  - GET  /instructor/cohort-analytics
  - GET  /instructor/students/{student_id}
  - GET  /instructor/heatmap
  - POST /instructor/join-course  (student joins course)
  - GET  /instructor/reflections/student  (student reflection journal)
  - POST /instructor/reflections/{session_id}/generate  (generate AI draft reflection)
  - POST /instructor/reflections/{session_id}/submit    (submit reflection)

Created: 18/11/2026
"""

import logging
import random
import string
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session as DBSession

from auth.dependencies import get_current_user, require_role
from db.models import DependencyHistory, InstructorCourse, Reflection, Session, User
from db.session import get_db
from agents.reflection import ReflectionAgent
from core.cds_engine import calculate_session_signals, get_student_cds_aggregate
from core.report_generator import generate_cohort_pdf_report
from schemas.instructor import (
    CohortOverviewResponse,
    CourseCreateRequest,
    CourseResponse,
    HighRiskStudentSummary,
    JoinCourseRequest,
    JoinCourseResponse,
    ReflectionDraftResponse,
    ReflectionResponse,
    ReflectionSubmitRequest,
    StudentDetailResponse,
    StudentSessionSummary,
    TopicHeatmapEntry,
)

logger = logging.getLogger("cognicode.api.instructor")

router = APIRouter(prefix="/instructor", tags=["Instructor Analytics & Courses"])
_reflection_agent = ReflectionAgent()


def _generate_course_code(prefix: str = "CS") -> str:
    """Generate a random 6-character course join code like CS104A."""
    num = random.randint(100, 999)
    char = random.choice(string.ascii_uppercase)
    return f"{prefix}{num}{char}"


# =============================================================================
# COURSES MANAGEMENT
# =============================================================================

@router.get(
    "/courses",
    response_model=list[CourseResponse],
    summary="List instructor courses",
)
def list_instructor_courses(
    current_user: User = Depends(require_role("instructor")),
    db: DBSession = Depends(get_db),
) -> list[CourseResponse]:
    courses = (
        db.query(InstructorCourse)
        .filter(InstructorCourse.instructor_id == current_user.id)
        .order_by(InstructorCourse.created_at.desc())
        .all()
    )
    result = []
    for c in courses:
        enrolled = len(c.enrolled_students or [])
        result.append(
            CourseResponse(
                id=c.id,
                instructor_id=c.instructor_id,
                course_name=c.course_name,
                course_code=c.course_code,
                description=c.description,
                enrolled_count=enrolled,
                created_at=c.created_at,
            )
        )
    return result


@router.post(
    "/courses",
    response_model=CourseResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new course",
)
def create_course(
    payload: CourseCreateRequest,
    current_user: User = Depends(require_role("instructor")),
    db: DBSession = Depends(get_db),
) -> CourseResponse:
    code = payload.course_code.upper() if payload.course_code else _generate_course_code()
    existing = db.query(InstructorCourse).filter(InstructorCourse.course_code == code).first()
    if existing:
        code = _generate_course_code()

    course = InstructorCourse(
        instructor_id=current_user.id,
        course_name=payload.course_name,
        course_code=code,
        description=payload.description,
        enrolled_students=[],
    )
    db.add(course)
    db.commit()
    db.refresh(course)

    return CourseResponse(
        id=course.id,
        instructor_id=course.instructor_id,
        course_name=course.course_name,
        course_code=course.course_code,
        description=course.description,
        enrolled_count=0,
        created_at=course.created_at,
    )


@router.post(
    "/join-course",
    response_model=JoinCourseResponse,
    summary="Student enrolls in a course via join code",
)
def join_course(
    payload: JoinCourseRequest,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
) -> JoinCourseResponse:
    code = payload.course_code.strip().upper()
    course = db.query(InstructorCourse).filter(InstructorCourse.course_code == code).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Course with join code '{code}' not found.",
        )

    enrolled = list(course.enrolled_students or [])
    user_str = str(current_user.id)
    if user_str not in enrolled:
        enrolled.append(user_str)
        course.enrolled_students = enrolled
        db.commit()

    return JoinCourseResponse(
        success=True,
        course_id=course.id,
        course_name=course.course_name,
        course_code=course.course_code,
        message=f"Successfully enrolled in {course.course_name}.",
    )


# =============================================================================
# COHORT ANALYTICS & HIGH-RISK ROSTER
# =============================================================================

@router.get(
    "/cohort-analytics",
    response_model=CohortOverviewResponse,
    summary="Cohort aggregate CDS statistics and at-risk students",
)
def get_cohort_analytics(
    current_user: User = Depends(require_role("instructor")),
    db: DBSession = Depends(get_db),
) -> CohortOverviewResponse:
    # Gather students from instructor's courses
    courses = db.query(InstructorCourse).filter(InstructorCourse.instructor_id == current_user.id).all()
    enrolled_ids = set()
    for c in courses:
        for sid in (c.enrolled_students or []):
            try:
                enrolled_ids.add(UUID(sid))
            except ValueError:
                pass

    # If no courses yet, fallback to all students in system for demo/development
    students = []
    if enrolled_ids:
        students = db.query(User).filter(User.id.in_(enrolled_ids)).all()
    else:
        students = db.query(User).filter(User.role == "student").all()

    total_students = len(students)
    if total_students == 0:
        return CohortOverviewResponse(
            total_students=0,
            average_cds=0.0,
            high_risk_count=0,
            moderate_risk_count=0,
            low_risk_count=0,
            distribution={"low": 0, "moderate": 0, "high": 0},
            high_risk_students=[],
        )

    high_risk: list[HighRiskStudentSummary] = []
    scores = []
    dist = {"low": 0, "moderate": 0, "high": 0}

    for s in students:
        summary = get_student_cds_aggregate(s.id, db)
        score = summary.overall_score
        band = summary.risk_band
        scores.append(score)
        dist[band] = dist.get(band, 0) + 1

        # Sessions for student to find topics
        sessions = db.query(Session).filter(Session.student_id == s.id).all()
        struggling_topics = [sess.topic for sess in sessions if sess.dependency_score > 60.0]
        max_h = max([max(sess.hint_levels_used or [0]) for sess in sessions], default=0)
        sol_asks = sum(sess.solution_requests for sess in sessions)

        if band == "high" or score >= 65.0:
            high_risk.append(
                HighRiskStudentSummary(
                    student_id=s.id,
                    name=s.name,
                    email=s.email,
                    cds_score=score,
                    risk_band=band,
                    topics_struggling=list(set(struggling_topics))[:3],
                    solution_requests=sol_asks,
                    max_hint_level=max_h,
                )
            )

    avg_score = round(sum(scores) / max(1, len(scores)), 1)
    high_risk.sort(key=lambda x: x.cds_score, reverse=True)

    return CohortOverviewResponse(
        total_students=total_students,
        average_cds=avg_score,
        high_risk_count=dist["high"],
        moderate_risk_count=dist["moderate"],
        low_risk_count=dist["low"],
        distribution=dist,
        high_risk_students=high_risk,
    )


@router.get(
    "/cohort-analytics/export-pdf",
    summary="Export PDF Audit Report for Cohort CDS",
)
def export_cohort_pdf(
    current_user: User = Depends(require_role("instructor")),
    db: DBSession = Depends(get_db),
):
    cohort = get_cohort_analytics(current_user=current_user, db=db)
    pdf_bytes = generate_cohort_pdf_report(cohort, course_name="Data Structures & Algorithms")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="cognicode_cohort_report.pdf"'},
    )


# =============================================================================
# INDIVIDUAL STUDENT DRILLDOWN
# =============================================================================

@router.get(
    "/students/{student_id}",
    response_model=StudentDetailResponse,
    summary="Detailed student profile, 6-factor CDS radar, and sessions",
)
def get_student_detail(
    student_id: UUID,
    current_user: User = Depends(require_role("instructor")),
    db: DBSession = Depends(get_db),
) -> StudentDetailResponse:
    student = db.get(User, student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")

    summary = get_student_cds_aggregate(student.id, db)
    sessions = (
        db.query(Session)
        .filter(Session.student_id == student.id)
        .order_by(Session.started_at.desc())
        .all()
    )

    session_summaries = [
        StudentSessionSummary(
            session_id=sess.id,
            topic=sess.topic,
            started_at=sess.started_at,
            dependency_score=sess.dependency_score,
            dependency_band=sess.dependency_band or "low",
            solution_requests=sess.solution_requests,
            reflection_stored=sess.reflection_stored,
        )
        for sess in sessions
    ]

    reflections = (
        db.query(Reflection)
        .filter(Reflection.student_id == student.id)
        .order_by(Reflection.created_at.desc())
        .all()
    )
    ref_list = [
        {
            "id": str(r.id),
            "session_id": str(r.session_id),
            "learned_today": r.learned_today,
            "mistake_to_avoid": r.mistake_to_avoid,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in reflections
    ]

    return StudentDetailResponse(
        student_id=student.id,
        name=student.name,
        email=student.email,
        preferred_language=student.preferred_language or "Python",
        overall_cds=summary.overall_score,
        risk_band=summary.risk_band,
        signals=summary.signals,
        sessions=session_summaries,
        reflections=ref_list,
    )


# =============================================================================
# TOPIC HEATMAP
# =============================================================================

@router.get(
    "/heatmap",
    response_model=list[TopicHeatmapEntry],
    summary="Topic-by-topic dependency risk matrix",
)
def get_topic_heatmap(
    current_user: User = Depends(require_role("instructor")),
    db: DBSession = Depends(get_db),
) -> list[TopicHeatmapEntry]:
    sessions = db.query(Session).all()
    by_topic: dict[str, list[Session]] = {}
    for sess in sessions:
        topic = sess.topic or "General"
        by_topic.setdefault(topic, []).append(sess)

    # Provide default CS foundational topics if few sessions exist
    default_topics = [
        "Recursion & Base Cases",
        "Binary Search Trees",
        "Dynamic Programming",
        "Linked List Pointers",
        "Graph Traversal (BFS/DFS)",
        "Sorting Algorithms",
    ]
    for dt in default_topics:
        if dt not in by_topic:
            by_topic[dt] = []

    entries = []
    for topic, s_list in by_topic.items():
        if not s_list:
            entries.append(
                TopicHeatmapEntry(
                    topic=topic,
                    student_count=0,
                    average_cds=25.0,
                    risk_band="low",
                    high_risk_count=0,
                    solution_ratio=0.1,
                )
            )
            continue

        scores = [s.dependency_score for s in s_list]
        avg_score = round(sum(scores) / len(scores), 1)
        high_risk_cnt = sum(1 for s in s_list if s.dependency_score >= 71.0)
        total_sol_reqs = sum(s.solution_requests for s in s_list)
        sol_ratio = round(min(1.0, total_sol_reqs / max(1, len(s_list) * 3)), 2)

        band = "low"
        if avg_score >= 71.0:
            band = "high"
        elif avg_score >= 41.0:
            band = "moderate"

        entries.append(
            TopicHeatmapEntry(
                topic=topic,
                student_count=len(set(s.student_id for s in s_list)),
                average_cds=avg_score,
                risk_band=band,
                high_risk_count=high_risk_cnt,
                solution_ratio=sol_ratio,
            )
        )

    entries.sort(key=lambda e: e.average_cds, reverse=True)
    return entries


# =============================================================================
# STUDENT REFLECTION JOURNAL
# =============================================================================

@router.get(
    "/reflections/student",
    response_model=list[ReflectionResponse],
    summary="Get authenticated student's reflection journal",
)
def get_student_reflections(
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
) -> list[ReflectionResponse]:
    reflections = (
        db.query(Reflection)
        .filter(Reflection.student_id == current_user.id)
        .order_by(Reflection.created_at.desc())
        .all()
    )
    result = []
    for r in reflections:
        sess = db.get(Session, r.session_id)
        topic_name = sess.topic if sess else "General Programming"
        result.append(
            ReflectionResponse(
                id=r.id,
                session_id=r.session_id,
                student_id=r.student_id,
                topic=topic_name,
                learned_today=r.learned_today,
                mistake_to_avoid=r.mistake_to_avoid,
                created_at=r.created_at,
            )
        )
    return result


@router.post(
    "/reflections/{session_id}/generate",
    response_model=ReflectionDraftResponse,
    summary="Generate AI draft reflection for session",
)
async def generate_reflection_draft(
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
) -> ReflectionDraftResponse:
    sess = db.get(Session, session_id)
    if not sess:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

    draft = await _reflection_agent.generate_draft(
        topic=sess.topic,
        hint_levels=sess.hint_levels_used or [],
        cds_score=sess.dependency_score,
        cds_band=sess.dependency_band or "low",
    )

    return ReflectionDraftResponse(
        session_id=sess.id,
        topic=sess.topic,
        learned_today=draft["learned_today"],
        mistake_to_avoid=draft["mistake_to_avoid"],
    )


@router.post(
    "/reflections/{session_id}/submit",
    response_model=ReflectionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit end-of-session reflection",
)
def submit_reflection(
    session_id: UUID,
    payload: ReflectionSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
) -> ReflectionResponse:
    sess = db.get(Session, session_id)
    if not sess:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

    existing = db.query(Reflection).filter(Reflection.session_id == session_id).first()
    if existing:
        existing.learned_today = payload.learned_today
        existing.mistake_to_avoid = payload.mistake_to_avoid
        db.commit()
        db.refresh(existing)
        return ReflectionResponse(
            id=existing.id,
            session_id=existing.session_id,
            student_id=existing.student_id,
            topic=sess.topic,
            learned_today=existing.learned_today,
            mistake_to_avoid=existing.mistake_to_avoid,
            created_at=existing.created_at,
        )

    saved = _reflection_agent.save_reflection(
        db_session=db,
        student_id=current_user.id,
        session_id=sess.id,
        topic=sess.topic,
        learned_today=payload.learned_today,
        mistake_to_avoid=payload.mistake_to_avoid,
    )

    return ReflectionResponse(
        id=saved.id,
        session_id=saved.session_id,
        student_id=saved.student_id,
        topic=sess.topic,
        learned_today=saved.learned_today,
        mistake_to_avoid=saved.mistake_to_avoid,
        created_at=saved.created_at,
    )
