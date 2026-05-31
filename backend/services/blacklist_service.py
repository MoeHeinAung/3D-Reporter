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

    def create(self, draw_id: int, ticket: str, restriction_type: str) -> BlacklistTicket:
        if not (ticket.isdigit() and len(ticket) == 3):
            raise ValidationError(
                f"Ticket must be exactly 3 numeric digits, got {ticket!r}."
            )
        if restriction_type not in self.VALID_TYPES:
            raise ValidationError(
                f"Invalid blacklist restriction type: {restriction_type}. Must be HALF or BLOCK."
            )
        return self._repo.create(
            draw_id=draw_id, ticket=ticket, restriction_type=restriction_type
        )

    def get_by_draw(self, draw_id: int) -> list[BlacklistTicket]:
        return self._repo.get_by_draw(draw_id)

    def delete(self, ticket_id: int) -> None:
        ticket = self._repo.get_by_id(ticket_id)
        if ticket is None:
            raise NotFoundError(f"Blacklist ticket {ticket_id} not found.")
        self._repo.delete(ticket)
