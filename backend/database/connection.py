"""
Database connection management.

Provides a lazy-initialized SQLAlchemy engine singleton and a session factory.
Call `init_db()` once at startup to create all tables.
"""

from __future__ import annotations

import logging
from typing import Generator

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from backend.config import DATABASE_URL

logger = logging.getLogger(__name__)

_engine: Engine | None = None
_SessionFactory: type[Session] | None = None


def get_engine() -> Engine:
    """Return the SQLAlchemy engine, creating it on first call."""
    global _engine
    if _engine is None:
        logger.info("Creating database engine for %s", DATABASE_URL)
        _engine = create_engine(
            DATABASE_URL,
            echo=False,
            connect_args={"check_same_thread": False},
        )
    return _engine


def _get_session_factory() -> type[Session]:
    global _SessionFactory
    if _SessionFactory is None:
        _SessionFactory = sessionmaker(bind=get_engine())
    return _SessionFactory


def get_session() -> Session:
    """Return a new SQLAlchemy Session. Caller is responsible for closing it."""
    return _get_session_factory()()


def init_db() -> None:
    """Create all tables defined in the ORM models. Idempotent — safe to call on every startup."""
    from backend.database.models import Base  # noqa: F811 — avoid circular import

    logger.info("Initializing database schema...")
    Base.metadata.create_all(get_engine())
    logger.info("Database schema ready.")
