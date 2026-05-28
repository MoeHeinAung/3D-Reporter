"""Winning ticket management."""

from __future__ import annotations

from sqlalchemy.orm import Session

from backend.database.models import WinningTicket
from backend.errors import NotFoundError, ValidationError
from backend.repositories.winning_repository import WinningRepository


class WinningService:
    """Manages winning tickets (Jackpot / Minor)."""

    VALID_TYPES = {"Jackpot", "Minor"}

    def __init__(self, session: Session) -> None:
        self.session = session
        self._repo = WinningRepository(session)

    def create(self, draw_id: int, ticket: str, ticket_type: str) -> WinningTicket:
        if ticket_type not in self.VALID_TYPES:
            raise ValidationError(
                f"Invalid winning type: {ticket_type}. Must be Jackpot or Minor."
            )
        return self._repo.create(draw_id=draw_id, ticket=ticket, type=ticket_type)

    def get_by_draw(self, draw_id: int) -> list[WinningTicket]:
        return list(
            self.session.query(WinningTicket)
            .filter(WinningTicket.draw_id == draw_id)
            .all()
        )

    def delete(self, ticket_id: int) -> None:
        ticket = self._repo.get_by_id(ticket_id)
        if ticket is None:
            raise NotFoundError(f"Winning ticket {ticket_id} not found.")
        self._repo.delete(ticket)
