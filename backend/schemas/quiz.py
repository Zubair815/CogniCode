"""
Module: backend.schemas.quiz
Purpose: Pydantic schemas for conceptual check quizzes and server-graded results.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class QuizOptionPublic(BaseModel):
    id: str
    text: str


class QuizQuestionPublic(BaseModel):
    id: str
    topic: str
    prompt: str
    code_snippet: Optional[str] = None
    options: list[QuizOptionPublic]


class QuizAnswerItem(BaseModel):
    question_id: str = Field(..., min_length=1, max_length=64)
    selected_option: str = Field(..., min_length=1, max_length=16)


class QuizSubmitRequest(BaseModel):
    session_id: UUID
    answers: list[QuizAnswerItem] = Field(..., min_length=1, max_length=20)


class QuizQuestionFeedback(BaseModel):
    question_id: str
    selected_option: str
    correct_option: str
    is_correct: bool
    explanation: str


class QuizSubmitResponse(BaseModel):
    result_id: UUID
    session_id: UUID
    topic: str
    score: int
    total_questions: int
    passed: bool
    updated_cds_score: float
    updated_cds_band: str
    feedback: list[QuizQuestionFeedback]
    created_at: datetime


class QuizResultSummary(BaseModel):
    id: UUID
    session_id: UUID
    topic: str
    score: int
    total_questions: int
    passed: bool
    created_at: datetime

    model_config = {"from_attributes": True}
