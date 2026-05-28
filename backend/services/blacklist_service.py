"""Blacklist ticket management."""

from __future__ import annotations

from sqlalchemy.orm import Session

from backend.database.models import BlacklistTicket
from backend.errors import NotFoundError, ValidationError
from backend.repositories.blacklist_repository import BlacklistRepository


class BlacklistService:
    """Manages blacklist tickets (HALF / BLOCK)."""

    VALID_TYPES = {"HALF", "BLOCK"}

    def __init__(self, session: Session) -> None:
        self.session = session
        self._repo = BlacklistRepository(session)

    def create(self, draw_id: int, ticket: str, ticket_type: str) -> BlacklistTicket:
        if ticket_type not in self.VALID_TYPES:
            raise ValidationError(
                f"Invalid blacklist type: {ticket_type}. Must be HALF or BLOCK."
            )
        return self._repo.create(draw_id=draw_id, ticket=ticket, type=ticket_type)

    def get_by_draw(self, draw_id: int) -> list[BlacklistTicket]:
        return list(
            self.session.query(BlacklistTicket)
            .filter(BlacklistTicket.draw_id == draw_id)
            .all()
        )

    def delete(self, ticket_id: int) -> None:
        ticket = self._repo.get_by_id(ticket_id)
        if ticket is None:
            raise NotFoundError(f"Blacklist ticket {ticket_id} not found.")
        self._repo.delete(ticket)
