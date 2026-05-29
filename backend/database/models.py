"""
SQLAlchemy 2.0 ORM models for the 3D Reporter database.

Matches the DDL in schema.sql exactly. Business rules formerly enforced by
triggers (single open draw, status transitions, BLOCK blacklist, batch total
sync) are enforced at the service layer — the single source of truth for
domain logic.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Optional

from sqlalchemy import CheckConstraint, ForeignKey, Index, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# 1. Agent
# ---------------------------------------------------------------------------
class Agent(Base):
    __tablename__ = "agents"

    id: Mapped[str] = mapped_column(primary_key=True)
    name: Mapped[str]
    commission: Mapped[int] = mapped_column(default=0)
    jp_factor: Mapped[int] = mapped_column(default=0)
    sp_factor: Mapped[int] = mapped_column(default=0)
    note: Mapped[Optional[str]]
    created_at: Mapped[str] = mapped_column(default=lambda: datetime.now(UTC).isoformat())

    batches: Mapped[list[Batch]] = relationship(back_populates="agent")
    sales: Mapped[list[Sale]] = relationship(back_populates="agent")


# ---------------------------------------------------------------------------
# 2. Master Dealer
# ---------------------------------------------------------------------------
class MasterDealer(Base):
    __tablename__ = "master_dealers"

    id: Mapped[str] = mapped_column(primary_key=True)
    name: Mapped[str]
    commission: Mapped[int] = mapped_column(default=0)
    jp_factor: Mapped[int] = mapped_column(default=0)
    sp_factor: Mapped[int] = mapped_column(default=0)
    note: Mapped[Optional[str]]
    created_at: Mapped[str] = mapped_column(default=lambda: datetime.now(UTC).isoformat())

    offloaded_entries: Mapped[list[Offloaded]] = relationship(back_populates="master_dealer")


# ---------------------------------------------------------------------------
# 3. Draw
# ---------------------------------------------------------------------------
class Draw(Base):
    __tablename__ = "draws"
    __table_args__ = (
        CheckConstraint("status IN ('OPEN', 'CLOSED', 'SETTLED')", name="ck_draws_status"),
        Index("idx_draws_status", "status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    open_date: Mapped[str]
    cutoff_time: Mapped[str]
    status: Mapped[str] = mapped_column(default="OPEN")
    house_holding_amount: Mapped[int] = mapped_column(default=0)
    note: Mapped[Optional[str]]
    created_at: Mapped[str] = mapped_column(default=lambda: datetime.now(UTC).isoformat())

    batches: Mapped[list[Batch]] = relationship(back_populates="draw")
    sales: Mapped[list[Sale]] = relationship(back_populates="draw")
    offloaded_entries: Mapped[list[Offloaded]] = relationship(back_populates="draw")
    blacklist_tickets: Mapped[list[BlacklistTicket]] = relationship(back_populates="draw")
    winning_tickets: Mapped[list[WinningTicket]] = relationship(back_populates="draw")


# ---------------------------------------------------------------------------
# 4. Batch
# ---------------------------------------------------------------------------
class Batch(Base):
    __tablename__ = "batches"
    __table_args__ = (
        UniqueConstraint("draw_id", "agent_id", name="uq_batch_draw_agent"),
        Index("idx_batches_draw_id", "draw_id"),
        Index("idx_batches_agent_id", "agent_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    draw_id: Mapped[int] = mapped_column(ForeignKey("draws.id"))
    agent_id: Mapped[str] = mapped_column(ForeignKey("agents.id"))
    total_amount: Mapped[int] = mapped_column(default=0)
    note: Mapped[Optional[str]]
    created_at: Mapped[str] = mapped_column(default=lambda: datetime.now(UTC).isoformat())

    draw: Mapped[Draw] = relationship(back_populates="batches")
    agent: Mapped[Agent] = relationship(back_populates="batches")
    sales: Mapped[list[Sale]] = relationship(back_populates="batch")


# ---------------------------------------------------------------------------
# 5. Sale
# ---------------------------------------------------------------------------
class Sale(Base):
    __tablename__ = "sales"
    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_sales_amount_positive"),
        Index("idx_sales_draw_id", "draw_id"),
        Index("idx_sales_agent_id", "agent_id"),
        Index("idx_sales_batch_id", "batch_id"),
        Index("idx_sales_ticket", "draw_id", "ticket"),
        Index("idx_sales_draw_agent", "draw_id", "agent_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    draw_id: Mapped[int] = mapped_column(ForeignKey("draws.id"))
    agent_id: Mapped[str] = mapped_column(ForeignKey("agents.id"))
    batch_id: Mapped[int] = mapped_column(ForeignKey("batches.id"))
    ticket: Mapped[str]
    amount: Mapped[int]
    note: Mapped[Optional[str]]
    created_at: Mapped[str] = mapped_column(default=lambda: datetime.now(UTC).isoformat())

    draw: Mapped[Draw] = relationship(back_populates="sales")
    agent: Mapped[Agent] = relationship(back_populates="sales")
    batch: Mapped[Batch] = relationship(back_populates="sales")


# ---------------------------------------------------------------------------
# 6. Offloaded
# ---------------------------------------------------------------------------
class Offloaded(Base):
    __tablename__ = "offloaded"
    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_offloaded_amount_positive"),
        Index("idx_offloaded_draw_id", "draw_id"),
        Index("idx_offloaded_dealer", "master_dealer_id"),
        Index("idx_offloaded_ticket", "draw_id", "ticket"),
        Index("idx_offloaded_draw_dealer", "draw_id", "master_dealer_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    draw_id: Mapped[int] = mapped_column(ForeignKey("draws.id"))
    master_dealer_id: Mapped[str] = mapped_column(ForeignKey("master_dealers.id"))
    page_no: Mapped[int]
    ticket: Mapped[str]
    amount: Mapped[int]
    note: Mapped[Optional[str]]
    created_at: Mapped[str] = mapped_column(default=lambda: datetime.now(UTC).isoformat())

    draw: Mapped[Draw] = relationship(back_populates="offloaded_entries")
    master_dealer: Mapped[MasterDealer] = relationship(back_populates="offloaded_entries")


# ---------------------------------------------------------------------------
# 7. Blacklist Ticket
# ---------------------------------------------------------------------------
class BlacklistTicket(Base):
    __tablename__ = "blacklist_tickets"
    __table_args__ = (
        CheckConstraint("type IN ('HALF', 'BLOCK')", name="ck_blacklist_type"),
        UniqueConstraint("draw_id", "ticket", "type", name="uq_blacklist_draw_ticket_type"),
        Index("idx_blacklist_draw_id", "draw_id"),
        Index("idx_blacklist_ticket", "draw_id", "ticket"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    draw_id: Mapped[int] = mapped_column(ForeignKey("draws.id"))
    ticket: Mapped[str]
    type: Mapped[str]
    created_at: Mapped[str] = mapped_column(default=lambda: datetime.now(UTC).isoformat())

    draw: Mapped[Draw] = relationship(back_populates="blacklist_tickets")


# ---------------------------------------------------------------------------
# 8. Winning Ticket
# ---------------------------------------------------------------------------
class WinningTicket(Base):
    __tablename__ = "winning_tickets"
    __table_args__ = (
        CheckConstraint("type IN ('Jackpot', 'Minor')", name="ck_winning_type"),
        UniqueConstraint("draw_id", "ticket", "type", name="uq_winning_draw_ticket_type"),
        Index("idx_winning_draw_id", "draw_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    draw_id: Mapped[int] = mapped_column(ForeignKey("draws.id"))
    ticket: Mapped[str]
    type: Mapped[str]
    created_at: Mapped[str] = mapped_column(default=lambda: datetime.now(UTC).isoformat())

    draw: Mapped[Draw] = relationship(back_populates="winning_tickets")


# ---------------------------------------------------------------------------
# 9. Preference — key-value store for settings (theme, etc.)
# ---------------------------------------------------------------------------
class Preference(Base):
    __tablename__ = "preferences"

    key: Mapped[str] = mapped_column(primary_key=True)
    value: Mapped[str]
