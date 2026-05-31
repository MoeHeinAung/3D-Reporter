"""Sales recording with validation and blacklist checks."""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy.orm import Session

from backend.database.models import Batch, Sale
from backend.errors import ConflictError, NotFoundError, ValidationError
from backend.repositories.agent_repository import AgentRepository
from backend.repositories.batch_repository import BatchRepository
from backend.repositories.blacklist_repository import BlacklistRepository
from backend.repositories.draw_repository import DrawRepository
from backend.repositories.sale_repository import SaleRepository


class SalesService:
    """Records sales with business rule validation."""

    def __init__(self, session: Session) -> None:
        self.session = session
        self._draw_repo = DrawRepository(session)
        self._sale_repo = SaleRepository(session)
        self._batch_repo = BatchRepository(session)
        self._blacklist_repo = BlacklistRepository(session)
        self._agent_repo = AgentRepository(session)

    def record_sale(
        self, batch_id: int, ticket: str, amount: int
    ) -> Sale:
        """Record a sale after validating all business rules.

        The draw and agent are derived from the batch. The batch must belong
        to an OPEN draw. BLOCK-listed tickets are rejected.
        """
        batch = self._batch_repo.get_by_id(batch_id)
        if batch is None:
            raise NotFoundError(f"Batch {batch_id} not found.")

        draw = self._draw_repo.get_by_id(batch.draw_id)
        if draw is None:
            raise NotFoundError(f"Draw {batch.draw_id} not found.")
        if draw.status != "OPEN":
            raise ConflictError("Sales are only allowed when the draw is OPEN.")

        if self._blacklist_repo.is_blocked(batch.draw_id, ticket):
            raise ConflictError(
                f"Ticket {ticket} is BLOCK-listed for draw {batch.draw_id}. "
                "Sale amount must be offloaded to a master dealer instead."
            )

        if not (ticket.isdigit() and len(ticket) == 3):
            raise ValidationError(f"Ticket must be exactly 3 numeric digits, got {ticket!r}.")

        if amount < 0:
            raise ValidationError(f"Sale amount must be non-negative, got {amount}.")

        sale = self._sale_repo.create(
            batch_id=batch_id,
            ticket=ticket,
            amount=amount,
            created_at=datetime.now(UTC),
        )
        return sale

    def get_sales_by_draw(self, draw_id: int) -> list[Sale]:
        """Return all sales for a draw (via batch join), newest first."""
        return self._sale_repo.get_by_draw(draw_id)

    def get_or_create_batch(self, draw_id: int, agent_id: str) -> Batch:
        """Return the existing batch for a draw+agent, or create one.

        The batch_no is auto-generated as the next sequential number for this draw.
        """
        batch = self._batch_repo.get_by_draw_and_agent(draw_id, agent_id)
        if batch is not None:
            return batch

        draw = self._draw_repo.get_by_id(draw_id)
        if draw is None:
            raise NotFoundError(f"Draw {draw_id} not found.")
        if draw.status != "OPEN":
            raise ConflictError("Cannot create batch: draw is not OPEN.")

        agent = self._agent_repo.get_by_id(agent_id)
        if agent is None:
            raise NotFoundError(f"Agent {agent_id} not found.")

        # Auto-generate batch_no as sequential number for this draw
        existing_batches = self._batch_repo.get_by_draw(draw_id)
        next_no = len(existing_batches) + 1
        batch_no = str(next_no)

        return self._batch_repo.create(
            draw_id=draw_id,
            agent_id=agent_id,
            batch_no=batch_no,
            total_amount=0,
            ticket_count=0,
            created_at=datetime.now(UTC),
        )
