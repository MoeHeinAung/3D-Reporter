"""Data access for Offloaded entities."""

from __future__ import annotations

from sqlalchemy.orm import Session

from backend.database.models import Offloaded
from backend.repositories.base import BaseRepository


class OffloadedRepository(BaseRepository[Offloaded]):
    def __init__(self, session: Session) -> None:
        super().__init__(session, Offloaded)

    def get_by_draw(self, draw_id: int) -> list[Offloaded]:
        return list(
            self.session.query(Offloaded).filter(Offloaded.draw_id == draw_id).all()
        )

    def get_by_dealer(self, master_dealer_id: str) -> list[Offloaded]:
        return list(
            self.session.query(Offloaded).filter(
                Offloaded.master_dealer_id == master_dealer_id
            ).all()
        )

    def get_ticket_totals(self, draw_id: int) -> list[tuple[str, int]]:
        """Return (ticket, total_offloaded) pairs for a draw, grouped by ticket."""
        from sqlalchemy import func

        rows = (
            self.session.query(Offloaded.ticket, func.sum(Offloaded.amount))
            .filter(Offloaded.draw_id == draw_id)
            .group_by(Offloaded.ticket)
            .all()
        )
        return [(str(row[0]), int(row[1])) for row in rows]

    def get_offloads_grouped_by_dealer(self, draw_id: int) -> list[tuple[str, int]]:
        """Return (master_dealer_id, total_amount) pairs for a draw, grouped by dealer."""
        from sqlalchemy import func

        rows = (
            self.session.query(Offloaded.master_dealer_id, func.sum(Offloaded.amount))
            .filter(Offloaded.draw_id == draw_id)
            .group_by(Offloaded.master_dealer_id)
            .all()
        )
        return [(str(row[0]), int(row[1])) for row in rows]
