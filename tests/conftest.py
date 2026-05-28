"""
Shared pytest fixtures for the 3D Reporter test suite.

Uses in-memory SQLite so tests are fast and isolated. Each test function
gets a fresh session that rolls back after the test completes.
"""

from __future__ import annotations

import time
from collections.abc import Generator

import pytest
from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from backend.database.models import Base


@pytest.fixture(scope="function")
def engine() -> Generator[Engine, None, None]:
    """In-memory SQLite engine with all tables created."""
    eng = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(eng)
    yield eng
    Base.metadata.drop_all(eng)
    eng.dispose()


@pytest.fixture(scope="function")
def session(engine: Engine) -> Generator[Session, None, None]:
    """Session that rolls back after each test."""
    SessionFactory = sessionmaker(bind=engine)
    sess = SessionFactory()
    sess.begin()
    yield sess
    sess.rollback()
    sess.close()


@pytest.fixture(scope="function")
def start_time() -> float:
    """Fixed start time for reproducible uptime/telemetry tests."""
    return time.time() - 3600  # 1 hour ago
