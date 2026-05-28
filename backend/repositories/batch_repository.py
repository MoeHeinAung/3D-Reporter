"""Data access for Batch entities."""

from __future__ import annotations

from sqlalchemy.orm import Session

from backend.database.models import Batch
from backend.repositories.base import BaseRepository


class BatchRepository(BaseRepository[Batch]):
    def __init__(self, session: Session) -> None:
        super().__init__(session, Batch)

    def get_by_draw(self, draw_id: int) -> list[Batch]:
        return list(self.session.query(Batch).filter(Batch.draw_id == draw_id).all())

    def get_by_draw_and_agent(self, draw_id: int, agent_id: str) -> Batch | None:
        return (
            self.session.query(Batch)
            .filter(Batch.draw_id == draw_id, Batch.agent_id == agent_id)
            .first()
        )
