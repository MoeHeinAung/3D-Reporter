"""Agent CRUD operations."""

from __future__ import annotations

from sqlalchemy.orm import Session

from backend.database.models import Agent
from backend.errors import NotFoundError
from backend.repositories.agent_repository import AgentRepository

_UNSET = object()


class AgentService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self._repo = AgentRepository(session)

    def get_all(self) -> list[Agent]:
        return self._repo.get_all()

    def get_by_id(self, agent_id: str) -> Agent | None:
        return self._repo.get_by_id(agent_id)

    def create(self, id: str, name: str, commission: int = 0, jp_factor: int = 0, sp_factor: int = 0, note: str | None = None) -> Agent:
        return self._repo.create(id=id, name=name, commission=commission, jp_factor=jp_factor, sp_factor=sp_factor, note=note)

    def update(self, agent_id: str, name: str | None = None, commission: int | None = None, jp_factor: int | None = None, sp_factor: int | None = None, note: str | None | object = _UNSET) -> Agent:
        agent = self._repo.get_by_id(agent_id)
        if agent is None:
            raise NotFoundError(f"Agent {agent_id} not found.")
        kwargs: dict[str, object] = {}
        if name is not None:
            kwargs["name"] = name
        if commission is not None:
            kwargs["commission"] = commission
        if jp_factor is not None:
            kwargs["jp_factor"] = jp_factor
        if sp_factor is not None:
            kwargs["sp_factor"] = sp_factor
        if note is not _UNSET:
            kwargs["note"] = note
        return self._repo.update(agent, **kwargs)

    def delete(self, agent_id: str) -> None:
        agent = self._repo.get_by_id(agent_id)
        if agent is None:
            raise NotFoundError(f"Agent {agent_id} not found.")
        self._repo.delete(agent)
