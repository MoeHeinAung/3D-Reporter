"""Agent CRUD operations."""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy.orm import Session

from backend.database.models import Agent, Batch
from backend.errors import NotFoundError, ValidationError
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

    def create(
        self,
        id: str,
        name: str,
        commission_rate: float = 0.0,
        jp_factor: float = 0.0,
        sp_factor: float = 0.0,
    ) -> Agent:
        return self._repo.create(
            id=id,
            name=name,
            commission_rate=commission_rate,
            jp_factor=jp_factor,
            sp_factor=sp_factor,
            active=1,
            created_at=datetime.now(UTC),
        )

    def update(
        self,
        agent_id: str,
        name: str | None = None,
        commission_rate: float | None = None,
        jp_factor: float | None = None,
        sp_factor: float | None = None,
        active: int | None | object = _UNSET,
    ) -> Agent:
        agent = self._repo.get_by_id(agent_id)
        if agent is None:
            raise NotFoundError(f"Agent {agent_id} not found.")
        kwargs: dict[str, object] = {}
        if name is not None:
            kwargs["name"] = name
        if commission_rate is not None:
            kwargs["commission_rate"] = commission_rate
        if jp_factor is not None:
            kwargs["jp_factor"] = jp_factor
        if sp_factor is not None:
            kwargs["sp_factor"] = sp_factor
        if active is not _UNSET:
            kwargs["active"] = active
        return self._repo.update(agent, **kwargs)

    def delete(self, agent_id: str) -> None:
        agent = self._repo.get_by_id(agent_id)
        if agent is None:
            raise NotFoundError(f"Agent {agent_id} not found.")
        batch_count = self.session.query(Batch).filter(Batch.agent_id == agent_id).count()
        if batch_count > 0:
            raise ValidationError(
                f"Cannot delete agent {agent_id}: has {batch_count} existing batch(es). "
                "Settle all associated draws first."
            )
        self._repo.delete(agent)
