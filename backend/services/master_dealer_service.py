"""Master Dealer CRUD operations."""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy.orm import Session

from backend.database.models import MasterDealer, Offloaded
from backend.errors import NotFoundError, ValidationError
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

    def create(
        self,
        id: str,
        name: str,
        commission_rate: float = 0.0,
        jp_factor: float = 0.0,
        sp_factor: float = 0.0,
    ) -> MasterDealer:
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
        dealer_id: str,
        name: str | None = None,
        commission_rate: float | None = None,
        jp_factor: float | None = None,
        sp_factor: float | None = None,
        active: int | None | object = _UNSET,
    ) -> MasterDealer:
        dealer = self._repo.get_by_id(dealer_id)
        if dealer is None:
            raise NotFoundError(f"Master Dealer {dealer_id} not found.")
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
        return self._repo.update(dealer, **kwargs)

    def delete(self, dealer_id: str) -> None:
        dealer = self._repo.get_by_id(dealer_id)
        if dealer is None:
            raise NotFoundError(f"Master Dealer {dealer_id} not found.")
        offload_count = self.session.query(Offloaded).filter(
            Offloaded.master_dealer_id == dealer_id
        ).count()
        if offload_count > 0:
            raise ValidationError(
                f"Cannot delete master dealer {dealer_id}: has {offload_count} existing offload(s). "
                "Settle all associated draws first."
            )
        self._repo.delete(dealer)
