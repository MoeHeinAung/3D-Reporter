"""Data access for Draw entities with domain-specific queries."""

from __future__ import annotations

from sqlalchemy.orm import Session

from backend.database.models import Draw
from backend.repositories.base import BaseRepository


class DrawRepository(BaseRepository[Draw]):
    def __init__(self, session: Session) -> None:
        super().__init__(session, Draw)

    def get_open_draw(self) -> Draw | None:
        """Return the currently OPEN draw, or None if no draw is open."""
        return self.session.query(Draw).filter(Draw.status == "OPEN").first()

    def get_by_status(self, status: str) -> list[Draw]:
        """Return all draws with the given status."""
        return list(self.session.query(Draw).filter(Draw.status == status).all())
