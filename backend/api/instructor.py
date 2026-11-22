"""
Module: backend.api.instructor
Purpose: Instructor analytics, cohort oversight, normalized courses,
         practice reminders, and student reflection endpoints.
"""

import logging
import random
import string
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import case, distinct, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DBSession

from agents.reflection import ReflectionAgent
from auth.dependencies import get_current_user, require_role, require_student
from core.cds_engine import get_student_cds_aggregate
from core.report_generator import generate_cohort_pdf_report
from db.models import (
    CourseEnrollment,
    InstructorCourse,
    PracticeReminder,
    Reflection,
    Session,
    User,
)
from db.session import get_db
from schemas.instructor import (
    CohortOverviewResponse,
    CourseCreateRequest,
    CourseResponse,
    HighRiskStudentSummary,
    JoinCourseRequest,
    JoinCourseResponse,
    PracticeReminderRequest,
    PracticeReminderResponse,
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


def _verify_instructor_student_access(
    instructor_id: UUID,
    student_id: UUID,
    db: DBSession,
) -> tuple[User, CourseEnrollment]:
    """
    Verify target user is a student AND is enrolled in at least one course
    taught by `instructor_id`. Prevents cross-instructor IDOR access.
    """
    student = db.get(User, student_id)
    if not student or student.role != "student":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found.",
        )

    enrollment = (
        db.query(CourseEnrollment)
        .join(InstructorCourse, CourseEnrollment.course_id == InstructorCourse.id)
        .filter(
            InstructorCourse.instructor_id == instructor_id,
            CourseEnrollment.student_id == student_id,
        )
        .first()
    )
    if enrollment is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this student's records.",
        )
    return student, enrollment


def _get_enrolled_student_ids(
    instructor_id: UUID,
    db: DBSession,
    course_id: UUID | None = None,
) -> list[UUID]:
    """Return distinct student UUIDs enrolled in the instructor's course(s)."""
    q = (
        db.query(distinct(CourseEnrollment.student_id))
        .join(InstructorCourse, CourseEnrollment.course_id == InstructorCourse.id)
        .filter(InstructorCourse.instructor_id == instructor_id)
    )
    if course_id is not None:
        course = db.get(InstructorCourse, course_id)
        if not course or course.instructor_id != instructor_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found.",
            )
        q = q.filter(CourseEnrollment.course_id == course_id)
    return [row[0] for row in q.all()]


# =============================================================================
# COURSES MANAGEMENT
# =============================================================================

@router.get(
    "/courses",
    response_model=list[CourseResponse],
    summary="List instructor courses with SQL-aggregated enrollment counts",
)
def list_instructor_courses(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(require_role("instructor")),
    db: DBSession = Depends(get_db),
) -> list[CourseResponse]:
    rows = (
        db.query(
            InstructorCourse,
            func.count(CourseEnrollment.id).label("enrolled_count"),
        )
        .outerjoin(CourseEnrollment, InstructorCourse.id == CourseEnrollment.course_id)
        .filter(InstructorCourse.instructor_id == current_user.id)
        .group_by(InstructorCourse.id)
        .order_by(InstructorCourse.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [
        CourseResponse(
            id=c.id,
            instructor_id=c.instructor_id,
            course_name=c.course_name,
            course_code=c.course_code,
            description=c.description,
            enrolled_count=int(cnt or 0),
            created_at=c.created_at,
        )
        for c, cnt in rows
    ]


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
    course_name = payload.course_name.strip()
    if len(course_name) < 3:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Course name must be at least 3 characters.",
        )

    if payload.course_code and payload.course_code.strip():
        code = payload.course_code.strip().upper()
        if len(code) < 4:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Course code must be at least 4 characters.",
            )
        existing = db.query(InstructorCourse).filter(InstructorCourse.course_code == code).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Course code '{code}' is already in use.",
            )
    else:
        code = _generate_course_code()
        for _ in range(5):
            existing = db.query(InstructorCourse).filter(InstructorCourse.course_code == code).first()
            if not existing:
                break
            code = _generate_course_code()

    course = InstructorCourse(
        instructor_id=current_user.id,
        course_name=course_name,
        course_code=code,
        description=payload.description.strip() if payload.description else None,
    )
    db.add(course)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Course code '{code}' is already in use.",
        )
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


