"""
Lead scoring schema: transcripts -> lead_features -> lead_scores -> leads
-> lead_status_events.

Design notes:

- `lead_scores.label_source` is the load-bearing field for honest
  retraining later. Three values, not two:
    - "heuristic_bootstrap": produced by the documented heuristic
      formula (see app/lead_scoring/heuristic.py). A real training
      label, used because no real conversion outcomes exist yet.
    - "agent_confirmed": a real outcome, confirmed by a human/sales
      process (e.g. a lead genuinely won or lost). Also a real
      training label, and should be preferred over heuristic_bootstrap
      once available.
    - "model_predicted": the score the trained model assigned when
      scoring a lead operationally. NOT a training label -- training
      code must filter to label_source IN ('heuristic_bootstrap',
      'agent_confirmed') only. Letting model_predicted rows leak into
      retraining would create a feedback loop where the model just
      learns to imitate its own past predictions.

- `lead_status_events` is append-only by convention (rows are never
  updated or deleted, only inserted) -- it's the audit trail for how a
  lead's status changed over time, including why it was lost.

- `lost_reason` uses a controlled vocabulary (LostReason) split into
  genuine negative outcomes (real signal about lead quality -- safe to
  use as future negative training labels) and data-quality issues (not
  a real signal, must be excluded from training: a lead marked
  "lost-unreachable" wasn't necessarily a bad lead, we just failed to
  reach them).
"""

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    JSON,
    CheckConstraint,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    Uuid,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


def _utcnow():
    return datetime.now(timezone.utc)


class Sentiment(str, enum.Enum):
    ENTHUSIASTIC = "enthusiastic"
    FRUSTRATED = "frustrated"
    HESITANT = "hesitant"


class Tier(str, enum.Enum):
    HOT = "hot"
    WARM = "warm"
    COLD = "cold"


class LabelSource(str, enum.Enum):
    HEURISTIC_BOOTSTRAP = "heuristic_bootstrap"
    AGENT_CONFIRMED = "agent_confirmed"
    MODEL_PREDICTED = "model_predicted"

    @property
    def is_valid_training_label(self) -> bool:
        """Only these should ever be pulled into a training dataset."""
        return self in (LabelSource.HEURISTIC_BOOTSTRAP, LabelSource.AGENT_CONFIRMED)


class LeadStatus(str, enum.Enum):
    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    WON = "won"
    LOST = "lost"


class LostReason(str, enum.Enum):
    # Genuine negative outcomes -- real signal about lead quality,
    # usable as future negative training labels.
    LOST_BUDGET = "lost-budget"
    LOST_COMPETITOR = "lost-competitor"
    LOST_TIMING = "lost-timing"
    LOST_LOCATION_MISMATCH = "lost-location-mismatch"
    LOST_NOT_INTERESTED = "lost-not-interested"
    # Data-quality / process issues -- NOT a signal about lead quality,
    # must be excluded from training.
    LOST_UNREACHABLE = "lost-unreachable"
    LOST_DUPLICATE = "lost-duplicate"
    LOST_INVALID_DATA = "lost-invalid-data"
    LOST_AGENT_ERROR = "lost-agent-error"

    @property
    def is_data_quality_issue(self) -> bool:
        return self in (
            LostReason.LOST_UNREACHABLE,
            LostReason.LOST_DUPLICATE,
            LostReason.LOST_INVALID_DATA,
            LostReason.LOST_AGENT_ERROR,
        )


class Transcript(Base):
    __tablename__ = "transcripts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    lead_id: Mapped[int | None] = mapped_column(ForeignKey("leads.id"), nullable=True, index=True)
    raw_text: Mapped[str] = mapped_column(Text, nullable=False)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    source: Mapped[str] = mapped_column(String(50), nullable=False, default="unknown")
    created_at: Mapped[datetime] = mapped_column(default=_utcnow)

    lead: Mapped["Lead | None"] = relationship(back_populates="transcripts", foreign_keys=[lead_id])
    features: Mapped[list["LeadFeatures"]] = relationship(back_populates="transcript")


