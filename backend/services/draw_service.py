"""Draw lifecycle management — open, close, and settle draws."""

from __future__ import annotations

from sqlalchemy.orm import Session

from backend.database.models import Draw
from backend.errors import ConflictError, NotFoundError, ValidationError
from backend.repositories.draw_repository import DrawRepository


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
        open_date: str | None = None,
        cutoff_time: str | None = None,
        house_holding_amount: int | None = None,
        note: str | None = None,
    ) -> Draw:
        draw = self._repo.get_by_id(draw_id)
        if draw is None:
            raise NotFoundError(f"Draw {draw_id} not found.")
        kwargs: dict[str, object] = {}
        if open_date is not None:
            kwargs["open_date"] = open_date
        if cutoff_time is not None:
            kwargs["cutoff_time"] = cutoff_time
        if house_holding_amount is not None:
            kwargs["house_holding_amount"] = house_holding_amount
        if note is not None:
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