@router.get(
    "/student/courses",
    response_model=list[CourseResponse],
    summary="List courses the authenticated student is enrolled in",
)
def list_student_courses(
    current_user: User = Depends(require_student),
    db: DBSession = Depends(get_db),
) -> list[CourseResponse]:
    count_subq = (
        db.query(
            CourseEnrollment.course_id,
            func.count(CourseEnrollment.id).label("enrolled_count"),
        )
        .group_by(CourseEnrollment.course_id)
        .subquery()
    )

    rows = (
        db.query(
            InstructorCourse,
            func.coalesce(count_subq.c.enrolled_count, 0).label("enrolled_count"),
        )
        .join(CourseEnrollment, InstructorCourse.id == CourseEnrollment.course_id)
        .outerjoin(count_subq, InstructorCourse.id == count_subq.c.course_id)
        .filter(CourseEnrollment.student_id == current_user.id)
        .order_by(CourseEnrollment.enrolled_at.desc())
        .all()
    )

    return [
        CourseResponse(
            id=c.id,
            instructor_id=c.instructor_id,
            course_name=c.course_name,
            course_code=c.course_code,
            description=c.description,
            enrolled_count=int(cnt or 0),
            created_at=c.created_at,
        )
        for c, cnt in rows
    ]


@router.post(
    "/join-course",
    response_model=JoinCourseResponse,
    summary="Student enrolls in a course via join code",
)
def join_course(
    payload: JoinCourseRequest,
    current_user: User = Depends(require_student),
    db: DBSession = Depends(get_db),
) -> JoinCourseResponse:
    code = payload.course_code.strip().upper()
    course = db.query(InstructorCourse).filter(InstructorCourse.course_code == code).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Course with join code '{code}' not found.",
        )

    existing = (
        db.query(CourseEnrollment)
        .filter(
            CourseEnrollment.course_id == course.id,
            CourseEnrollment.student_id == current_user.id,
        )
        .first()
    )
    if existing is None:
        db.add(CourseEnrollment(course_id=course.id, student_id=current_user.id))
        try:
            db.commit()
        except IntegrityError:
            db.rollback()

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
    summary="Cohort aggregate CDS statistics and enrolled student roster",
)
def get_cohort_analytics(
    course_id: UUID | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(require_role("instructor")),
    db: DBSession = Depends(get_db),
) -> CohortOverviewResponse:
    enrolled_ids = _get_enrolled_student_ids(current_user.id, db, course_id=course_id)
    if not enrolled_ids:
        return CohortOverviewResponse(
            total_students=0,
            average_cds=0.0,
            high_risk_count=0,
            moderate_risk_count=0,
            low_risk_count=0,
            distribution={"low": 0, "moderate": 0, "high": 0},
            high_risk_students=[],
        )

    students = (
        db.query(User)
        .filter(User.id.in_(enrolled_ids), User.role == "student")
        .all()
    )
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

    # SQL-aggregated per-student session telemetry
    student_ids = [s.id for s in students]
    agg_rows = (
        db.query(
            Session.student_id,
            func.avg(Session.dependency_score).label("avg_cds"),
            func.coalesce(func.sum(Session.solution_requests), 0).label("total_sol"),
        )
        .filter(Session.student_id.in_(student_ids))
        .group_by(Session.student_id)
        .all()
    )
    agg_by_student = {r.student_id: r for r in agg_rows}

    # Fetch only struggling topics & hint_levels_used columns instead of full ORM objects
    session_meta_rows = (
        db.query(
            Session.student_id,
            Session.topic,
            Session.dependency_score,
            Session.hint_levels_used,
        )
        .filter(Session.student_id.in_(student_ids))
        .all()
    )
    topics_by_student: dict[UUID, list[str]] = {}
    max_hint_by_student: dict[UUID, int] = {}
    for sid, topic, dep_score, hint_levels in session_meta_rows:
        if (dep_score or 0.0) > 60.0 and topic:
            topics_by_student.setdefault(sid, []).append(topic)
        hint_max = max(hint_levels) if hint_levels else 0
        if hint_max > max_hint_by_student.get(sid, 0):
            max_hint_by_student[sid] = hint_max

    roster: list[HighRiskStudentSummary] = []
    scores: list[float] = []
    dist = {"low": 0, "moderate": 0, "high": 0}

    for s in students:
        agg = agg_by_student.get(s.id)
        score = round(float(agg.avg_cds), 1) if agg and agg.avg_cds is not None else 0.0
        if score <= 40.0:
            band = "low"
        elif score <= 70.0:
            band = "moderate"
        else:
            band = "high"
        scores.append(score)
        dist[band] += 1

        roster.append(
            HighRiskStudentSummary(
                student_id=s.id,
                name=s.name,
                email=s.email,
                cds_score=score,
                risk_band=band,
                topics_struggling=list(dict.fromkeys(topics_by_student.get(s.id, [])))[:3],
                solution_requests=int(agg.total_sol or 0) if agg else 0,
                max_hint_level=max_hint_by_student.get(s.id, 0),
            )
        )

    avg_score = round(sum(scores) / max(1, len(scores)), 1)
    roster.sort(key=lambda x: x.cds_score, reverse=True)

    return CohortOverviewResponse(
        total_students=total_students,
        average_cds=avg_score,
        high_risk_count=dist["high"],
        moderate_risk_count=dist["moderate"],
        low_risk_count=dist["low"],
        distribution=dist,
        high_risk_students=roster[offset : offset + limit],
    )


