"""
Database connection management.

Provides a lazy-initialized SQLAlchemy engine singleton and a session factory.
Call `init_db()` once at startup to create all tables.
"""

from __future__ import annotations

import logging
import os
from typing import Generator

from sqlalchemy import Engine, create_engine, event
from sqlalchemy.orm import Session, sessionmaker

from backend.config import DATABASE_URL

logger = logging.getLogger(__name__)

_engine: Engine | None = None
_SessionFactory: type[Session] | None = None


def _set_sqlite_pragmas(dbapi_connection, connection_record):
    """Enable foreign keys and set safe defaults on every SQLite connection."""
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys = ON")
    cursor.execute("PRAGMA busy_timeout = 5000")
    cursor.execute("PRAGMA synchronous = NORMAL")
    cursor.close()


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
        event.listen(_engine, "connect", _set_sqlite_pragmas)
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

    engine = get_engine()

    logger.info("Initializing database schema...")
    Base.metadata.create_all(engine)
    logger.info("Database schema ready.")

    # Enable WAL mode (persists across connections)
    _exec_pragma(engine, "journal_mode", "WAL")

    # Install database views
    _install_views(engine)


def _exec_pragma(engine: Engine, pragma: str, value: str) -> None:
    """Execute a PRAGMA statement on a raw connection (for persistent settings)."""
    with engine.connect() as conn:
        conn.exec_driver_sql(f"PRAGMA {pragma} = {value}")
        conn.commit()


def _install_views(engine: Engine) -> None:
    """Execute views.sql if it exists."""
    views_path = os.path.join(os.path.dirname(__file__), "views.sql")
    if not os.path.exists(views_path):
        logger.warning("views.sql not found at %s — skipping views installation.", views_path)
        return

    with open(views_path, encoding="utf-8") as f:
        sql = f.read().strip()

    if not sql:
        return

    logger.info("Installing database views...")
    with engine.connect() as conn:
        for stmt in sql.split(";"):
            stmt = stmt.strip()
            if stmt:
                conn.exec_driver_sql(stmt)
        conn.commit()
    logger.info("Database views installed.")
