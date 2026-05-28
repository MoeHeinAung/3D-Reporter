"""Data access for WinningTicket entities."""

from __future__ import annotations

from sqlalchemy.orm import Session

from backend.database.models import WinningTicket
from backend.repositories.base import BaseRepository


class WinningRepository(BaseRepository[WinningTicket]):
    def __init__(self, session: Session) -> None:
        super().__init__(session, WinningTicket)

    def get_by_draw(self, draw_id: int) -> list[WinningTicket]:
        return list(
            self.session.query(WinningTicket).filter(
                WinningTicket.draw_id == draw_id
            ).all()
        )
