"""Verify BaseRepository CRUD operations."""

from __future__ import annotations

from sqlalchemy.orm import Session

from backend.database.models import Agent
from backend.repositories.agent_repository import AgentRepository


class TestBaseRepository:
    def test_create(self, session: Session) -> None:
        repo = AgentRepository(session)
        agent = repo.create(id="A01", name="Test Agent", commission=5)
        assert agent.id == "A01"
        assert agent.name == "Test Agent"

    def test_get_by_id_found(self, session: Session) -> None:
        repo = AgentRepository(session)
        repo.create(id="A01", name="Test Agent")
        fetched = repo.get_by_id("A01")
        assert fetched is not None
        assert fetched.name == "Test Agent"

    def test_get_by_id_not_found(self, session: Session) -> None:
        repo = AgentRepository(session)
        assert repo.get_by_id("NONEXISTENT") is None

    def test_get_all(self, session: Session) -> None:
        repo = AgentRepository(session)
        repo.create(id="A01", name="Agent 1")
        repo.create(id="A02", name="Agent 2")
        all_agents = repo.get_all()
        assert len(all_agents) == 2

    def test_update(self, session: Session) -> None:
        repo = AgentRepository(session)
        agent = repo.create(id="A01", name="Old Name")
        updated = repo.update(agent, name="New Name", commission=15)
        assert updated.name == "New Name"
        assert updated.commission == 15

    def test_delete(self, session: Session) -> None:
        repo = AgentRepository(session)
        agent = repo.create(id="A01", name="To Delete")
        repo.delete(agent)
        assert repo.get_by_id("A01") is None

    def test_count(self, session: Session) -> None:
        repo = AgentRepository(session)
        assert repo.count() == 0
        repo.create(id="A01", name="Agent 1")
        repo.create(id="A02", name="Agent 2")
        assert repo.count() == 2
