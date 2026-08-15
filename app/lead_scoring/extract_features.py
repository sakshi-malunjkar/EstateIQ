"""
Feature extraction pipeline: reads data/synthetic/transcripts_full.json,
runs the Phase 1 NER model and Phase 2 sentiment model over each
transcript, and populates the lead_scoring DB (Lead, Transcript,
LeadFeatures) -- one Lead+Transcript+LeadFeatures row per synthetic
transcript.

Deliberately uses the trained models' predictions, not the synthetic
generator's ground-truth fields, since this pipeline is the same one
that would run over real, unlabeled transcripts later -- extracting
from the generator's known-correct fields would test a pipeline that
can't actually exist in production.

Usage:
    python app/lead_scoring/extract_features.py
"""

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "nlp"))
sys.path.insert(0, str(Path(__file__).parent.parent.parent))  # project root, for `app.lead_scoring.*` imports
from predict import extract_all  # noqa: E402
from sentiment_predict import predict_sentiment  # noqa: E402

from app.lead_scoring.db import get_session, init_db
from app.lead_scoring.models import Lead, LeadFeatures, LeadStatus, LeadStatusEvent, Transcript

NER_MODEL_VERSION = "muril_ner_v1"
SENTIMENT_MODEL_VERSION = "sentiment_v6"

_BUDGET_RE = re.compile(r"(\d+\.?\d*)\s*(lakh|lakhs|l|crore|cr)\b", re.IGNORECASE)
_UNIT_MULTIPLIER = {"lakh": 100_000, "lakhs": 100_000, "l": 100_000, "crore": 10_000_000, "cr": 10_000_000}


def parse_budget_amount(budget_text):
    """'50 lakhs' -> 5_000_000, '1.2 crore' -> 12_000_000, None if unparseable."""
    if not budget_text:
        return None
    m = _BUDGET_RE.search(budget_text)
    if not m:
        return None
    value, unit = m.groups()
    return float(value) * _UNIT_MULTIPLIER[unit.lower()]


def client_only_text(transcript_text):
    return [line[len("Client:"):].strip() for line in transcript_text.split("\n") if line.startswith("Client:")]


def compute_entity_completeness(entities):
    """Fraction of {location, property_type, amenities, budget} that were extracted."""
    slots = [
        bool(entities.get("location")),
        bool(entities.get("property_type")),
        bool(entities.get("amenities")),
        bool(entities.get("budget")),
    ]
    return sum(slots) / len(slots)


def extract_lead_features(transcript_text):
    """Run both models + compute derived fields. Pure function (no DB), so
    it's independently testable and reusable outside the batch pipeline."""
    entities = extract_all(transcript_text)
    sentiment_result = predict_sentiment(transcript_text)

    client_lines = client_only_text(transcript_text)
    turn_count = len(client_lines)
    message_length = sum(len(line) for line in client_lines)

    budget_text = entities.get("budget")
    return {
        "location": entities["location"][0] if entities.get("location") else None,
        "property_type": entities["property_type"][0] if entities.get("property_type") else None,
        "amenities": entities.get("amenities") or [],
        "amenities_count": len(entities.get("amenities") or []),
        "budget_raw": budget_text,
        "budget_amount": parse_budget_amount(budget_text),
        "sentiment": sentiment_result["sentiment"],
        "sentiment_confidence": sentiment_result["confidence"],
        "entity_completeness": compute_entity_completeness(entities),
        "turn_count": turn_count,
        "message_length": message_length,
    }


def run_pipeline(input_path="data/synthetic/transcripts_full.json", source_tag="synthetic_v1"):
    with open(input_path, encoding="utf-8") as f:
        records = json.load(f)

    init_db()
    session = get_session()

    n_created = 0
    for record in records:
        lead = Lead(current_status=LeadStatus.NEW)
        session.add(lead)
        session.flush()

        transcript = Transcript(
            lead_id=lead.id,
            raw_text=record["transcript"],
            city=record.get("city"),
            source=source_tag,
        )
        session.add(transcript)
        session.flush()

        feats = extract_lead_features(record["transcript"])
        lead_features = LeadFeatures(
            transcript_id=transcript.id,
            location=feats["location"],
            property_type=feats["property_type"],
            budget_raw=feats["budget_raw"],
            budget_amount=feats["budget_amount"],
            amenities=feats["amenities"],
            amenities_count=feats["amenities_count"],
            sentiment=feats["sentiment"],
            sentiment_confidence=feats["sentiment_confidence"],
            entity_completeness=feats["entity_completeness"],
            turn_count=feats["turn_count"],
            message_length=feats["message_length"],
            ner_model_version=NER_MODEL_VERSION,
            sentiment_model_version=SENTIMENT_MODEL_VERSION,
        )
        session.add(lead_features)

        session.add(LeadStatusEvent(lead_id=lead.id, status_from=None, status_to=LeadStatus.NEW, changed_by="system"))

        n_created += 1
        if n_created % 100 == 0:
            session.commit()
            print(f"  {n_created}/{len(records)} processed...")

    session.commit()
    print(f"Done: {n_created} leads created with transcripts + lead_features.")
    session.close()


if __name__ == "__main__":
    run_pipeline()
