"""
Database connection management.

Provides a lazy-initialized SQLAlchemy engine singleton and a session factory.
Call `init_db()` once at startup to create all tables, triggers, and views.
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

_TRIGGERS_SQL = """
CREATE TRIGGER IF NOT EXISTS trg_sales_insert
AFTER INSERT ON sales
BEGIN
  UPDATE batches
  SET total_amount = (SELECT COALESCE(SUM(amount), 0) FROM sales WHERE batch_id = NEW.batch_id),
      ticket_count = (SELECT COUNT(*) FROM sales WHERE batch_id = NEW.batch_id)
  WHERE id = NEW.batch_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_sales_update
AFTER UPDATE ON sales
BEGIN
  UPDATE batches
  SET total_amount = (SELECT COALESCE(SUM(amount), 0) FROM sales WHERE batch_id = NEW.batch_id),
      ticket_count = (SELECT COUNT(*) FROM sales WHERE batch_id = NEW.batch_id)
  WHERE id = NEW.batch_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_sales_delete
AFTER DELETE ON sales
BEGIN
  UPDATE batches
  SET total_amount = (SELECT COALESCE(SUM(amount), 0) FROM sales WHERE batch_id = OLD.batch_id),
      ticket_count = (SELECT COUNT(*) FROM sales WHERE batch_id = OLD.batch_id)
  WHERE id = OLD.batch_id;
END;
"""


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
    """Create all tables, triggers, and views. Idempotent — safe to call on every startup."""
    from backend.database.models import Base

    engine = get_engine()

    logger.info("Initializing database schema...")
    Base.metadata.create_all(engine)
    logger.info("Database schema ready.")

    # Enable WAL mode (persists across connections)
    _exec_pragma(engine, "journal_mode", "WAL")

    # Install triggers
    _install_triggers(engine)

    # Install views
    _install_views(engine)


def _exec_pragma(engine: Engine, pragma: str, value: str) -> None:
    """Execute a PRAGMA statement on a raw connection (for persistent settings)."""
    with engine.connect() as conn:
        conn.exec_driver_sql(f"PRAGMA {pragma} = {value}")
        conn.commit()


def _install_triggers(engine: Engine) -> None:
    """Install SQL triggers for batch total/ticket_count maintenance."""
    logger.info("Installing database triggers...")
    with engine.connect() as conn:
        conn.connection.executescript(_TRIGGERS_SQL)
        conn.commit()
    logger.info("Database triggers installed.")


def _install_views(engine: Engine) -> None:
    """Execute views.sql to create all database views."""
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
        conn.connection.executescript(sql)
        conn.commit()
    logger.info("Database views installed.")
