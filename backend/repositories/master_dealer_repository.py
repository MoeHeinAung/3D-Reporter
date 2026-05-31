"""Data access for MasterDealer entities."""

from __future__ import annotations

from sqlalchemy.orm import Session

from backend.database.models import MasterDealer
from backend.repositories.base import BaseRepository


class MasterDealerRepository(BaseRepository[MasterDealer]):
    def __init__(self, session: Session) -> None:
        super().__init__(session, MasterDealer)

    def get_active(self) -> list[MasterDealer]:
        """Return all active master dealers."""
        return list(self.session.query(MasterDealer).filter(MasterDealer.active == 1).all())
