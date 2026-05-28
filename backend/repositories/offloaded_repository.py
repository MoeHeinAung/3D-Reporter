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
