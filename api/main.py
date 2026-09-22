"""
EstateIQ FastAPI backend -- serves the existing NER + sentiment + intent +
lead-scoring ML pipeline (app/nlp, app/lead_scoring) over HTTP, backed by
Postgres for lead persistence.

No ML logic lives here -- every prediction call is a direct import from
the already-trained/tested modules under app/. This file only handles
HTTP concerns: request/response shaping, validation, persistence,
logging, and error handling.

Run with:
    uvicorn api.main:app --reload

On Windows, `uvicorn api.main:app` directly can fail DB calls with
"Psycopg cannot use the 'ProactorEventLoop'" -- use the Windows-safe
entry point instead, which sets the correct event loop policy before
uvicorn starts (see api/run.py for why this can't be done from inside
api/database.py):
    python -m api.run
"""

import logging
import sys
import time
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession

# combined_predict.py's internal `from predict import ...` / `from
# sentiment_predict import ...` / `from intent_predict import ...` are
# bare imports that assume app/nlp is on sys.path -- same convention
# dashboard/app.py already follows. Must happen before importing
# combined_predict below.
PROJECT_ROOT = Path(__file__).resolve().parent.parent
NLP_DIR = PROJECT_ROOT / "app" / "nlp"
for _p in (str(PROJECT_ROOT), str(NLP_DIR)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from combined_predict import predict_combined  # noqa: E402
from app.lead_scoring.predict_lead_score import predict_lead_score  # noqa: E402

from api import crud  # noqa: E402
from api.database import get_db, init_db  # noqa: E402
from api.models import (  # noqa: E402
    AnalyticsResponse,
    AnalyzeRequest,
    AnalyzeResponse,
    HealthResponse,
    IntentOutput,
    LeadDetail,
    LeadListResponse,
    LeadScoreOutput,
    LeadStatusUpdateRequest,
    LeadStatusUpdateResponse,
    LeadSummary,
    ModelsLoaded,
    NEROutput,
    SentimentOutput,
    VapiWebhookResponse,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("estateiq.api")

LOW_CONFIDENCE_THRESHOLD = 0.50  # same convention as sentiment_reliability / intent_reliability elsewhere in the pipeline
_WARMUP_TEXT = (
    "Agent: Hello, welcome to our real estate assistant. How can I help you today?\n"
    "Client: I want a 2BHK in Baner, budget 60 lakhs, swimming pool please.\n"
    "Agent: Sure, let me check that for you."
)


def _reliability(confidence: float | None) -> str:
    return "low" if (confidence is None or confidence < LOW_CONFIDENCE_THRESHOLD) else "ok"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Loads every model once at startup (each predict_* module caches
    its own weights in a module-level global after first call, so this
    just forces that load-in eagerly instead of on the first real
    request) and creates DB tables if they don't exist yet."""
    models_loaded = {"ner": False, "sentiment": False, "intent": False, "lead_scoring": False}

    try:
        await init_db()
    except Exception:
        logger.exception("Database initialization failed -- DB-backed endpoints will error until DATABASE_URL is fixed.")

    try:
        combined = predict_combined(_WARMUP_TEXT)
        models_loaded["ner"] = True
        models_loaded["sentiment"] = bool(combined.get("sentiment"))
        models_loaded["intent"] = bool(combined.get("intent"))
        logger.info("NER + sentiment + intent models loaded.")
    except Exception:
        logger.exception("Failed to load NER/sentiment/intent models.")

    try:
        predict_lead_score(_WARMUP_TEXT)
        models_loaded["lead_scoring"] = True
        logger.info("Lead-scoring model loaded.")
    except Exception:
        logger.exception("Failed to load lead-scoring model.")

    app.state.models_loaded = models_loaded
    yield


app = FastAPI(
    title="EstateIQ API",
    description="NER + sentiment + intent + lead-scoring pipeline for real-estate call transcripts.",
    version="1.0.0",
    lifespan=lifespan,
)

# Allow all origins for now -- the React frontend's final origin isn't
# fixed yet. Tighten before production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Logs timestamp, endpoint, response time, and status code for every request."""
    start = time.monotonic()
    response = await call_next(request)
    duration_ms = (time.monotonic() - start) * 1000
    logger.info(
        "%s %s -> %d (%.1fms)",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response


def run_analysis(transcript: str) -> tuple[dict, dict]:
    """Runs the full ML pipeline on `transcript` once and returns
    (combined_predict output, predict_lead_score output). Shared by
    /analyze and /webhook/vapi so both build their response/persistence
    from the exact same pair of model calls."""
    combined = predict_combined(transcript)
    scored = predict_lead_score(transcript)
    return combined, scored


def build_analyze_response(combined: dict, scored: dict) -> AnalyzeResponse:
    return AnalyzeResponse(
        ner=NEROutput(
            location=combined.get("location") or [],
            property_type=combined.get("property_type") or [],
            amenities=combined.get("amenities") or [],
            budget=combined.get("budget"),
        ),
        sentiment=SentimentOutput(
            label=combined.get("sentiment"),
            confidence=combined.get("sentiment_confidence"),
            reliability=_reliability(combined.get("sentiment_confidence")),
        ),
        intent=IntentOutput(
            label=combined.get("intent"),
            confidence=combined.get("intent_confidence"),
            reliability=combined.get("intent_reliability", _reliability(combined.get("intent_confidence"))),
        ),
        lead_score=LeadScoreOutput(
            score=scored["score"],
            tier=scored["tier"],
            shap_values=scored["shap_values"],
            sentiment_reliability=scored["sentiment_reliability"],
        ),
    )


# ---------------------------------------------------------------------------
# 1. GET /health
# ---------------------------------------------------------------------------

@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Reports whether the API process is up and which models
    successfully loaded at startup, so a caller (or an orchestrator's
    readiness probe) can tell "server up" apart from "server up but a
    model failed to load"."""
    loaded = getattr(app.state, "models_loaded", None) or {
        "ner": False, "sentiment": False, "intent": False, "lead_scoring": False,
    }
    return HealthResponse(status="ok", models_loaded=ModelsLoaded(**loaded))


# ---------------------------------------------------------------------------
# 2. POST /analyze
# ---------------------------------------------------------------------------

@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(payload: AnalyzeRequest) -> AnalyzeResponse:
    """Runs the full NER + sentiment + intent + lead-scoring pipeline on
    a raw transcript string and returns all four signals together.
    Does not persist anything -- for that, see /webhook/vapi."""
    try:
        combined, scored = run_analysis(payload.transcript)
    except Exception as exc:
        logger.exception("Model inference failed in /analyze.")
        raise HTTPException(status_code=500, detail=f"Model inference failed: {exc}") from exc

    return build_analyze_response(combined, scored)


# ---------------------------------------------------------------------------
# 3. POST /webhook/vapi
# ---------------------------------------------------------------------------

VAPI_ROLE_TO_TURN_PREFIX = {"assistant": "Agent", "bot": "Agent", "user": "Client", "customer": "Client"}


def _vapi_messages_to_transcript(messages: list[dict]) -> str | None:
    """Rebuilds an Agent:/Client:-prefixed transcript from Vapi's
    structured `artifact.messages` array ([{role, message}, ...]).
    Preferred over Vapi's own flattened `artifact.transcript` string,
    whose role labels are "AI:"/"User:" (confirmed via Vapi's docs and
    community examples, e.g. docs.vapi.ai/server-url/events), not our
    pipeline's "Agent:"/"Client:" convention -- extract_lead_features.
    client_only_text() specifically looks for "Client:"-prefixed lines
    to compute turn_count/message_length, so an unrecognized prefix
    would silently collapse the whole call into one fallback turn.
    `system`/`tool` role messages (assistant configuration, function
    calls) are dropped -- they're not something a client said."""
    lines = []
    for m in messages:
        prefix = VAPI_ROLE_TO_TURN_PREFIX.get(m.get("role"))
        text = m.get("message") or m.get("content")
        if prefix and text:
            lines.append(f"{prefix}: {text}")
    return "\n".join(lines) if lines else None


def extract_vapi_transcript(payload: dict) -> str | None:
    """Extracts the call transcript from a Vapi end-of-call-report
    webhook payload (`message.type == "end-of-call-report"`). Per
    Vapi's docs (docs.vapi.ai/server-url/events), the report is nested
    under `message`, with the transcript under `message.artifact` as
    either a flattened string (`artifact.transcript`) or a structured
    array (`artifact.messages`, each `{"role": ..., "message": ...}`).
    Prefers rebuilding from `artifact.messages` (see
    _vapi_messages_to_transcript) since its role labels are reliable;
    falls back to the flattened string, then a couple of looser paths,
    only if no structured messages are present."""
    message = payload.get("message") or {}
    artifact = message.get("artifact") or {}

    normalized = _vapi_messages_to_transcript(artifact.get("messages") or [])
    if normalized:
        return normalized

    for candidate in (
        artifact.get("transcript"),
        message.get("transcript"),
        payload.get("transcript"),
    ):
        if candidate:
            return candidate
    return None


def extract_vapi_customer_phone(payload: dict) -> str | None:
    """Vapi's call object carries the customer's number at
    `message.call.customer.number` (E.164 format), per
    docs.vapi.ai/quickstart/web and Vapi support examples."""
    message = payload.get("message") or {}
    call = message.get("call") or {}
    customer = call.get("customer") or {}
    return customer.get("number")


@app.post("/webhook/vapi", response_model=VapiWebhookResponse)
async def vapi_webhook(request: Request, db: AsyncSession = Depends(get_db)) -> VapiWebhookResponse:
    """Receives a Vapi end-of-call webhook, extracts the transcript,
    runs it through the same pipeline as /analyze, and persists the
    result to the database as a new lead.

    Always returns HTTP 200 -- Vapi retries webhook deliveries that
    don't return 2xx, so any failure here (bad payload, model error, DB
    error) is logged and swallowed rather than raised, to avoid a retry
    storm re-processing the same call repeatedly.
    """
    try:
        payload = await request.json()
    except Exception:
        logger.exception("Vapi webhook: request body was not valid JSON.")
        return VapiWebhookResponse(status="received")

    transcript = extract_vapi_transcript(payload)
    if not transcript:
        logger.warning("Vapi webhook: no transcript found in payload, skipping.")
        return VapiWebhookResponse(status="received")

    contact_phone = extract_vapi_customer_phone(payload)

    try:
        combined, scored = run_analysis(transcript)
        await crud.persist_analysis(
            db, raw_text=transcript, city=None, source="vapi", contact_phone=contact_phone, combined=combined, scored=scored
        )
    except Exception:
        logger.exception("Vapi webhook: failed to analyze/persist transcript.")

    return VapiWebhookResponse(status="received")


# ---------------------------------------------------------------------------
# 4. GET /leads
# ---------------------------------------------------------------------------

@app.get("/leads", response_model=LeadListResponse)
async def get_leads(
    tier: str | None = Query(None, description="Filter by tier: hot, warm, cold"),
    sentiment: str | None = Query(None, description="Filter by sentiment: enthusiastic, frustrated, hesitant"),
    intent: str | None = Query(None, description="Filter by intent, e.g. Buy"),
    limit: int = Query(20, ge=1, le=200),
    skip: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> LeadListResponse:
    """Lists leads sorted by score descending (highest first), with
    optional tier/sentiment/intent filters and skip/limit pagination."""
    try:
        total, rows = await crud.list_leads(db, tier=tier, sentiment=sentiment, intent=intent, limit=limit, skip=skip)
    except Exception as exc:
        logger.exception("Failed to query leads.")
        raise HTTPException(status_code=500, detail=f"Failed to query leads: {exc}") from exc

    leads = [
        LeadSummary(
            id=lead.id,
            name=lead.name,
            contact_phone=lead.contact_phone,
            current_status=lead.current_status,
            score=score.score if score else None,
            tier=score.tier if score else None,
            sentiment=features.sentiment if features else None,
            intent=features.intent if features else None,
            created_at=lead.created_at,
            updated_at=lead.updated_at,
        )
        for lead, score, features in rows
    ]
    return LeadListResponse(total=total, limit=limit, skip=skip, leads=leads)


# ---------------------------------------------------------------------------
# 5. GET /leads/{lead_id}
# ---------------------------------------------------------------------------

@app.get("/leads/{lead_id}", response_model=LeadDetail)
async def get_lead(lead_id: int, db: AsyncSession = Depends(get_db)) -> LeadDetail:
    """Returns full details for a single lead: transcript, NER output,
    sentiment, intent, lead score + SHAP values, status, and the full
    status-change audit trail."""
    try:
        lead = await crud.get_lead_detail(db, lead_id)
    except Exception as exc:
        logger.exception("Failed to fetch lead id=%s.", lead_id)
        raise HTTPException(status_code=500, detail=f"Failed to fetch lead: {exc}") from exc

    if lead is None:
        raise HTTPException(status_code=404, detail=f"Lead {lead_id} not found")

    latest_transcript = max(lead.transcripts, key=lambda t: t.created_at, default=None) if lead.transcripts else None
    score = lead.current_score
    features = score.lead_features if score else None

    ner = None
    sentiment = None
    intent = None
    lead_score = None
    if features:
        ner = NEROutput(
            location=[features.location] if features.location else [],
            property_type=[features.property_type] if features.property_type else [],
            amenities=features.amenities or [],
            budget=features.budget_raw,
        )
        sentiment = SentimentOutput(
            label=features.sentiment,
            confidence=features.sentiment_confidence,
            reliability=_reliability(features.sentiment_confidence),
        )
        intent = IntentOutput(
            label=features.intent,
            confidence=features.intent_confidence,
            reliability=_reliability(features.intent_confidence),
        )
    if score:
        lead_score = LeadScoreOutput(
            score=score.score,
            tier=score.tier,
            shap_values=score.shap_values or {},
            sentiment_reliability=_reliability(features.sentiment_confidence if features else None),
        )

    status_history = [
        {
            "status_from": e.status_from,
            "status_to": e.status_to,
            "lost_reason": e.lost_reason,
            "notes": e.notes,
            "changed_at": e.changed_at.isoformat(),
        }
        for e in sorted(lead.status_events, key=lambda e: e.changed_at)
    ]

    return LeadDetail(
        id=lead.id,
        name=lead.name,
        contact_phone=lead.contact_phone,
        contact_email=lead.contact_email,
        current_status=lead.current_status,
        created_at=lead.created_at,
        updated_at=lead.updated_at,
        transcript=latest_transcript.raw_text if latest_transcript else None,
        ner=ner,
        sentiment=sentiment,
        intent=intent,
        lead_score=lead_score,
        status_history=status_history,
    )


# ---------------------------------------------------------------------------
# 6. PATCH /leads/{lead_id}/status
# ---------------------------------------------------------------------------

@app.patch("/leads/{lead_id}/status", response_model=LeadStatusUpdateResponse)
async def update_lead_status(
    lead_id: int, payload: LeadStatusUpdateRequest, db: AsyncSession = Depends(get_db)
) -> LeadStatusUpdateResponse:
    """Updates a lead's status and appends an audit-trail row to
    lead_status_events (append-only -- see app/lead_scoring/models.py).
    `status` and `lost_reason` are validated against the existing
    LeadStatus/LostReason enums by LeadStatusUpdateRequest itself
    (422 on an invalid value, before this handler even runs)."""
    try:
        result = await crud.update_lead_status(
            db,
            lead_id,
            new_status=payload.status,
            notes=payload.notes,
            lost_reason=payload.lost_reason,
        )
    except Exception as exc:
        logger.exception("Failed to update status for lead id=%s.", lead_id)
        raise HTTPException(status_code=500, detail=f"Failed to update lead status: {exc}") from exc

    if result is None:
        raise HTTPException(status_code=404, detail=f"Lead {lead_id} not found")

    lead, event = result
    return LeadStatusUpdateResponse(
        id=lead.id,
        current_status=lead.current_status,
        notes=event.notes,
        lost_reason=event.lost_reason,
        changed_at=event.changed_at,
    )


# ---------------------------------------------------------------------------
# 7. GET /analytics
# ---------------------------------------------------------------------------

@app.get("/analytics", response_model=AnalyticsResponse)
async def analytics(db: AsyncSession = Depends(get_db)) -> AnalyticsResponse:
    """Returns portfolio-level aggregates: lead/tier counts, sentiment
    and intent distributions, average score, and conversion rate
    (won / total)."""
    try:
        stats = await crud.get_analytics(db)
    except Exception as exc:
        logger.exception("Failed to compute analytics.")
        raise HTTPException(status_code=500, detail=f"Failed to compute analytics: {exc}") from exc

    return AnalyticsResponse(**stats)
