"""Data access for BlacklistTicket entities."""

from __future__ import annotations

from sqlalchemy.orm import Session

from backend.database.models import BlacklistTicket
from backend.repositories.base import BaseRepository


class BlacklistRepository(BaseRepository[BlacklistTicket]):
    def __init__(self, session: Session) -> None:
        super().__init__(session, BlacklistTicket)

    def get_by_draw(self, draw_id: int) -> list[BlacklistTicket]:
        return list(
            self.session.query(BlacklistTicket)
            .filter(BlacklistTicket.draw_id == draw_id)
            .all()
        )

    def is_blocked(self, draw_id: int, ticket: str) -> bool:
        """Return True if the ticket is BLOCK-listed for the given draw."""
        return self.session.query(BlacklistTicket).filter(
            BlacklistTicket.draw_id == draw_id,
            BlacklistTicket.ticket == ticket,
            BlacklistTicket.restriction_type == "BLOCK",
        ).first() is not None

    def is_half(self, draw_id: int, ticket: str) -> bool:
        """Return True if the ticket is HALF-listed for the given draw."""
        return self.session.query(BlacklistTicket).filter(
            BlacklistTicket.draw_id == draw_id,
            BlacklistTicket.ticket == ticket,
            BlacklistTicket.restriction_type == "HALF",
        ).first() is not None