class LeadFeatures(Base):
    __tablename__ = "lead_features"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    transcript_id: Mapped[int] = mapped_column(ForeignKey("transcripts.id"), nullable=False, index=True)

    location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    property_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    budget_raw: Mapped[str | None] = mapped_column(String(100), nullable=True)
    budget_amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    amenities: Mapped[list | None] = mapped_column(JSON, nullable=True)
    amenities_count: Mapped[int] = mapped_column(Integer, default=0)

    sentiment: Mapped[str | None] = mapped_column(Enum(Sentiment), nullable=True)
    sentiment_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Added for the FastAPI layer (api/): intent classification didn't
    # exist yet when this schema was first authored. Plain string, not
    # an Enum(Intent), so a future intent class can be added without a
    # migration -- unlike Sentiment/Tier, intent's label set isn't
    # baked into the trained lead-scoring model's feature encoding, so
    # there's no matching correctness reason to constrain it here.
    intent: Mapped[str | None] = mapped_column(String(30), nullable=True)
    intent_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)

    entity_completeness: Mapped[float] = mapped_column(Float, default=0.0)
    turn_count: Mapped[int] = mapped_column(Integer, default=0)
    message_length: Mapped[int] = mapped_column(Integer, default=0)

    ner_model_version: Mapped[str | None] = mapped_column(String(100), nullable=True)
    sentiment_model_version: Mapped[str | None] = mapped_column(String(100), nullable=True)
    intent_model_version: Mapped[str | None] = mapped_column(String(100), nullable=True)
    extracted_at: Mapped[datetime] = mapped_column(default=_utcnow)

    transcript: Mapped["Transcript"] = relationship(back_populates="features")
    scores: Mapped[list["LeadScore"]] = relationship(back_populates="lead_features")


class LeadScore(Base):
    __tablename__ = "lead_scores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    lead_features_id: Mapped[int] = mapped_column(ForeignKey("lead_features.id"), nullable=False, index=True)

    score: Mapped[float] = mapped_column(Float, nullable=False)  # 0-100
    tier: Mapped[str] = mapped_column(Enum(Tier), nullable=False)

    # See module docstring: only heuristic_bootstrap / agent_confirmed
    # rows are valid training labels. model_predicted rows are
    # operational output only.
    label_source: Mapped[str] = mapped_column(Enum(LabelSource), nullable=False, index=True)
    heuristic_version: Mapped[str | None] = mapped_column(String(50), nullable=True)
    model_version: Mapped[str | None] = mapped_column(String(50), nullable=True)
    shap_values: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    scored_at: Mapped[datetime] = mapped_column(default=_utcnow)

    lead_features: Mapped["LeadFeatures"] = relationship(back_populates="scores")


class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    contact_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    contact_email: Mapped[str | None] = mapped_column(String(200), nullable=True)

    current_status: Mapped[str] = mapped_column(Enum(LeadStatus), nullable=False, default=LeadStatus.NEW)
    current_score_id: Mapped[int | None] = mapped_column(ForeignKey("lead_scores.id"), nullable=True)
    assigned_agent: Mapped[str | None] = mapped_column(String(200), nullable=True)

    created_at: Mapped[datetime] = mapped_column(default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=_utcnow, onupdate=_utcnow)

    transcripts: Mapped[list["Transcript"]] = relationship(back_populates="lead", foreign_keys=[Transcript.lead_id])
    current_score: Mapped["LeadScore | None"] = relationship(foreign_keys=[current_score_id])
    status_events: Mapped[list["LeadStatusEvent"]] = relationship(back_populates="lead", order_by="LeadStatusEvent.changed_at")


