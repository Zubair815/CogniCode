"""
Module: backend.schemas.cds
Purpose: Pydantic schemas for the Cognitive Dependency Score (CDS) engine.

Created: 18/11/2026
"""

from pydantic import BaseModel, Field


class CDSSignalBreakdown(BaseModel):
    """The 6 weighted behavioral signals (normalized 0 to 100)."""
    solution_frequency: float = Field(..., ge=0, le=100, description="Rate of direct solution asks")
    hint_depth: float = Field(..., ge=0, le=100, description="Normalized hint depth reached (Levels 1-5)")
    retry_count: float = Field(..., ge=0, le=100, description="Perseverance and retries before help")
    time_gap: float = Field(..., ge=0, le=100, description="Interaction reflection gap")
    debugging_attempts: float = Field(..., ge=0, le=100, description="Independent debugging effort")
    quiz_performance: float = Field(..., ge=0, le=100, description="Conceptual check accuracy")


class CDSScoreResponse(BaseModel):
    """Aggregated student cognitive dependency score."""
    score: float = Field(..., ge=0, le=100, description="Calculated CDS score (0 to 100)")
    band: str = Field(..., description="Risk tier: 'low' | 'moderate' | 'high'")
    breakdown: CDSSignalBreakdown
    trend: str = Field(default="Stable", description="Change over recent sessions")
    total_sessions: int = Field(default=0, ge=0)
    weak_topics: list[str] = Field(default_factory=list)


class SessionCDSDetailResponse(BaseModel):
    """Per-session dependency score and telemetry breakdown."""
    session_id: str
    topic: str
    score: float
    band: str
    signals: CDSSignalBreakdown