@router.get(
    "/cohort-analytics/export-pdf",
    summary="Export PDF Audit Report for Cohort CDS",
)
def export_cohort_pdf(
    course_id: UUID | None = Query(default=None),
    current_user: User = Depends(require_role("instructor")),
    db: DBSession = Depends(get_db),
):
    if course_id is not None:
        course = db.get(InstructorCourse, course_id)
        if not course or course.instructor_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found.",
            )
        course_label = f"{course.course_code} — {course.course_name}"
    else:
        courses = (
            db.query(InstructorCourse)
            .filter(InstructorCourse.instructor_id == current_user.id)
            .order_by(InstructorCourse.created_at.desc())
            .all()
        )
        if len(courses) == 1:
            course_label = f"{courses[0].course_code} — {courses[0].course_name}"
        elif len(courses) > 1:
            codes = ", ".join(c.course_code for c in courses[:4])
            suffix = f" (+{len(courses) - 4} more)" if len(courses) > 4 else ""
            course_label = f"All Owned Courses ({codes}{suffix})"
        else:
            course_label = "No Active Courses"

    cohort = get_cohort_analytics(
        course_id=course_id,
        limit=500,
        offset=0,
        current_user=current_user,
        db=db,
    )
    pdf_bytes = generate_cohort_pdf_report(cohort, course_name=course_label)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="cognicode_cohort_report.pdf"'},
    )


# =============================================================================
# INDIVIDUAL STUDENT DRILLDOWN & PRACTICE REMINDERS
# =============================================================================

@router.get(
    "/students/{student_id}",
    response_model=StudentDetailResponse,
    summary="Detailed student profile, 6-factor CDS breakdown, and paginated sessions/reflections",
)
def get_student_detail(
    student_id: UUID,
    session_limit: int = Query(default=50, ge=1, le=200),
    session_offset: int = Query(default=0, ge=0),
    reflection_limit: int = Query(default=25, ge=1, le=100),
    reflection_offset: int = Query(default=0, ge=0),
    current_user: User = Depends(require_role("instructor")),
    db: DBSession = Depends(get_db),
) -> StudentDetailResponse:
    student, _ = _verify_instructor_student_access(current_user.id, student_id, db)

    summary = get_student_cds_aggregate(student.id, db)
    sessions = (
        db.query(Session)
        .filter(Session.student_id == student.id)
        .order_by(Session.started_at.desc())
        .offset(session_offset)
        .limit(session_limit)
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
        .offset(reflection_offset)
        .limit(reflection_limit)
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
        overall_cds=summary.score,
        risk_band=summary.band,
        signals=summary.breakdown,
        sessions=session_summaries,
        reflections=ref_list,
    )


@router.post(
    "/students/{student_id}/remind",
    response_model=PracticeReminderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Send and persist a practice reminder to an enrolled student",
)
def send_practice_reminder(
    student_id: UUID,
    payload: PracticeReminderRequest,
    current_user: User = Depends(require_role("instructor")),
    db: DBSession = Depends(get_db),
) -> PracticeReminderResponse:
    student, enrollment = _verify_instructor_student_access(current_user.id, student_id, db)

    reminder = PracticeReminder(
        instructor_id=current_user.id,
        student_id=student.id,
        course_id=enrollment.course_id,
        topic=payload.topic.strip(),
        message=payload.message.strip(),
    )
    db.add(reminder)
    db.commit()
    db.refresh(reminder)

    return PracticeReminderResponse.model_validate(reminder)


