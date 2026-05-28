"""
API Bridge — Python methods exposed to the React frontend via pywebview.

Every public method on this class becomes callable from JavaScript as:
    window.pywebview.api.<method_name>(...args)

This layer handles ONLY bridge concerns: receiving calls, delegating to
services, and formatting responses. No business logic or direct data access.
"""

from __future__ import annotations

import json
import logging
import time
from typing import Any, Callable

from backend.database.connection import get_session
from backend.errors import AppError
from backend.services.draw_service import DrawService
from backend.services.risk_service import RiskService
from backend.services.sales_service import SalesService
from backend.services.system_service import SystemService
from backend.services.theme_service import ThemeService

logger = logging.getLogger(__name__)


class API:
    """
    Backend API exposed to the frontend via pywebview's JS bridge.

    Public methods are callable as `window.pywebview.api.<method>()` from
    JavaScript. Private methods (prefixed with _) are hidden from the bridge.
    """

    def __init__(self) -> None:
        self._start_time = time.time()
        self._system_service = SystemService(self._start_time)

    # ------------------------------------------------------------------
    # System / Telemetry (no DB needed)
    # ------------------------------------------------------------------

    def get_system_info(self) -> dict[str, str]:
        return self._system_service.get_system_info()

    def get_uptime_seconds(self) -> int:
        return self._system_service.get_uptime_seconds()

    def get_server_time(self) -> str:
        return self._system_service.get_server_time()

    # ------------------------------------------------------------------
    # Theme Persistence (DB-backed)
    # ------------------------------------------------------------------

    def get_theme_preference(self) -> str:
        return self._with_session(lambda s: ThemeService(s).get_theme(), default="dark")

    def set_theme_preference(self, theme: str) -> bool:
        return self._with_session(
            lambda s: ThemeService(s).set_theme(theme),
        )

    # ------------------------------------------------------------------
    # Risk / Telemetry (placeholder)
    # ------------------------------------------------------------------

    def get_risk_telemetry(self) -> dict[str, Any]:
        return RiskService().get_telemetry()

    # ------------------------------------------------------------------
    # Draw Lifecycle
    # ------------------------------------------------------------------

    def open_draw(self, open_date: str, cutoff_time: str, house_holding_amount: int = 0, note: str | None = None) -> dict[str, Any]:
        def _do(s: Any) -> dict[str, Any]:
            draw = DrawService(s).open_draw(open_date, cutoff_time, house_holding_amount, note)
            return {"id": draw.id, "status": draw.status}
        return self._with_session(_do)

    def close_draw(self, draw_id: int) -> dict[str, Any]:
        def _do(s: Any) -> dict[str, Any]:
            draw = DrawService(s).close_draw(draw_id)
            return {"id": draw.id, "status": draw.status}
        return self._with_session(_do)

    def settle_draw(self, draw_id: int) -> dict[str, Any]:
        def _do(s: Any) -> dict[str, Any]:
            draw = DrawService(s).settle_draw(draw_id)
            return {"id": draw.id, "status": draw.status}
        return self._with_session(_do)

    def get_open_draw(self) -> dict[str, Any] | None:
        def _do(s: Any) -> dict[str, Any] | None:
            draw = DrawService(s).get_open_draw()
            if draw is None:
                return None
            return {
                "id": draw.id,
                "openDate": draw.open_date,
                "cutoffTime": draw.cutoff_time,
                "status": draw.status,
                "houseHoldingAmount": draw.house_holding_amount,
                "note": draw.note,
            }
        return self._with_session(_do)

    # ------------------------------------------------------------------
    # Sales
    # ------------------------------------------------------------------

    def record_sale(
        self, draw_id: int, agent_id: str, batch_id: int, ticket: str, amount: int, note: str | None = None
    ) -> dict[str, Any]:
        def _do(s: Any) -> dict[str, Any]:
            sale = SalesService(s).record_sale(draw_id, agent_id, batch_id, ticket, amount, note)
            return {"id": sale.id, "ticket": sale.ticket, "amount": sale.amount}
        return self._with_session(_do)

    # ------------------------------------------------------------------
    # Command / Action
    # ------------------------------------------------------------------

    def echo(self, message: str) -> str:
        return f"[backend] {message}"

    def ping(self) -> str:
        return "pong"

    # ------------------------------------------------------------------
    # Session helper
    # ------------------------------------------------------------------

    def _with_session(self, fn: Callable, default: Any = None) -> Any:
        """Execute *fn* inside a transactional session.

        On success the session is committed and the return value is passed
        through.  On any ``AppError`` the session is rolled back and an error
        dict is returned.  *default* is used as the return value when the
        caller only wants the side-effect (e.g. ``set_theme_preference``).
        """
        session = get_session()
        try:
            result = fn(session)
            session.commit()
            return result if result is not None else default
        except AppError as exc:
            session.rollback()
            logger.warning("Application error: %s", exc.message)
            return {"error": exc.message, "details": exc.details}
        except Exception:
            session.rollback()
            logger.exception("Unhandled error in API call")
            return {"error": "An internal error occurred."}
        finally:
            session.close()
