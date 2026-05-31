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
    DrawSettlementAgent,
    DrawSettlementMaster,
    DrawSettlementSummary,
    DrawSettlementTicket,
    DrawTicketSnapshot,
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
        "draw_settlement_agent",
        "draw_settlement_master",
        "draw_settlement_summary",
        "draw_settlement_ticket",
        "draw_ticket_snapshot",
        "draws",
        "master_dealers",
        "offloaded",
        "preferences",
        "sales",
        "winning_tickets",
    ]
    assert tables == expected


def test_create_agent(session: Session) -> None:
    agent = Agent(id="A01", name="Test Agent", commission_rate=10.0, jp_factor=500.0, sp_factor=100.0)
    session.add(agent)
    session.flush()
    fetched = session.get(Agent, "A01")
    assert fetched is not None
    assert fetched.name == "Test Agent"
    assert fetched.commission_rate == 10.0
    assert fetched.active == 1


def test_create_draw(session: Session) -> None:
    draw = Draw(draw_name="Test Draw", house_holding_amount=20000)
    session.add(draw)
    session.flush()
    assert draw.id is not None
    assert draw.status == "OPEN"
    assert draw.house_holding_amount == 20000


def test_draw_invalid_status_raises(session: Session) -> None:
    draw = Draw(draw_name="Bad Draw", house_holding_amount=0, status="INVALID")
    session.add(draw)
    with pytest.raises(Exception):
        session.flush()


def test_create_batch(session: Session) -> None:
    agent = Agent(id="A01", name="Test Agent", commission_rate=10.0, jp_factor=500.0, sp_factor=100.0)
    draw = Draw(draw_name="Test Draw", house_holding_amount=20000)
    session.add_all([agent, draw])
    session.flush()

    batch = Batch(draw_id=draw.id, agent_id=agent.id, batch_no="1")
    session.add(batch)
    session.flush()
    assert batch.id is not None
    assert batch.total_amount == 0
    assert batch.ticket_count == 0


def test_create_sale(session: Session) -> None:
    agent = Agent(id="A01", name="Test Agent", commission_rate=10.0, jp_factor=500.0, sp_factor=100.0)
    draw = Draw(draw_name="Test Draw", house_holding_amount=20000)
    session.add_all([agent, draw])
    session.flush()

    batch = Batch(draw_id=draw.id, agent_id=agent.id, batch_no="1")
    session.add(batch)
    session.flush()

    sale = Sale(batch_id=batch.id, ticket="123", amount=100)
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
    draw = Draw(draw_name="Test Draw", house_holding_amount=20000)
    session.add(draw)
    session.flush()

    bt1 = BlacklistTicket(draw_id=draw.id, ticket="123", restriction_type="BLOCK")
    session.add(bt1)
    session.flush()

    bt2 = BlacklistTicket(draw_id=draw.id, ticket="123", restriction_type="BLOCK")
    session.add(bt2)
    with pytest.raises(Exception):
        session.flush()


def test_winning_ticket_prize_type(session: Session) -> None:
    draw = Draw(draw_name="Test Draw", house_holding_amount=20000)
    session.add(draw)
    session.flush()

    wt = WinningTicket(draw_id=draw.id, ticket="123", prize_type="JACKPOT")
    session.add(wt)
    session.flush()
    assert wt.prize_type == "JACKPOT"


def test_settlement_tables_exist(session: Session) -> None:
    """Verify settlement tables can be written to."""
    draw = Draw(draw_name="Test Draw", house_holding_amount=20000)
    session.add(draw)
    session.flush()

    sa = DrawSettlementAgent(
        draw_id=draw.id, agent_id="A01",
        commission_rate_used=15.0, jp_factor_used=500.0, sp_factor_used=100.0,
        total_sales=100000, commission_amount=15000,
        net_collection=85000, winning_settlement=50000000, final_balance=-49915000,
    )
    session.add(sa)
    session.flush()
    assert sa.id is not None
