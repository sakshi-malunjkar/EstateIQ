"""
Async database operations for the FastAPI layer. Pure data-access
functions -- no request/response shaping (that's api/main.py's job) and
no ML calls (those live in app/nlp, app/lead_scoring).

Model version tags mirror the convention already used by
app/lead_scoring/extract_features.py (NER_MODEL_VERSION,
SENTIMENT_MODEL_VERSION).
"""

import logging
from datetime import datetime, timezone

from sqlalchemy import func, nulls_last, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.lead_scoring.models import (
    Lead,
    LeadFeatures,
    LeadScore,
    LeadStatus,
    LeadStatusEvent,
    Transcript,
)

logger = logging.getLogger("estateiq.api.crud")

NER_MODEL_VERSION = "muril_ner_v1"
SENTIMENT_MODEL_VERSION = "sentiment_v6"
INTENT_MODEL_VERSION = "intent_v1"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


async def persist_analysis(
    db: AsyncSession,
    *,
    raw_text: str,
    city: str | None,
    source: str,
    combined: dict,
    scored: dict,
) -> Lead:
    """Persist one full analysis run (NER + sentiment + intent + lead
    score) as a new Lead + Transcript + LeadFeatures + LeadScore, with an
    initial "New" LeadStatusEvent. `combined` is predict_combined()'s
    output, `scored` is predict_lead_score()'s output -- see
    api/main.py's run_analysis() for how they're produced together.
    """
    lead = Lead(current_status=LeadStatus.NEW)
    db.add(lead)
    await db.flush()

    transcript = Transcript(lead_id=lead.id, raw_text=raw_text, city=city, source=source)
    db.add(transcript)
    await db.flush()

    # predict_lead_score()'s "features" key is NOT the full
    # extract_lead_features() dict -- it's filtered to just the 7
    # numeric columns the XGBoost model consumes (FEATURE_COLUMNS in
    # train_lead_score.py), so it has no location/property_type/
    # budget_raw/amenities. Those come from `combined` instead (which
    # has the raw, list-valued NER entities); the numeric/derived
    # fields below come from `feats`, since those are the exact values
    # the score was computed from.
    feats = scored["features"]
    locations = combined.get("location") or []
    property_types = combined.get("property_type") or []
    lead_features = LeadFeatures(
        transcript_id=transcript.id,
        location=locations[0] if locations else None,
        property_type=property_types[0] if property_types else None,
        budget_raw=combined.get("budget"),
        budget_amount=feats.get("budget_amount"),
        amenities=combined.get("amenities") or [],
        amenities_count=feats.get("amenities_count", 0),
        sentiment=feats.get("sentiment"),
        sentiment_confidence=feats.get("sentiment_confidence"),
        intent=combined.get("intent"),
        intent_confidence=combined.get("intent_confidence"),
        entity_completeness=feats.get("entity_completeness", 0.0),
        turn_count=feats.get("turn_count", 0),
        message_length=feats.get("message_length", 0),
        ner_model_version=NER_MODEL_VERSION,
        sentiment_model_version=SENTIMENT_MODEL_VERSION,
        intent_model_version=INTENT_MODEL_VERSION,
    )
    db.add(lead_features)
    await db.flush()

    lead_score = LeadScore(
        lead_features_id=lead_features.id,
        score=scored["score"],
        tier=scored["tier"],
        label_source=scored["label_source"],  # "model_predicted" -- never a training label, see models.py
        shap_values=scored["shap_values"],
    )
    db.add(lead_score)
    await db.flush()

    lead.current_score_id = lead_score.id
    db.add(LeadStatusEvent(lead_id=lead.id, status_from=None, status_to=LeadStatus.NEW, changed_by="system"))

    await db.commit()
    await db.refresh(lead)
    logger.info("Persisted lead id=%s score=%.2f tier=%s", lead.id, lead_score.score, lead_score.tier)
    return lead


async def list_leads(
    db: AsyncSession,
    *,
    tier: str | None = None,
    sentiment: str | None = None,
    intent: str | None = None,
    limit: int = 20,
    skip: int = 0,
) -> tuple[int, list[tuple[Lead, LeadScore | None, LeadFeatures | None]]]:
    """Returns (total_matching, rows) where each row is
    (Lead, current LeadScore or None, current LeadFeatures or None),
    sorted by score descending (leads with no score yet sort last)."""
    base = (
        select(Lead, LeadScore, LeadFeatures)
        .select_from(Lead)
        .outerjoin(LeadScore, Lead.current_score_id == LeadScore.id)
        .outerjoin(LeadFeatures, LeadScore.lead_features_id == LeadFeatures.id)
    )
    if tier:
        base = base.where(LeadScore.tier == tier)
    if sentiment:
        base = base.where(LeadFeatures.sentiment == sentiment)
    if intent:
        base = base.where(LeadFeatures.intent == intent)

    count_result = await db.execute(select(func.count()).select_from(base.subquery()))
    total = count_result.scalar_one()

    query = base.order_by(nulls_last(LeadScore.score.desc())).limit(limit).offset(skip)
    result = await db.execute(query)
    rows = [(r[0], r[1], r[2]) for r in result.all()]
    return total, rows


