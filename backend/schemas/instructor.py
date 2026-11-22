"""
Module: backend.schemas.instructor
Purpose: Pydantic schemas for Instructor Analytics, Cohort Oversight, and Course Management.

Created: 18/11/2026
"""

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from schemas.cds import CDSSignalBreakdown


class CourseCreateRequest(BaseModel):
    course_name: str = Field(..., min_length=3, max_length=200)
    course_code: Optional[str] = Field(None, min_length=2, max_length=20)
    description: Optional[str] = None


class CourseResponse(BaseModel):
    id: UUID
    instructor_id: UUID
    course_name: str
    course_code: str
    description: Optional[str] = None
    enrolled_count: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}


class JoinCourseRequest(BaseModel):
    course_code: str = Field(..., min_length=2, max_length=20)


class JoinCourseResponse(BaseModel):
    success: bool
    course_id: UUID
    course_name: str
    course_code: str
    message: str


class HighRiskStudentSummary(BaseModel):
    student_id: UUID
    name: str
    email: str
    cds_score: float
    risk_band: str
    topics_struggling: list[str] = []
    solution_requests: int = 0
    max_hint_level: int = 0


class CohortOverviewResponse(BaseModel):
    total_students: int
    average_cds: float
    high_risk_count: int
    moderate_risk_count: int
    low_risk_count: int
    distribution: dict[str, int]
    high_risk_students: list[HighRiskStudentSummary]


class StudentSessionSummary(BaseModel):
    session_id: UUID
    topic: str
    started_at: datetime
    dependency_score: float
    dependency_band: str
    solution_requests: int
    reflection_stored: bool


class StudentDetailResponse(BaseModel):
    student_id: UUID
    name: str
    email: str
    preferred_language: str
    overall_cds: float
    risk_band: str
    signals: CDSSignalBreakdown
    sessions: list[StudentSessionSummary]
    reflections: list[dict[str, Any]]


class TopicHeatmapEntry(BaseModel):
    topic: str
    student_count: int
    average_cds: float
    risk_band: str
    high_risk_count: int
    solution_ratio: float


class ReflectionDraftResponse(BaseModel):
    session_id: UUID
    topic: str
    learned_today: str
    mistake_to_avoid: str


class ReflectionSubmitRequest(BaseModel):
    learned_today: str = Field(..., min_length=100)
    mistake_to_avoid: str = Field(..., min_length=100)


class ReflectionResponse(BaseModel):
    id: UUID
    session_id: UUID
    student_id: UUID
    topic: Optional[str] = None
    learned_today: str
    mistake_to_avoid: str
    created_at: datetime

    model_config = {"from_attributes": True}


class PracticeReminderRequest(BaseModel):
    topic: str = Field(default="Problem Solving & Concepts", min_length=2, max_length=200)
    message: str = Field(
        default="Your instructor recommends practicing an independent problem-solving session before requesting hints.",
        min_length=5,
        max_length=1000,
    )


class PracticeReminderResponse(BaseModel):
    id: UUID
    instructor_id: UUID
    student_id: UUID
    course_id: Optional[UUID] = None
    topic: str
    message: str
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}
