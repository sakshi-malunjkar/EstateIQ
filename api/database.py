"""
Async SQLAlchemy engine/session setup for the FastAPI layer.

Reuses the schema in app/lead_scoring/models.py (Transcript, LeadFeatures,
LeadScore, Lead, LeadStatusEvent) rather than redefining it -- that module
is the single source of truth for the DB schema, shared with the batch
feature-extraction pipeline (app/lead_scoring/extract_features.py) and
training data prep. This module only adds an async engine/session on top,
since app/lead_scoring/db.py's existing engine is synchronous and FastAPI
route handlers here are async.

DATABASE_URL is read from the environment (loaded from .env via
python-dotenv, see .env.example). Expected form:
    postgresql://user:password@host/dbname
which is rewritten to use the async-capable psycopg (v3) driver:
    postgresql+psycopg://user:password@host/dbname
psycopg (v3, not the old psycopg2) is already a project dependency and
supports SQLAlchemy's async engine directly -- no separate asyncpg
dependency needed.

If DATABASE_URL is unset, falls back to a local async SQLite file
(data/api_dev.db) purely so /health, /analyze, and the API can be smoke-
tested without a Postgres instance available. This fallback is for local
development convenience only -- set DATABASE_URL to a real Postgres
instance before relying on persistence (see .env.example).
"""

import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.lead_scoring.models import Base

load_dotenv()

logger = logging.getLogger("estateiq.api.database")

DEFAULT_SQLITE_PATH = Path(__file__).parent.parent / "data" / "api_dev.db"
_raw_url = os.environ.get("DATABASE_URL")

if _raw_url:
    if _raw_url.startswith("postgresql://"):
        DATABASE_URL = _raw_url.replace("postgresql://", "postgresql+psycopg://", 1)
    elif _raw_url.startswith("postgres://"):  # some hosts (e.g. Heroku-style) use this scheme
        DATABASE_URL = _raw_url.replace("postgres://", "postgresql+psycopg://", 1)
    else:
        DATABASE_URL = _raw_url
else:
    logger.warning(
        "DATABASE_URL not set -- falling back to local SQLite at %s. "
        "Set DATABASE_URL in .env for real persistence (see .env.example).",
        DEFAULT_SQLITE_PATH,
    )
    DATABASE_URL = f"sqlite+aiosqlite:///{DEFAULT_SQLITE_PATH}"

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False, class_=AsyncSession)


async def init_db() -> None:
    """Create all tables if they don't already exist. Safe to call on
    every startup -- create_all no-ops on tables that already exist."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    """FastAPI dependency: yields a request-scoped AsyncSession."""
    async with AsyncSessionLocal() as session:
        yield session