@router.get(
    "/student/reminders",
    response_model=list[PracticeReminderResponse],
    summary="List practice reminders sent to the authenticated student",
)
def list_student_reminders(
    unread_only: bool = Query(default=True),
    current_user: User = Depends(require_student),
    db: DBSession = Depends(get_db),
) -> list[PracticeReminderResponse]:
    q = db.query(PracticeReminder).filter(PracticeReminder.student_id == current_user.id)
    if unread_only:
        q = q.filter(PracticeReminder.is_read.is_(False))
    rows = q.order_by(PracticeReminder.created_at.desc()).limit(20).all()
    return [PracticeReminderResponse.model_validate(r) for r in rows]


@router.post(
    "/student/reminders/{reminder_id}/acknowledge",
    response_model=PracticeReminderResponse,
    summary="Mark a practice reminder as read/acknowledged",
)
def acknowledge_student_reminder(
    reminder_id: UUID,
    current_user: User = Depends(require_student),
    db: DBSession = Depends(get_db),
) -> PracticeReminderResponse:
    reminder = db.get(PracticeReminder, reminder_id)
    if reminder is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reminder not found.",
        )
    if reminder.student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this reminder.",
        )
    reminder.is_read = True
    db.commit()
    db.refresh(reminder)
    return PracticeReminderResponse.model_validate(reminder)


# =============================================================================
# TOPIC HEATMAP (SQL-AGGREGATED)
# =============================================================================

@router.get(
    "/heatmap",
    response_model=list[TopicHeatmapEntry],
    summary="Topic-by-topic dependency risk matrix aggregated in SQL",
)
def get_topic_heatmap(
    course_id: UUID | None = Query(default=None),
    current_user: User = Depends(require_role("instructor")),
    db: DBSession = Depends(get_db),
) -> list[TopicHeatmapEntry]:
    enrolled_ids = _get_enrolled_student_ids(current_user.id, db, course_id=course_id)
    if not enrolled_ids:
        return []

    rows = (
        db.query(
            Session.topic,
            func.count(distinct(Session.student_id)).label("student_count"),
            func.avg(Session.dependency_score).label("avg_cds"),
            func.sum(case((Session.dependency_score >= 71.0, 1), else_=0)).label("high_risk_count"),
            func.coalesce(func.sum(Session.solution_requests), 0).label("total_sol_reqs"),
            func.count(Session.id).label("session_count"),
        )
        .filter(Session.student_id.in_(enrolled_ids))
        .group_by(Session.topic)
        .order_by(func.avg(Session.dependency_score).desc())
        .all()
    )

    entries: list[TopicHeatmapEntry] = []
    for row in rows:
        avg_score = round(float(row.avg_cds or 0.0), 1)
        band = "high" if avg_score >= 71.0 else "moderate" if avg_score >= 41.0 else "low"
        sol_ratio = round(
            min(1.0, int(row.total_sol_reqs or 0) / max(1, int(row.session_count or 1) * 3)),
            2,
        )
        entries.append(
            TopicHeatmapEntry(
                topic=row.topic or "General",
                student_count=int(row.student_count or 0),
                average_cds=avg_score,
                risk_band=band,
                high_risk_count=int(row.high_risk_count or 0),
                solution_ratio=sol_ratio,
            )
        )
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
    limit: int = Query(default=50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
) -> list[ReflectionResponse]:
    rows = (
        db.query(Reflection, Session.topic)
        .outerjoin(Session, Reflection.session_id == Session.id)
        .filter(Reflection.student_id == current_user.id)
        .order_by(Reflection.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        ReflectionResponse(
            id=r.id,
            session_id=r.session_id,
            student_id=r.student_id,
            topic=topic or "General Programming",
            learned_today=r.learned_today,
            mistake_to_avoid=r.mistake_to_avoid,
            created_at=r.created_at,
        )
        for r, topic in rows
    ]


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
    if sess.student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this session.",
        )

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
    if sess.student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this session.",
        )

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
