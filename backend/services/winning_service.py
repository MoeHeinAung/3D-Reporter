"""Winning ticket management."""

from __future__ import annotations

from sqlalchemy.orm import Session

from backend.database.models import WinningTicket
from backend.errors import NotFoundError, ValidationError
from backend.repositories.winning_repository import WinningRepository


class WinningService:
    """Manages winning tickets (JACKPOT / MINOR)."""

    VALID_TYPES = {"JACKPOT", "MINOR"}

    def __init__(self, session: Session) -> None:
        self.session = session
        self._repo = WinningRepository(session)

    def create(self, draw_id: int, ticket: str, prize_type: str) -> WinningTicket:
        if not (ticket.isdigit() and len(ticket) == 3):
            raise ValidationError(
                f"Ticket must be exactly 3 numeric digits, got {ticket!r}."
            )
        if prize_type not in self.VALID_TYPES:
            raise ValidationError(
                f"Invalid prize type: {prize_type}. Must be JACKPOT or MINOR."
            )
        return self._repo.create(
            draw_id=draw_id, ticket=ticket, prize_type=prize_type
        )

    def get_by_draw(self, draw_id: int) -> list[WinningTicket]:
        return self._repo.get_by_draw(draw_id)

    def delete(self, ticket_id: int) -> None:
        ticket = self._repo.get_by_id(ticket_id)
        if ticket is None:
            raise NotFoundError(f"Winning ticket {ticket_id} not found.")
        self._repo.delete(ticket)