class LeadStatusEvent(Base):
    """Append-only audit trail: rows are inserted, never updated or deleted."""

    __tablename__ = "lead_status_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    lead_id: Mapped[int] = mapped_column(ForeignKey("leads.id"), nullable=False, index=True)

    status_from: Mapped[str | None] = mapped_column(Enum(LeadStatus), nullable=True)
    status_to: Mapped[str] = mapped_column(Enum(LeadStatus), nullable=False)
    lost_reason: Mapped[str | None] = mapped_column(Enum(LostReason), nullable=True)

    changed_by: Mapped[str | None] = mapped_column(String(200), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    changed_at: Mapped[datetime] = mapped_column(default=_utcnow)

    lead: Mapped["Lead"] = relationship(back_populates="status_events")


# ---------------------------------------------------------------------------
# Public catalog: projects -> properties (what the landing page shows and the
# admin edits). Independent of the lead tables above. The SQL equivalent, plus
# seed data, is migrations/001_projects_properties.sql.
# ---------------------------------------------------------------------------

_JSON_LIST = JSON().with_variant(JSONB(), "postgresql")
_TS = DateTime(timezone=True)


class Project(Base):
    __tablename__ = "projects"
    __table_args__ = (
        CheckConstraint("city IN ('Nashik','Pune')", name="projects_city_check"),
        CheckConstraint("status IN ('Ready to move','Under construction','New launch')", name="projects_status_check"),
        CheckConstraint("total_units IS NULL OR total_units >= 0", name="projects_total_units_check"),
        CheckConstraint("available_units IS NULL OR available_units >= 0", name="projects_available_units_check"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    city: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    locality: Mapped[str] = mapped_column(String(120), nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False)
    features: Mapped[list] = mapped_column(_JSON_LIST, nullable=False, default=list)
    total_units: Mapped[int | None] = mapped_column(Integer, nullable=True)
    available_units: Mapped[int | None] = mapped_column(Integer, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    image: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(_TS, default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(_TS, default=_utcnow, onupdate=_utcnow)

    properties: Mapped[list["Property"]] = relationship(
        back_populates="project", cascade="all, delete-orphan", passive_deletes=True, order_by="Property.created_at"
    )


class Property(Base):
    __tablename__ = "properties"
    __table_args__ = (
        CheckConstraint("property_type IN ('Apartment','Villa','Row house','Penthouse','Plot')", name="properties_type_check"),
        CheckConstraint("status IN ('available','sold','hold')", name="properties_status_check"),
        CheckConstraint("furnishing IS NULL OR furnishing IN ('Unfurnished','Semi-furnished','Fully furnished')", name="properties_furnishing_check"),
        CheckConstraint("price_lakh > 0", name="properties_price_check"),
        CheckConstraint("beds >= 0 AND baths >= 0", name="properties_rooms_check"),
        CheckConstraint("bhk IS NULL OR bhk >= 0", name="properties_bhk_check"),
        CheckConstraint("area_sqft IS NULL OR area_sqft > 0", name="properties_area_check"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    property_type: Mapped[str] = mapped_column(String(20), nullable=False)
    bhk: Mapped[int | None] = mapped_column(Integer, nullable=True)
    price_lakh: Mapped[float] = mapped_column(Numeric(10, 2, asdecimal=False), nullable=False)
    area_sqft: Mapped[int | None] = mapped_column(Integer, nullable=True)
    furnishing: Mapped[str | None] = mapped_column(String(20), nullable=True)
    beds: Mapped[int] = mapped_column(Integer, nullable=False)
    baths: Mapped[int] = mapped_column(Integer, nullable=False)
    tags: Mapped[list] = mapped_column(_JSON_LIST, nullable=False, default=list)
    status: Mapped[str] = mapped_column(String(10), nullable=False, default="available")
    image: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(_TS, default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(_TS, default=_utcnow, onupdate=_utcnow)

    project: Mapped["Project"] = relationship(back_populates="properties")
