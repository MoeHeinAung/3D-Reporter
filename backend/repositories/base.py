"""
Generic base repository providing common CRUD operations.

Entity-specific repositories extend this class and add domain-specific
query methods. All database access goes through repositories — never
use raw SQL or ORM queries outside this layer.
"""

from __future__ import annotations

from typing import Generic, TypeVar

from sqlalchemy.orm import Session

from backend.database.models import Base

T = TypeVar("T", bound=Base)


class BaseRepository(Generic[T]):
    """Generic repository for CRUD operations on an entity type T."""

    def __init__(self, session: Session, model_class: type[T]) -> None:
        self.session = session
        self.model_class = model_class

    def get_by_id(self, id: object) -> T | None:
        return self.session.get(self.model_class, id)

    def get_all(self) -> list[T]:
        return list(self.session.query(self.model_class).all())

    def create(self, **kwargs: object) -> T:
        entity = self.model_class(**kwargs)
        self.session.add(entity)
        self.session.flush()
        return entity

    def update(self, entity: T, **kwargs: object) -> T:
        for key, value in kwargs.items():
            setattr(entity, key, value)
        self.session.flush()
        return entity

    def delete(self, entity: T) -> None:
        self.session.delete(entity)
        self.session.flush()

    def count(self) -> int:
        return self.session.query(self.model_class).count()
