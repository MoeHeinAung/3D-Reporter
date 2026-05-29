"""Data access for Sale entities."""

from __future__ import annotations

from sqlalchemy.orm import Session

from backend.database.models import Sale
from backend.repositories.base import BaseRepository


class SaleRepository(BaseRepository[Sale]):
    def __init__(self, session: Session) -> None:
        super().__init__(session, Sale)

    def get_by_batch(self, batch_id: int) -> list[Sale]:
        return list(self.session.query(Sale).filter(Sale.batch_id == batch_id).all())

    def get_by_ticket(self, draw_id: int, ticket: str) -> list[Sale]:
        return list(
            self.session.query(Sale).filter(
                Sale.draw_id == draw_id, Sale.ticket == ticket
            ).all()
        )

    def get_by_draw(self, draw_id: int) -> list[Sale]:
        return list(
            self.session.query(Sale)
            .filter(Sale.draw_id == draw_id)
            .order_by(Sale.id.desc())
            .all()
        )

    def get_ticket_totals(self, draw_id: int) -> list[tuple[str, int]]:
        """Return (ticket, total_amount) pairs for a draw, grouped by ticket."""
        from sqlalchemy import func

        rows = (
            self.session.query(Sale.ticket, func.sum(Sale.amount))
            .filter(Sale.draw_id == draw_id)
            .group_by(Sale.ticket)
            .all()
        )
        return [(str(row[0]), int(row[1])) for row in rows]

    def get_sales_grouped_by_agent(self, draw_id: int) -> list[tuple[str, int]]:
        """Return (agent_id, total_amount) pairs for a draw, grouped by agent."""
        from sqlalchemy import func

        rows = (
            self.session.query(Sale.agent_id, func.sum(Sale.amount))
            .filter(Sale.draw_id == draw_id)
            .group_by(Sale.agent_id)
            .all()
        )
        return [(str(row[0]), int(row[1])) for row in rows]

    def get_by_ticket_grouped_by_agent(self, draw_id: int, ticket: str) -> list[tuple[str, int]]:
        """Return (agent_id, total_amount) for a specific ticket in a draw, grouped by agent."""
        from sqlalchemy import func

        rows = (
            self.session.query(Sale.agent_id, func.sum(Sale.amount))
            .filter(Sale.draw_id == draw_id, Sale.ticket == ticket)
            .group_by(Sale.agent_id)
            .all()
        )
        return [(str(row[0]), int(row[1])) for row in rows]