async def get_lead_detail(db: AsyncSession, lead_id: int) -> Lead | None:
    """Loads a single lead with its transcripts, current score (+ its
    lead_features), and full status-event history eagerly, so
    api/main.py doesn't trigger lazy-load queries after the session-
    scoped request ends."""
    query = (
        select(Lead)
        .where(Lead.id == lead_id)
        .options(
            selectinload(Lead.transcripts),
            selectinload(Lead.current_score).selectinload(LeadScore.lead_features),
            selectinload(Lead.status_events),
        )
    )
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def update_lead_status(
    db: AsyncSession,
    lead_id: int,
    *,
    new_status: str,
    notes: str | None,
    lost_reason: str | None,
    changed_by: str | None = None,
) -> tuple[Lead, LeadStatusEvent] | None:
    """Updates Lead.current_status and appends a LeadStatusEvent audit
    row. Returns None if the lead doesn't exist (caller maps that to a
    404). LeadStatusEvent rows are append-only by convention -- see
    models.py -- so this only ever inserts, never edits a past row."""
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if lead is None:
        return None

    status_from = lead.current_status
    lead.current_status = new_status
    lead.updated_at = _utcnow()

    event = LeadStatusEvent(
        lead_id=lead.id,
        status_from=status_from,
        status_to=new_status,
        lost_reason=lost_reason,
        notes=notes,
        changed_by=changed_by,
    )
    db.add(event)
    await db.commit()
    await db.refresh(lead)
    await db.refresh(event)
    logger.info("Lead id=%s status %s -> %s", lead_id, status_from, new_status)
    return lead, event


async def get_analytics(db: AsyncSession) -> dict:
    """Aggregate counts/rates for the /analytics endpoint. Runs as a
    handful of small aggregate queries rather than pulling every row
    into Python, so this stays cheap as the leads table grows."""
    total_result = await db.execute(select(func.count()).select_from(Lead))
    total_leads = total_result.scalar_one()

    tier_result = await db.execute(
        select(LeadScore.tier, func.count())
        .select_from(Lead)
        .join(LeadScore, Lead.current_score_id == LeadScore.id)
        .group_by(LeadScore.tier)
    )
    tier_counts = dict(tier_result.all())

    sentiment_result = await db.execute(
        select(LeadFeatures.sentiment, func.count())
        .select_from(Lead)
        .join(LeadScore, Lead.current_score_id == LeadScore.id)
        .join(LeadFeatures, LeadScore.lead_features_id == LeadFeatures.id)
        .where(LeadFeatures.sentiment.is_not(None))
        .group_by(LeadFeatures.sentiment)
    )
    sentiment_distribution = dict(sentiment_result.all())

    intent_result = await db.execute(
        select(LeadFeatures.intent, func.count())
        .select_from(Lead)
        .join(LeadScore, Lead.current_score_id == LeadScore.id)
        .join(LeadFeatures, LeadScore.lead_features_id == LeadFeatures.id)
        .where(LeadFeatures.intent.is_not(None))
        .group_by(LeadFeatures.intent)
    )
    intent_distribution = dict(intent_result.all())

    avg_score_result = await db.execute(
        select(func.avg(LeadScore.score)).select_from(Lead).join(LeadScore, Lead.current_score_id == LeadScore.id)
    )
    avg_score = avg_score_result.scalar_one()

    won_result = await db.execute(select(func.count()).select_from(Lead).where(Lead.current_status == "won"))
    won_count = won_result.scalar_one()
    conversion_rate = round((won_count / total_leads) * 100, 2) if total_leads else 0.0

    return {
        "total_leads": total_leads,
        "hot_count": tier_counts.get("hot", 0),
        "warm_count": tier_counts.get("warm", 0),
        "cold_count": tier_counts.get("cold", 0),
        "sentiment_distribution": sentiment_distribution,
        "intent_distribution": intent_distribution,
        "avg_score": round(avg_score, 2) if avg_score is not None else None,
        "conversion_rate": conversion_rate,
    }
