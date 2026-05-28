"""Verify ORM models create/drop and basic constraint enforcement."""

from __future__ import annotations

import pytest
from sqlalchemy import inspect
from sqlalchemy.orm import Session

from backend.database.models import (
    Agent,
    Batch,
    BlacklistTicket,
    Draw,
    MasterDealer,
    Offloaded,
    Preference,
    Sale,
    WinningTicket,
)


def test_all_tables_created(session: Session) -> None:
    inspector = inspect(session.get_bind())
    tables = sorted(inspector.get_table_names())
    expected = [
        "agents",
        "batches",
        "blacklist_tickets",
        "draws",
        "master_dealers",
        "offloaded",
        "preferences",
        "sales",
        "winning_tickets",
    ]
    assert tables == expected


def test_create_agent(session: Session) -> None:
    agent = Agent(id="A01", name="Test Agent", commission=10)
    session.add(agent)
    session.flush()
    fetched = session.get(Agent, "A01")
    assert fetched is not None
    assert fetched.name == "Test Agent"
    assert fetched.commission == 10


def test_create_draw(session: Session) -> None:
    draw = Draw(open_date="2026-01-01T00:00:00", cutoff_time="2026-12-31T23:59:59")
    session.add(draw)
    session.flush()
    assert draw.id is not None
    assert draw.status == "OPEN"
    assert draw.house_holding_amount == 0


def test_draw_invalid_status_raises(session: Session) -> None:
    draw = Draw(open_date="2026-01-01T00:00:00", cutoff_time="2026-12-31T23:59:59", status="INVALID")
    session.add(draw)
    with pytest.raises(Exception):
        session.flush()


def test_create_batch(session: Session) -> None:
    agent = Agent(id="A01", name="Test Agent")
    draw = Draw(open_date="2026-01-01T00:00:00", cutoff_time="2026-12-31T23:59:59")
    session.add_all([agent, draw])
    session.flush()

    batch = Batch(draw_id=draw.id, agent_id=agent.id)
    session.add(batch)
    session.flush()
    assert batch.id is not None
    assert batch.total_amount == 0


def test_create_sale(session: Session) -> None:
    agent = Agent(id="A01", name="Test Agent")
    draw = Draw(open_date="2026-01-01T00:00:00", cutoff_time="2026-12-31T23:59:59")
    session.add_all([agent, draw])
    session.flush()

    batch = Batch(draw_id=draw.id, agent_id=agent.id)
    session.add(batch)
    session.flush()

    sale = Sale(draw_id=draw.id, agent_id=agent.id, batch_id=batch.id, ticket="123", amount=100)
    session.add(sale)
    session.flush()
    assert sale.id is not None


def test_preference_crud(session: Session) -> None:
    pref = Preference(key="test_key", value="test_value")
    session.add(pref)
    session.flush()

    fetched = session.get(Preference, "test_key")
    assert fetched is not None
    assert fetched.value == "test_value"


def test_blacklist_unique_constraint(session: Session) -> None:
    draw = Draw(open_date="2026-01-01T00:00:00", cutoff_time="2026-12-31T23:59:59")
    session.add(draw)
    session.flush()

    bt1 = BlacklistTicket(draw_id=draw.id, ticket="123", type="BLOCK")
    session.add(bt1)
    session.flush()

    bt2 = BlacklistTicket(draw_id=draw.id, ticket="123", type="BLOCK")
    session.add(bt2)
    with pytest.raises(Exception):
        session.flush()
