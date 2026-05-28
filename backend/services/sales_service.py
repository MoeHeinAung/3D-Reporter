"""Sales recording with validation, blacklist checks, and offloading rules."""

from __future__ import annotations

from datetime import datetime
from typing import NamedTuple

from sqlalchemy.orm import Session

from backend.database.models import Batch, Sale
from backend.errors import ConflictError, NotFoundError, ValidationError
from backend.repositories.batch_repository import BatchRepository
from backend.repositories.blacklist_repository import BlacklistRepository
from backend.repositories.draw_repository import DrawRepository
from backend.repositories.sale_repository import SaleRepository


class SaleValidationResult(NamedTuple):
    is_valid: bool
    error: str


class SalesService:
    """Records sales with business rule validation."""

    def __init__(self, session: Session) -> None:
        self.session = session
        self._draw_repo = DrawRepository(session)
        self._sale_repo = SaleRepository(session)
        self._batch_repo = BatchRepository(session)
        self._blacklist_repo = BlacklistRepository(session)

    def record_sale(
        self, draw_id: int, agent_id: str, batch_id: int, ticket: str, amount: int, note: str | None = None
    ) -> Sale:
        """Record a sale after validating all business rules."""
        # Validate draw is OPEN and cutoff not passed
        draw = self._draw_repo.get_by_id(draw_id)
        if draw is None:
            raise NotFoundError(f"Draw {draw_id} not found.")
        if draw.status != "OPEN":
            raise ConflictError("Sales are only allowed when the draw is OPEN.")
        if datetime.utcnow().isoformat() > draw.cutoff_time:
            raise ConflictError("Sales are closed: cutoff time has passed.")

        # Validate batch belongs to same draw and agent
        batch = self._batch_repo.get_by_id(batch_id)
        if batch is None:
            raise NotFoundError(f"Batch {batch_id} not found.")
        if batch.draw_id != draw_id or batch.agent_id != agent_id:
            raise ValidationError(
                f"Batch {batch_id} does not match draw {draw_id} and agent {agent_id!r}."
            )

        # Check BLOCK blacklist
        if self._blacklist_repo.is_blocked(draw_id, ticket):
            raise ConflictError(
                f"Ticket {ticket} is BLOCK-listed for draw {draw_id}. "
                "Sale amount must be offloaded to a master dealer instead."
            )

        # Validate ticket format (1-3 digit numeric)
        if not (ticket.isdigit() and 1 <= len(ticket) <= 3):
            raise ValidationError(f"Ticket must be 1-3 numeric digits, got {ticket!r}.")

        if amount <= 0:
            raise ValidationError(f"Sale amount must be positive, got {amount}.")

        sale = self._sale_repo.create(
            draw_id=draw_id,
            agent_id=agent_id,
            batch_id=batch_id,
            ticket=ticket,
            amount=amount,
            note=note,
        )

        # Recalculate batch total
        self._recalc_batch_total(batch_id)

        return sale

    def get_sales_by_draw(self, draw_id: int) -> list[Sale]:
        """Return all sales for a draw, newest first."""
        return self._sale_repo.get_by_draw(draw_id)

    def get_or_create_batch(self, draw_id: int, agent_id: str) -> Batch:
        """Return the existing batch for a draw+agent, or create one.

        Raises NotFoundError if the draw or agent does not exist.
        """
        batch = self._batch_repo.get_by_draw_and_agent(draw_id, agent_id)
        if batch is not None:
            return batch
        draw = self._draw_repo.get_by_id(draw_id)
        if draw is None:
            raise NotFoundError(f"Draw {draw_id} not found.")
        return self._batch_repo.create(draw_id=draw_id, agent_id=agent_id, total_amount=0)

    def _recalc_batch_total(self, batch_id: int) -> None:
        from sqlalchemy import func

        total = (
            self.session.query(func.coalesce(func.sum(Sale.amount), 0))
            .filter(Sale.batch_id == batch_id)
            .scalar()
        )
        batch = self._batch_repo.get_by_id(batch_id)
        if batch:
            self._batch_repo.update(batch, total_amount=total)
