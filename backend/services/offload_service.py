"""Offload management with risk assessment, partitioning, and batch recording."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import NamedTuple

from sqlalchemy.orm import Session

from backend.database.models import Offloaded
from backend.errors import ConflictError, NotFoundError, ValidationError
from backend.repositories.blacklist_repository import BlacklistRepository
from backend.repositories.draw_repository import DrawRepository
from backend.repositories.master_dealer_repository import MasterDealerRepository
from backend.repositories.offloaded_repository import OffloadedRepository
from backend.repositories.sale_repository import SaleRepository


class TicketRisk(NamedTuple):
    ticket: str
    total_sales: int
    holding: int
    offloaded: int
    pending: int
    is_blocked: bool
    risk_level: str


class RiskBreakdown(NamedTuple):
    holding: list[TicketRisk]
    offloaded: list[TicketRisk]
    pending: list[TicketRisk]


class OffloadService:
    """Manages offload operations with risk partitioning logic."""

    def __init__(self, session: Session) -> None:
        self.session = session
        self._draw_repo = DrawRepository(session)
        self._offloaded_repo = OffloadedRepository(session)
        self._blacklist_repo = BlacklistRepository(session)
        self._sale_repo = SaleRepository(session)
        self._dealer_repo = MasterDealerRepository(session)

    # ------------------------------------------------------------------
    # Risk Breakdown
    # ------------------------------------------------------------------

    def get_risk_breakdown(
        self, draw_id: int, admin_hold: int, max_offload_ticket: int
    ) -> RiskBreakdown:
        """Partition every ticket into Holding, Offloaded, or Pending buckets.

        Per-ticket formulas (from CalculationWorkflow.md):
          effective_hold = 0 if BLOCK-listed else admin_hold
          holding  = min(total_sales, effective_hold)
          pending  = max(total_sales - effective_hold - already_offloaded, 0)
        """
        draw = self._draw_repo.get_by_id(draw_id)
        if draw is None:
            raise NotFoundError(f"Draw {draw_id} not found.")

        sales_totals = dict(self._sale_repo.get_ticket_totals(draw_id))
        offload_totals = dict(self._offloaded_repo.get_ticket_totals(draw_id))
        blocked_tickets = {
            t.ticket for t in self._blacklist_repo.get_by_draw(draw_id)
            if t.restriction_type == "BLOCK"
        }

        all_tickets: list[TicketRisk] = []
        for ticket, total_sales in sales_totals.items():
            effective_hold = 0 if ticket in blocked_tickets else admin_hold
            already_offloaded = offload_totals.get(ticket, 0)
            holding = min(total_sales, effective_hold)
            pending = max(total_sales - effective_hold - already_offloaded, 0)

            # Risk level classification
            if pending >= 100000:
                risk_level = "CRITICAL"
            elif pending >= 50000:
                risk_level = "HIGH"
            elif pending >= 10000:
                risk_level = "MEDIUM"
            else:
                risk_level = "LOW"

            all_tickets.append(TicketRisk(
                ticket=ticket,
                total_sales=total_sales,
                holding=holding,
                offloaded=already_offloaded,
                pending=pending,
                is_blocked=ticket in blocked_tickets,
                risk_level=risk_level,
            ))

        holding_list = [t for t in all_tickets if t.pending == 0 and t.offloaded == 0]
        offloaded_list = [t for t in all_tickets if t.offloaded > 0]
        pending_list = [t for t in all_tickets if t.pending > 0]

        pending_list.sort(key=lambda t: t.pending, reverse=True)
        pending_list = pending_list[:max_offload_ticket]

        return RiskBreakdown(
            holding=holding_list,
            offloaded=offloaded_list,
            pending=pending_list,
        )

    # ------------------------------------------------------------------
    # Create Offload
    # ------------------------------------------------------------------

    def create_offload(
        self,
        draw_id: int,
        master_dealer_id: str,
        entries: list[dict],
        page_no: str | None = None,
        admin_hold: int = 0,
        notes: str | None = None,
    ) -> list[Offloaded]:
        """Record a batch offload after validating all business rules."""
        dealer = self._dealer_repo.get_by_id(master_dealer_id)
        if dealer is None:
            raise NotFoundError(f"Master Dealer {master_dealer_id} not found.")

        draw = self._draw_repo.get_by_id(draw_id)
        if draw is None:
            raise NotFoundError(f"Draw {draw_id} not found.")
        if draw.status != "OPEN":
            raise ConflictError("Offloads are only allowed when the draw is OPEN.")

        if not entries:
            raise ValidationError("At least one offload entry is required.")

        sales_totals = dict(self._sale_repo.get_ticket_totals(draw_id))
        offload_totals = dict(self._offloaded_repo.get_ticket_totals(draw_id))
        blocked_tickets = {
            t.ticket for t in self._blacklist_repo.get_by_draw(draw_id)
            if t.restriction_type == "BLOCK"
        }

        created: list[Offloaded] = []
        for entry in entries:
            ticket = str(entry["ticket"])
            amount = int(entry["amount"])

            if not (ticket.isdigit() and len(ticket) == 3):
                raise ValidationError(f"Ticket must be exactly 3 numeric digits, got {ticket!r}.")

            if amount <= 0:
                raise ValidationError(f"Offload amount must be positive, got {amount}.")

            is_blocked = ticket in blocked_tickets
            effective_hold = 0 if is_blocked else admin_hold
            sales_total = sales_totals.get(ticket, 0)
            already_offloaded = offload_totals.get(ticket, 0)
            pending = max(sales_total - effective_hold - already_offloaded, 0)

            if amount > pending:
                raise ValidationError(
                    f"Offload amount {amount} for ticket {ticket} exceeds pending "
                    f"liability of {pending}."
                )

            record = self._offloaded_repo.create(
                draw_id=draw_id,
                master_dealer_id=master_dealer_id,
                ticket=ticket,
                amount=amount,
                page_no=page_no,
                notes=notes,
                created_at=datetime.now(UTC),
            )
            created.append(record)

            # Track in-memory for subsequent entries in this batch
            offload_totals[ticket] = already_offloaded + amount

        return created

    # ------------------------------------------------------------------
    # History
    # ------------------------------------------------------------------

    def get_offload_history(self, draw_id: int) -> list[Offloaded]:
        """Return all offloads for a draw, newest first."""
        return list(
            sorted(
                self._offloaded_repo.get_by_draw(draw_id),
                key=lambda o: o.id,
                reverse=True,
            )
        )

    def get_offloads_by_dealer(self, master_dealer_id: str) -> list[Offloaded]:
        """Return all offloads for a master dealer."""
        return self._offloaded_repo.get_by_dealer(master_dealer_id)
