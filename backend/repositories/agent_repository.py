"""Data access for Agent entities."""

from __future__ import annotations

from sqlalchemy.orm import Session

from backend.database.models import Agent
from backend.repositories.base import BaseRepository


class AgentRepository(BaseRepository[Agent]):
    def __init__(self, session: Session) -> None:
        super().__init__(session, Agent)

    def get_active(self) -> list[Agent]:
        """Return all active agents."""
        return list(self.session.query(Agent).filter(Agent.active == 1).all())
