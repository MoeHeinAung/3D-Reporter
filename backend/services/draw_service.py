"""Draw lifecycle management — open, close, and settle draws."""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy.orm import Session

from backend.database.models import Draw
from backend.errors import ConflictError, NotFoundError, ValidationError
from backend.repositories.draw_repository import DrawRepository

_UNSET = object()


class DrawService:
    """Manages the draw lifecycle with state machine enforcement."""

    VALID_TRANSITIONS = {
        "OPEN": {"CLOSED"},
        "CLOSED": {"SETTLED"},
        "SETTLED": set(),
    }

    def __init__(self, session: Session) -> None:
        self.session = session
        self._repo = DrawRepository(session)

    def open_draw(
        self, draw_name: str, house_holding_amount: int = 0, notes: str | None = None
    ) -> Draw:
        """Open a new draw. Only one OPEN draw may exist at a time."""
        existing = self._repo.get_open_draw()
        if existing is not None:
            raise ConflictError(
                f"Cannot open a new draw: draw {existing.id} is already OPEN."
            )
        if self._repo.has_pending_closed():
            raise ConflictError(
                "Cannot open a new draw: one or more draws are CLOSED but not yet SETTLED. "
                "Settle all CLOSED draws before opening a new one."
            )
        return self._repo.create(
            draw_name=draw_name,
            house_holding_amount=house_holding_amount,
            status="OPEN",
            opened_at=datetime.now(UTC),
            notes=notes,
        )

    def close_draw(self, draw_id: int) -> Draw:
        """Transition a draw from OPEN to CLOSED."""
        draw = self._repo.get_by_id(draw_id)
        if draw is None:
            raise NotFoundError(f"Draw {draw_id} not found.")
        self._assert_transition(draw, "CLOSED")
        return self._repo.update(draw, status="CLOSED", closed_at=datetime.now(UTC))

    def settle_draw(self, draw_id: int) -> Draw:
        """Transition a draw from CLOSED to SETTLED."""
        draw = self._repo.get_by_id(draw_id)
        if draw is None:
            raise NotFoundError(f"Draw {draw_id} not found.")
        self._assert_transition(draw, "SETTLED")
        return self._repo.update(draw, status="SETTLED", settled_at=datetime.now(UTC))

    def get_open_draw(self) -> Draw | None:
        return self._repo.get_open_draw()

    def get_draw(self, draw_id: int) -> Draw | None:
        return self._repo.get_by_id(draw_id)

    def get_all_draws(self) -> list[Draw]:
        return self._repo.get_all()

    def update_draw(
        self,
        draw_id: int,
        draw_name: str | None | object = _UNSET,
        house_holding_amount: int | None | object = _UNSET,
        notes: str | None | object = _UNSET,
    ) -> Draw:
        draw = self._repo.get_by_id(draw_id)
        if draw is None:
            raise NotFoundError(f"Draw {draw_id} not found.")

        if draw.status == "SETTLED":
            if draw_name is not _UNSET and draw_name is not None:
                raise ValidationError("Cannot change draw_name of a SETTLED draw.")
            if house_holding_amount is not _UNSET and house_holding_amount is not None:
                raise ValidationError("Cannot change house_holding_amount of a SETTLED draw.")

        kwargs: dict[str, object] = {}
        if draw_name is not _UNSET:
            kwargs["draw_name"] = draw_name
        if house_holding_amount is not _UNSET:
            if house_holding_amount is not None and house_holding_amount < 0:
                raise ValidationError("house_holding_amount must be >= 0.")
            kwargs["house_holding_amount"] = house_holding_amount
        if notes is not _UNSET:
            kwargs["notes"] = notes
        return self._repo.update(draw, **kwargs)

    def delete_draw(self, draw_id: int) -> None:
        draw = self._repo.get_by_id(draw_id)
        if draw is None:
            raise NotFoundError(f"Draw {draw_id} not found.")
        self._repo.delete(draw)

    def _assert_transition(self, draw: Draw, target: str) -> None:
        allowed = self.VALID_TRANSITIONS.get(draw.status, set())
        if target not in allowed:
            raise ValidationError(
                f"Invalid status transition: {draw.status} -> {target}. "
                f"Allowed targets: {allowed or 'none (terminal state)'}."
            )
