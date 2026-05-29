"""Draw lifecycle management — open, close, and settle draws."""

from __future__ import annotations

import re
from datetime import datetime

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
        "SETTLED": set(),  # Terminal state
    }

    def __init__(self, session: Session) -> None:
        self.session = session
        self._repo = DrawRepository(session)

    def open_draw(
        self, open_date: str, cutoff_time: str, house_holding_amount: int = 0, note: str | None = None
    ) -> Draw:
        """Open a new draw.

        Business constraints:
        1. Only one OPEN draw may exist at a time.
        2. All other draws must be SETTLED — no CLOSED draws may be pending.
        """
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
            open_date=open_date,
            cutoff_time=cutoff_time,
            status="OPEN",
            house_holding_amount=house_holding_amount,
            note=note,
        )

    def close_draw(self, draw_id: int) -> Draw:
        """Transition a draw from OPEN to CLOSED."""
        draw = self._repo.get_by_id(draw_id)
        if draw is None:
            raise NotFoundError(f"Draw {draw_id} not found.")
        self._assert_transition(draw, "CLOSED")
        return self._repo.update(draw, status="CLOSED")

    def settle_draw(self, draw_id: int) -> Draw:
        """Transition a draw from CLOSED to SETTLED."""
        draw = self._repo.get_by_id(draw_id)
        if draw is None:
            raise NotFoundError(f"Draw {draw_id} not found.")
        self._assert_transition(draw, "SETTLED")
        return self._repo.update(draw, status="SETTLED")

    def get_open_draw(self) -> Draw | None:
        return self._repo.get_open_draw()

    def get_draw(self, draw_id: int) -> Draw | None:
        return self._repo.get_by_id(draw_id)

    def get_all_draws(self) -> list[Draw]:
        return self._repo.get_all()

    def update_draw(
        self,
        draw_id: int,
        open_date: str | None | object = _UNSET,
        cutoff_time: str | None | object = _UNSET,
        house_holding_amount: int | None | object = _UNSET,
        note: str | None | object = _UNSET,
    ) -> Draw:
        draw = self._repo.get_by_id(draw_id)
        if draw is None:
            raise NotFoundError(f"Draw {draw_id} not found.")

        # SETTLED draws are immutable except for note
        if draw.status == "SETTLED":
            if open_date is not _UNSET and open_date is not None:
                raise ValidationError("Cannot change open_date of a SETTLED draw.")
            if cutoff_time is not _UNSET and cutoff_time is not None:
                raise ValidationError("Cannot change cutoff_time of a SETTLED draw.")
            if house_holding_amount is not _UNSET and house_holding_amount is not None:
                raise ValidationError("Cannot change house_holding_amount of a SETTLED draw.")

        kwargs: dict[str, object] = {}
        if open_date is not _UNSET:
            if open_date is not None and not _is_valid_date(open_date):
                raise ValidationError(f"Invalid open_date format: {open_date!r}. Use YYYY-MM-DD.")
            kwargs["open_date"] = open_date
        if cutoff_time is not _UNSET:
            if cutoff_time is not None and not _is_valid_cutoff(cutoff_time):
                raise ValidationError(
                    f"Invalid cutoff_time format: {cutoff_time!r}. Use HH:MM or ISO timestamp."
                )
            kwargs["cutoff_time"] = cutoff_time
        if house_holding_amount is not _UNSET:
            if house_holding_amount is not None and house_holding_amount < 0:
                raise ValidationError("house_holding_amount must be >= 0.")
            kwargs["house_holding_amount"] = house_holding_amount
        if note is not _UNSET:
            kwargs["note"] = note
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
                f"Invalid status transition: {draw.status} → {target}. "
                f"Allowed targets: {allowed or 'none (terminal state)'}."
            )


def _is_valid_date(value: str) -> bool:
    """Return True if *value* matches YYYY-MM-DD format."""
    return bool(re.match(r"^\d{4}-\d{2}-\d{2}$", value))


def _is_valid_cutoff(value: str) -> bool:
    """Return True if *value* is HH:MM or a valid ISO datetime string."""
    if re.match(r"^\d{2}:\d{2}$", value):
        return True
    try:
        datetime.fromisoformat(value)
        return True
    except ValueError:
        return False
