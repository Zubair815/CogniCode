"""
Module: backend.api.quiz
Purpose: Student conceptual quiz endpoints with server-side grading,
         QuizResult persistence, and live CDS recomputation.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session as DBSession

from agents.assessment import AssessmentAgent
from auth.dependencies import require_student
from core.cds_engine import compute_session_score
from db.models import QuizResult, Session, User
from db.session import get_db
from schemas.quiz import (
    QuizQuestionFeedback,
    QuizQuestionPublic,
    QuizResultSummary,
    QuizSubmitRequest,
    QuizSubmitResponse,
)

router = APIRouter(prefix="/quiz", tags=["Conceptual Quizzes"])
_assessor = AssessmentAgent()


@router.get(
    "/questions",
    response_model=list[QuizQuestionPublic],
    summary="List conceptual assessment questions (without answer keys)",
)
def get_quiz_questions(
    topic: str | None = Query(default=None, max_length=200),
    current_user: User = Depends(require_student),
) -> list[QuizQuestionPublic]:
    return [QuizQuestionPublic(**q) for q in _assessor.list_public_questions(topic)]


@router.post(
    "/submit",
    response_model=QuizSubmitResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Grade quiz submission, persist QuizResult, and recompute session CDS",
)
def submit_quiz(
    payload: QuizSubmitRequest,
    current_user: User = Depends(require_student),
    db: DBSession = Depends(get_db),
) -> QuizSubmitResponse:
    sess = db.get(Session, payload.session_id)
    if sess is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found.",
        )
    if sess.student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this session.",
        )

    score = 0
    feedback: list[QuizQuestionFeedback] = []
    seen_qids: set[str] = set()

    for ans in payload.answers:
        if ans.question_id in seen_qids:
            continue
        seen_qids.add(ans.question_id)
        question = _assessor.get_question_by_id(ans.question_id)
        if question is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unknown quiz question ID: {ans.question_id}",
            )

        is_correct, explanation = _assessor.evaluate_answer(question, ans.selected_option)
        correct_opt = next(
            (opt["id"] for opt in question["options"] if opt.get("correct")),
            "A",
        )
        if is_correct:
            score += 1
        feedback.append(
            QuizQuestionFeedback(
                question_id=ans.question_id,
                selected_option=ans.selected_option.strip().upper(),
                correct_option=correct_opt,
                is_correct=is_correct,
                explanation=explanation,
            )
        )

    total_questions = len(feedback)
    if total_questions == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one unique answer is required.",
        )

    passed = (score / total_questions) >= 0.5
    record = QuizResult(
        student_id=current_user.id,
        session_id=sess.id,
        topic=sess.topic,
        score=score,
        total_questions=total_questions,
        passed=passed,
    )
    db.add(record)
    db.flush()

    updated_score, updated_band, _ = compute_session_score(sess, db)
    db.commit()
    db.refresh(record)

    return QuizSubmitResponse(
        result_id=record.id,
        session_id=sess.id,
        topic=sess.topic,
        score=record.score,
        total_questions=record.total_questions,
        passed=record.passed,
        updated_cds_score=updated_score,
        updated_cds_band=updated_band,
        feedback=feedback,
        created_at=record.created_at,
    )


@router.get(
    "/results",
    response_model=list[QuizResultSummary],
    summary="List the authenticated student's persisted quiz results",
)
def list_quiz_results(
    limit: int = Query(default=25, ge=1, le=100),
    current_user: User = Depends(require_student),
    db: DBSession = Depends(get_db),
) -> list[QuizResultSummary]:
    rows = (
        db.query(QuizResult)
        .filter(QuizResult.student_id == current_user.id)
        .order_by(QuizResult.created_at.desc())
        .limit(limit)
        .all()
    )
    return [QuizResultSummary.model_validate(r) for r in rows]
