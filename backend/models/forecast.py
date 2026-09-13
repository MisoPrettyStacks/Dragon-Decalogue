"""Pydantic models for the DragonflyDecalogue API."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


class FeatureInput(BaseModel):
    base_rate: float = 0.35
    trend: float = 0.0
    evidence_lr: float = 0.0
    status_quo_strength: float = 0.5
    market_prob: float = 0.35
    expert_prob: float = 0.35
    time_horizon_days: float = 90.0
    volatility: float = 0.35


class QuestionCreate(BaseModel):
    title: str = Field(min_length=5, max_length=300)
    domain: str = "Geopolitics"
    resolution_criteria: str = ""
    features: FeatureInput = Field(default_factory=FeatureInput)


class AgentContribution(BaseModel):
    agent: str
    label: str
    lens: str
    formula: str
    rationale: str
    probability: float
    logit: float
    weight: float
    contribution: float


class Question(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    domain: str
    resolution_criteria: str = ""
    created_at: datetime = Field(default_factory=now_utc)
    features: Dict[str, float]
    breakdown: List[AgentContribution]
    pooled_logit: float
    extremized_logit: float
    calibrated_logit: float
    extremizing_exponent: float
    probability: float
    disagreement: float
    confidence: float
    resolved: Optional[bool] = None


class QuestionSummary(BaseModel):
    id: str
    title: str
    domain: str
    created_at: datetime
    probability: float
    confidence: float
    disagreement: float
    resolved: Optional[bool] = None


class AgentInfo(BaseModel):
    agent: str
    label: str
    lens: str
    formula: str
    rationale: str
    weight: float
    solo_brier: float


class ReliabilityBin(BaseModel):
    bin: str
    lower: float
    upper: float
    count: int
    mean_forecast: Optional[float] = None
    observed_frequency: Optional[float] = None


class PerAgentScore(BaseModel):
    agent: str
    weight: float
    brier: float


class CalibrationReport(BaseModel):
    n_questions: int
    seed: int
    brier_score: float
    target_band: List[float]
    within_target: bool
    brier_skill_score: float
    climatology_brier: float
    log_loss: float
    accuracy: float
    reliability: float
    resolution: float
    uncertainty: float
    reliability_bins: List[ReliabilityBin]
    per_agent: List[PerAgentScore]
    extremizing_exponent: float


class BenchmarkRow(BaseModel):
    id: str
    domain: str
    title: str
    forecast: float
    outcome: int
    squared_error: float


class Commandment(BaseModel):
    number: int
    title: str
    body: str
    engine_hook: str


class PreviewResult(BaseModel):
    features: Dict[str, float]
    breakdown: List[AgentContribution]
    pooled_logit: float
    extremized_logit: float
    calibrated_logit: float
    extremizing_exponent: float
    probability: float
    disagreement: float
    confidence: float


class BundleManifest(BaseModel):
    file_count: int
    total_bytes: int
    files: List[str]
    download_url: str
