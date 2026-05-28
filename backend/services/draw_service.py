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
        """Open a new draw. Fails if another draw is already OPEN."""
        existing = self._repo.get_open_draw()
        if existing is not None:
            raise ConflictError(
                f"Cannot open a new draw: draw {existing.id} is already OPEN."
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

    def _assert_transition(self, draw: Draw, target: str) -> None:
        allowed = self.VALID_TRANSITIONS.get(draw.status, set())
        if target not in allowed:
            raise ValidationError(
                f"Invalid status transition: {draw.status} → {target}. "
                f"Allowed targets: {allowed or 'none (terminal state)'}."
            )
