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

from sqlalchemy.exc import IntegrityError

from backend.database.connection import get_session
from backend.errors import AppError
from backend.services.agent_service import AgentService
from backend.services.blacklist_service import BlacklistService
from backend.services.draw_service import DrawService
from backend.services.master_dealer_service import MasterDealerService
from backend.services.risk_service import RiskService
from backend.services.sales_service import SalesService
from backend.services.system_service import SystemService
from backend.services.theme_service import ThemeService
from backend.services.winning_service import WinningService

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
    # Draw CRUD
    # ------------------------------------------------------------------

    def get_all_draws(self) -> list[dict[str, Any]]:
        def _do(s: Any) -> list[dict[str, Any]]:
            draws = DrawService(s).get_all_draws()
            return [
                {
                    "id": d.id,
                    "openDate": d.open_date,
                    "cutoffTime": d.cutoff_time,
                    "status": d.status,
                    "houseHoldingAmount": d.house_holding_amount,
                    "note": d.note,
                }
                for d in draws
            ]
        return self._with_session(_do)

    def get_draw(self, draw_id: int) -> dict[str, Any]:
        def _do(s: Any) -> dict[str, Any]:
            draw = DrawService(s).get_draw(draw_id)
            if draw is None:
                return {"error": f"Draw {draw_id} not found."}
            return {
                "id": draw.id,
                "openDate": draw.open_date,
                "cutoffTime": draw.cutoff_time,
                "status": draw.status,
                "houseHoldingAmount": draw.house_holding_amount,
                "note": draw.note,
            }
        return self._with_session(_do)

    def update_draw(self, draw_id: int, open_date: str | None = None, cutoff_time: str | None = None, house_holding_amount: int | None = None, note: str | None = None) -> dict[str, Any]:
        def _do(s: Any) -> dict[str, Any]:
            draw = DrawService(s).update_draw(draw_id, open_date, cutoff_time, house_holding_amount, note)
            return {"id": draw.id, "status": draw.status}
        return self._with_session(_do)

    def delete_draw(self, draw_id: int) -> dict[str, Any]:
        def _do(s: Any) -> dict[str, Any]:
            DrawService(s).delete_draw(draw_id)
            return {"ok": True}
        return self._with_session(_do)

    # ------------------------------------------------------------------
    # Blacklist Tickets
    # ------------------------------------------------------------------

    def get_blacklist_tickets(self, draw_id: int) -> list[dict[str, Any]]:
        def _do(s: Any) -> list[dict[str, Any]]:
            tickets = BlacklistService(s).get_by_draw(draw_id)
            return [
                {"id": t.id, "drawId": t.draw_id, "ticket": t.ticket, "type": t.type}
                for t in tickets
            ]
        return self._with_session(_do)

    def create_blacklist_ticket(self, draw_id: int, ticket: str, ticket_type: str) -> dict[str, Any]:
        def _do(s: Any) -> dict[str, Any]:
            t = BlacklistService(s).create(draw_id, ticket, ticket_type)
            return {"id": t.id, "ticket": t.ticket, "type": t.type}
        return self._with_session(_do)

    def delete_blacklist_ticket(self, ticket_id: int) -> dict[str, Any]:
        def _do(s: Any) -> dict[str, Any]:
            BlacklistService(s).delete(ticket_id)
            return {"ok": True}
        return self._with_session(_do)

    # ------------------------------------------------------------------
    # Winning Tickets
    # ------------------------------------------------------------------

    def get_winning_tickets(self, draw_id: int) -> list[dict[str, Any]]:
        def _do(s: Any) -> list[dict[str, Any]]:
            tickets = WinningService(s).get_by_draw(draw_id)
            return [
                {"id": t.id, "drawId": t.draw_id, "ticket": t.ticket, "type": t.type}
                for t in tickets
            ]
        return self._with_session(_do)

    def create_winning_ticket(self, draw_id: int, ticket: str, ticket_type: str) -> dict[str, Any]:
        def _do(s: Any) -> dict[str, Any]:
            t = WinningService(s).create(draw_id, ticket, ticket_type)
            return {"id": t.id, "ticket": t.ticket, "type": t.type}
        return self._with_session(_do)

    def delete_winning_ticket(self, ticket_id: int) -> dict[str, Any]:
        def _do(s: Any) -> dict[str, Any]:
            WinningService(s).delete(ticket_id)
            return {"ok": True}
        return self._with_session(_do)

    # ------------------------------------------------------------------
    # Agents
    # ------------------------------------------------------------------

    def get_all_agents(self) -> list[dict[str, Any]]:
        def _do(s: Any) -> list[dict[str, Any]]:
            agents = AgentService(s).get_all()
            return [
                {
                    "id": a.id, "name": a.name,
                    "commission": a.commission, "jpFactor": a.jp_factor,
                    "spFactor": a.sp_factor, "note": a.note,
                }
                for a in agents
            ]
        return self._with_session(_do)

    def create_agent(self, id: str, name: str, commission: int = 0, jp_factor: int = 0, sp_factor: int = 0, note: str | None = None) -> dict[str, Any]:
        def _do(s: Any) -> dict[str, Any]:
            a = AgentService(s).create(id, name, commission, jp_factor, sp_factor, note)
            return {"id": a.id, "name": a.name}
        return self._with_session(_do)

    def update_agent(self, agent_id: str, name: str | None = None, commission: int | None = None, jp_factor: int | None = None, sp_factor: int | None = None, note: str | None = None) -> dict[str, Any]:
        def _do(s: Any) -> dict[str, Any]:
            a = AgentService(s).update(agent_id, name, commission, jp_factor, sp_factor, note)
            return {"id": a.id, "name": a.name}
        return self._with_session(_do)

    def delete_agent(self, agent_id: str) -> dict[str, Any]:
        def _do(s: Any) -> dict[str, Any]:
            AgentService(s).delete(agent_id)
            return {"ok": True}
        return self._with_session(_do)

    # ------------------------------------------------------------------
    # Master Dealers
    # ------------------------------------------------------------------

    def get_all_master_dealers(self) -> list[dict[str, Any]]:
        def _do(s: Any) -> list[dict[str, Any]]:
            dealers = MasterDealerService(s).get_all()
            return [
                {
                    "id": d.id, "name": d.name,
                    "commission": d.commission, "jpFactor": d.jp_factor,
                    "spFactor": d.sp_factor, "note": d.note,
                }
                for d in dealers
            ]
        return self._with_session(_do)

    def create_master_dealer(self, id: str, name: str, commission: int = 0, jp_factor: int = 0, sp_factor: int = 0, note: str | None = None) -> dict[str, Any]:
        def _do(s: Any) -> dict[str, Any]:
            d = MasterDealerService(s).create(id, name, commission, jp_factor, sp_factor, note)
            return {"id": d.id, "name": d.name}
        return self._with_session(_do)

    def update_master_dealer(self, dealer_id: str, name: str | None = None, commission: int | None = None, jp_factor: int | None = None, sp_factor: int | None = None, note: str | None = None) -> dict[str, Any]:
        def _do(s: Any) -> dict[str, Any]:
            d = MasterDealerService(s).update(dealer_id, name, commission, jp_factor, sp_factor, note)
            return {"id": d.id, "name": d.name}
        return self._with_session(_do)

    def delete_master_dealer(self, dealer_id: str) -> dict[str, Any]:
        def _do(s: Any) -> dict[str, Any]:
            MasterDealerService(s).delete(dealer_id)
            return {"ok": True}
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

    def api_mode(self) -> str:
        return "pywebview"

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
        except IntegrityError:
            session.rollback()
            logger.exception("Database integrity error")
            return {"error": "A record with that data already exists."}
        except Exception:
            session.rollback()
            logger.exception("Unhandled error in API call")
            return {"error": "An internal error occurred."}
        finally:
            session.close()
