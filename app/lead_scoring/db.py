"""
Database engine/session setup for lead scoring.

Defaults to a local SQLite file (no Postgres instance on this dev
machine yet) but the schema in models.py is plain SQLAlchemy with no
SQLite-specific types, so pointing DATABASE_URL at a real Postgres
instance (matching the psycopg dependency already in requirements.txt)
is a config change, not a rewrite.
"""

import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

DEFAULT_SQLITE_PATH = Path(__file__).parent.parent.parent / "data" / "lead_scoring.db"
DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{DEFAULT_SQLITE_PATH}")

engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


def get_session():
    return SessionLocal()


def init_db():
    """Create all tables if they don't already exist."""
    from app.lead_scoring.models import Base
    Base.metadata.create_all(engine)
