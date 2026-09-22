"""
Pydantic v2 request/response models for the FastAPI layer.

Deliberately separate from app/lead_scoring/models.py (the SQLAlchemy DB
schema) -- these are the API's wire format, not the storage format, and
validation here reuses the DB schema's enums (LeadStatus, LostReason) as
the single source of truth rather than redefining the allowed values.

Note on lead status values: the existing LeadStatus enum (already used
by the batch feature-extraction pipeline and its DB rows) is
new/contacted/qualified/won/lost. The originally requested status list
used "Converted" where this schema uses "won" -- kept as "won" to stay
consistent with the already-existing schema and data rather than
diverging from it for a naming preference.
"""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.lead_scoring.models import LeadStatus, LostReason

VALID_STATUSES = {s.value for s in LeadStatus}
VALID_LOST_REASONS = {r.value for r in LostReason}


# ---------------------------------------------------------------------------
# /health
# ---------------------------------------------------------------------------

class ModelsLoaded(BaseModel):
    ner: bool
    sentiment: bool
    intent: bool
    lead_scoring: bool


class HealthResponse(BaseModel):
    status: str
    models_loaded: ModelsLoaded


# ---------------------------------------------------------------------------
# /analyze
# ---------------------------------------------------------------------------

class AnalyzeRequest(BaseModel):
    transcript: str = Field(..., min_length=1, description="Raw call transcript text")


class NEROutput(BaseModel):
    location: list[str] = Field(default_factory=list)
    property_type: list[str] = Field(default_factory=list)
    amenities: list[str] = Field(default_factory=list)
    budget: str | None = None


class SentimentOutput(BaseModel):
    label: str | None
    confidence: float | None
    reliability: str


class IntentOutput(BaseModel):
    label: str | None
    confidence: float | None
    reliability: str


class LeadScoreOutput(BaseModel):
    score: float
    tier: str
    shap_values: dict[str, float]
    sentiment_reliability: str


class AnalyzeResponse(BaseModel):
    ner: NEROutput
    sentiment: SentimentOutput
    intent: IntentOutput
    lead_score: LeadScoreOutput


# ---------------------------------------------------------------------------
# /webhook/vapi
# ---------------------------------------------------------------------------

class VapiWebhookResponse(BaseModel):
    status: str


# ---------------------------------------------------------------------------
# /leads, /leads/{id}
# ---------------------------------------------------------------------------

class LeadSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str | None
    contact_phone: str | None
    current_status: str
    score: float | None = None
    tier: str | None = None
    sentiment: str | None = None
    intent: str | None = None
    created_at: datetime
    updated_at: datetime


class LeadListResponse(BaseModel):
    total: int
    limit: int
    skip: int
    leads: list[LeadSummary]


class LeadDetail(BaseModel):
    id: int
    name: str | None
    contact_phone: str | None
    contact_email: str | None
    current_status: str
    created_at: datetime
    updated_at: datetime

    transcript: str | None = None
    ner: NEROutput | None = None
    sentiment: SentimentOutput | None = None
    intent: IntentOutput | None = None
    lead_score: LeadScoreOutput | None = None

    status_history: list[dict[str, Any]] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# PATCH /leads/{id}/status
# ---------------------------------------------------------------------------

class LeadStatusUpdateRequest(BaseModel):
    status: str
    notes: str | None = None
    lost_reason: str | None = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        normalized = v.strip().lower()
        if normalized not in VALID_STATUSES:
            raise ValueError(f"Invalid status '{v}'. Valid statuses: {sorted(VALID_STATUSES)}")
        return normalized

    @field_validator("lost_reason")
    @classmethod
    def validate_lost_reason(cls, v: str | None) -> str | None:
        if v is None:
            return v
        normalized = v.strip().lower()
        if normalized not in VALID_LOST_REASONS:
            raise ValueError(f"Invalid lost_reason '{v}'. Valid lost_reasons: {sorted(VALID_LOST_REASONS)}")
        return normalized


class LeadStatusUpdateResponse(BaseModel):
    id: int
    current_status: str
    notes: str | None
    lost_reason: str | None
    changed_at: datetime


# ---------------------------------------------------------------------------
# /analytics
# ---------------------------------------------------------------------------

class AnalyticsResponse(BaseModel):
    total_leads: int
    hot_count: int
    warm_count: int
    cold_count: int
    sentiment_distribution: dict[str, int]
    intent_distribution: dict[str, int]
    avg_score: float | None
    conversion_rate: float
