"""Master Dealer CRUD operations."""

from __future__ import annotations

from sqlalchemy.orm import Session

from backend.database.models import MasterDealer
from backend.errors import NotFoundError
from backend.repositories.master_dealer_repository import MasterDealerRepository

_UNSET = object()


class MasterDealerService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self._repo = MasterDealerRepository(session)

    def get_all(self) -> list[MasterDealer]:
        return self._repo.get_all()

    def get_by_id(self, dealer_id: str) -> MasterDealer | None:
        return self._repo.get_by_id(dealer_id)

    def create(self, id: str, name: str, commission: int = 0, jp_factor: int = 0, sp_factor: int = 0, note: str | None = None) -> MasterDealer:
        return self._repo.create(id=id, name=name, commission=commission, jp_factor=jp_factor, sp_factor=sp_factor, note=note)

    def update(self, dealer_id: str, name: str | None = None, commission: int | None = None, jp_factor: int | None = None, sp_factor: int | None = None, note: str | None | object = _UNSET) -> MasterDealer:
        dealer = self._repo.get_by_id(dealer_id)
        if dealer is None:
            raise NotFoundError(f"Master Dealer {dealer_id} not found.")
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
        return self._repo.update(dealer, **kwargs)

    def delete(self, dealer_id: str) -> None:
        dealer = self._repo.get_by_id(dealer_id)
        if dealer is None:
            raise NotFoundError(f"Master Dealer {dealer_id} not found.")
        self._repo.delete(dealer)
