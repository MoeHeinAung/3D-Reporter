"""
SQLAlchemy 2.0 ORM models — exact match of TestingDatabase schema.

Business rules (single open draw, status transitions, BLOCK blacklist,
batch total sync) are enforced at the service layer.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import CheckConstraint, ForeignKey, Index, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# 1. Draw
# ---------------------------------------------------------------------------
class Draw(Base):
    __tablename__ = "draws"
    __table_args__ = (
        CheckConstraint("status IN ('OPEN','CLOSED','SETTLED')", name="ck_draws_status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    draw_name: Mapped[str]
    house_holding_amount: Mapped[int]
    status: Mapped[str] = mapped_column(default="OPEN")
    opened_at: Mapped[Optional[datetime]]
    closed_at: Mapped[Optional[datetime]]
    settled_at: Mapped[Optional[datetime]]
    notes: Mapped[Optional[str]]

    batches: Mapped[list["Batch"]] = relationship(back_populates="draw")
    offloaded_entries: Mapped[list["Offloaded"]] = relationship(back_populates="draw")
    blacklist_tickets: Mapped[list["BlacklistTicket"]] = relationship(back_populates="draw")
    winning_tickets: Mapped[list["WinningTicket"]] = relationship(back_populates="draw")


# ---------------------------------------------------------------------------
# 2. Agent
# ---------------------------------------------------------------------------
class Agent(Base):
    __tablename__ = "agents"

    id: Mapped[str] = mapped_column(primary_key=True)
    name: Mapped[str]
    commission_rate: Mapped[float]
    jp_factor: Mapped[float]
    sp_factor: Mapped[float]
    active: Mapped[int] = mapped_column(default=1)
    created_at: Mapped[Optional[datetime]]

    batches: Mapped[list["Batch"]] = relationship(back_populates="agent")


# ---------------------------------------------------------------------------
# 3. Master Dealer
# ---------------------------------------------------------------------------
class MasterDealer(Base):
    __tablename__ = "master_dealers"

    id: Mapped[str] = mapped_column(primary_key=True)
    name: Mapped[str]
    commission_rate: Mapped[float]
    jp_factor: Mapped[float]
    sp_factor: Mapped[float]
    active: Mapped[int] = mapped_column(default=1)
    created_at: Mapped[Optional[datetime]]

    offloaded_entries: Mapped[list["Offloaded"]] = relationship(back_populates="master_dealer")


# ---------------------------------------------------------------------------
# 4. Blacklist Ticket
# ---------------------------------------------------------------------------
class BlacklistTicket(Base):
    __tablename__ = "blacklist_tickets"
    __table_args__ = (
        CheckConstraint("length(ticket)=3", name="ck_blacklist_ticket_length"),
        CheckConstraint("restriction_type IN ('HALF','BLOCK')", name="ck_blacklist_restriction_type"),
        UniqueConstraint("draw_id", "ticket", name="uq_blacklist_draw_ticket"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    draw_id: Mapped[int] = mapped_column(ForeignKey("draws.id"))
    ticket: Mapped[str]
    restriction_type: Mapped[str]

    draw: Mapped["Draw"] = relationship(back_populates="blacklist_tickets")


# ---------------------------------------------------------------------------
# 5. Batch
# ---------------------------------------------------------------------------
class Batch(Base):
    __tablename__ = "batches"
    __table_args__ = (
        UniqueConstraint("draw_id", "batch_no", name="uq_batch_draw_batch_no"),
        Index("idx_batches_draw", "draw_id"),
        Index("idx_batches_agent", "agent_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    draw_id: Mapped[int] = mapped_column(ForeignKey("draws.id"))
    agent_id: Mapped[str] = mapped_column(ForeignKey("agents.id"))
    batch_no: Mapped[str]
    total_amount: Mapped[int] = mapped_column(default=0)
    ticket_count: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[Optional[datetime]]
    closed_at: Mapped[Optional[datetime]]
    remarks: Mapped[Optional[str]]

    draw: Mapped["Draw"] = relationship(back_populates="batches")
    agent: Mapped["Agent"] = relationship(back_populates="batches")
    sales: Mapped[list["Sale"]] = relationship(back_populates="batch")


# ---------------------------------------------------------------------------
# 6. Sale
# ---------------------------------------------------------------------------
class Sale(Base):
    __tablename__ = "sales"
    __table_args__ = (
        CheckConstraint("length(ticket)=3", name="ck_sales_ticket_length"),
        CheckConstraint("amount >= 0", name="ck_sales_amount_nonnegative"),
        UniqueConstraint("batch_id", "ticket", name="uq_sale_batch_ticket"),
        Index("idx_sales_batch", "batch_id"),
        Index("idx_sales_ticket", "ticket"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    batch_id: Mapped[int] = mapped_column(ForeignKey("batches.id"))
    ticket: Mapped[str]
    amount: Mapped[int]
    created_at: Mapped[Optional[datetime]]

    batch: Mapped["Batch"] = relationship(back_populates="sales")


# ---------------------------------------------------------------------------
# 7. Offloaded
# ---------------------------------------------------------------------------
class Offloaded(Base):
    __tablename__ = "offloaded"
    __table_args__ = (
        CheckConstraint("length(ticket)=3", name="ck_offloaded_ticket_length"),
        CheckConstraint("amount > 0", name="ck_offloaded_amount_positive"),
        Index("idx_offloaded_draw_ticket", "draw_id", "ticket"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    draw_id: Mapped[int] = mapped_column(ForeignKey("draws.id"))
    master_dealer_id: Mapped[str] = mapped_column(ForeignKey("master_dealers.id"))
    ticket: Mapped[str]
    amount: Mapped[int]
    page_no: Mapped[Optional[str]]
    created_at: Mapped[Optional[datetime]]
    notes: Mapped[Optional[str]]

    draw: Mapped["Draw"] = relationship(back_populates="offloaded_entries")
    master_dealer: Mapped["MasterDealer"] = relationship(back_populates="offloaded_entries")


# ---------------------------------------------------------------------------
# 8. Winning Ticket
# ---------------------------------------------------------------------------
class WinningTicket(Base):
    __tablename__ = "winning_tickets"
    __table_args__ = (
        CheckConstraint("length(ticket)=3", name="ck_winning_ticket_length"),
        CheckConstraint("prize_type IN ('JACKPOT','MINOR')", name="ck_winning_prize_type"),
        UniqueConstraint("draw_id", "ticket", name="uq_winning_draw_ticket"),
        Index("idx_winners_draw", "draw_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    draw_id: Mapped[int] = mapped_column(ForeignKey("draws.id"))
    ticket: Mapped[str]
    prize_type: Mapped[str]

    draw: Mapped["Draw"] = relationship(back_populates="winning_tickets")


# ---------------------------------------------------------------------------
# 9. Draw Ticket Snapshot
# ---------------------------------------------------------------------------
class DrawTicketSnapshot(Base):
    __tablename__ = "draw_ticket_snapshot"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    draw_id: Mapped[int] = mapped_column(ForeignKey("draws.id"))
    ticket: Mapped[str]
    total_sold: Mapped[int]
    admin_hold: Mapped[int]
    total_offloaded: Mapped[int]
    pending: Mapped[int]
    restriction_type: Mapped[Optional[str]]
    created_at: Mapped[Optional[datetime]]


# ---------------------------------------------------------------------------
# 10. Settlement — Agent
# ---------------------------------------------------------------------------
class DrawSettlementAgent(Base):
    __tablename__ = "draw_settlement_agent"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    draw_id: Mapped[int] = mapped_column(ForeignKey("draws.id"))
    agent_id: Mapped[str] = mapped_column(ForeignKey("agents.id"))
    commission_rate_used: Mapped[float]
    jp_factor_used: Mapped[float]
    sp_factor_used: Mapped[float]
    total_sales: Mapped[int]
    commission_amount: Mapped[int]
    net_collection: Mapped[int]
    winning_settlement: Mapped[int]
    final_balance: Mapped[int]


# ---------------------------------------------------------------------------
# 11. Settlement — Master Dealer
# ---------------------------------------------------------------------------
class DrawSettlementMaster(Base):
    __tablename__ = "draw_settlement_master"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    draw_id: Mapped[int] = mapped_column(ForeignKey("draws.id"))
    master_dealer_id: Mapped[str] = mapped_column(ForeignKey("master_dealers.id"))
    commission_rate_used: Mapped[float]
    jp_factor_used: Mapped[float]
    sp_factor_used: Mapped[float]
    total_offloaded: Mapped[int]
    commission_amount: Mapped[int]
    net_received: Mapped[int]
    winning_liability: Mapped[int]
    profit_loss: Mapped[int]


# ---------------------------------------------------------------------------
# 12. Settlement — Per Ticket
# ---------------------------------------------------------------------------
class DrawSettlementTicket(Base):
    __tablename__ = "draw_settlement_ticket"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    draw_id: Mapped[int] = mapped_column(ForeignKey("draws.id"))
    ticket: Mapped[str]
    prize_type: Mapped[Optional[str]]
    total_sold: Mapped[int]
    admin_hold: Mapped[int]
    offloaded: Mapped[int]
    pending: Mapped[int]
    admin_agent_settlement: Mapped[int]
    master_recovery: Mapped[int]
    admin_profit_loss: Mapped[int]


# ---------------------------------------------------------------------------
# 13. Settlement — Draw Summary
# ---------------------------------------------------------------------------
class DrawSettlementSummary(Base):
    __tablename__ = "draw_settlement_summary"

    draw_id: Mapped[int] = mapped_column(primary_key=True)
    total_sales: Mapped[int]
    total_agent_commission: Mapped[int]
    total_agent_settlement: Mapped[int]
    total_master_commission: Mapped[int]
    total_master_recovery: Mapped[int]
    admin_net_profit: Mapped[int]
    settled_at: Mapped[datetime]


# ---------------------------------------------------------------------------
# 14. Preference — key-value store for settings (theme, etc.)
# ---------------------------------------------------------------------------
class Preference(Base):
    __tablename__ = "preferences"

    key: Mapped[str] = mapped_column(primary_key=True)
    value: Mapped[str]
