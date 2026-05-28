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
