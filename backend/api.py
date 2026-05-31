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
from backend.database.models import Preference
from backend.errors import AppError
from backend.services.agent_service import AgentService
from backend.services.blacklist_service import BlacklistService
from backend.services.draw_service import DrawService
from backend.services.master_dealer_service import MasterDealerService
from backend.services.offload_service import OffloadService
from backend.services.report_service import ReportService
from backend.services.risk_service import RiskService
from backend.services.sales_service import SalesService
from backend.services.system_service import SystemService
from backend.services.theme_service import ThemeService
from backend.services.winning_service import WinningService

logger = logging.getLogger(__name__)


class API:
    """Backend API exposed to the frontend via pywebview's JS bridge."""

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
        return self._with_session(lambda s: ThemeService(s).set_theme(theme))

    # ------------------------------------------------------------------
    # Risk Telemetry
    # ------------------------------------------------------------------

    def get_risk_telemetry(self, draw_id: int | None = None) -> dict[str, Any]:
        return self._with_session(lambda s: RiskService(s).get_telemetry(draw_id))

    # ------------------------------------------------------------------
    # Draw Lifecycle
    # ------------------------------------------------------------------

    def open_draw(self, draw_name: str, house_holding_amount: int = 0, notes: str | None = None) -> dict[str, Any]:
        def _do(s: Any) -> dict[str, Any]:
            draw = DrawService(s).open_draw(draw_name, house_holding_amount, notes)
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
                "drawName": draw.draw_name,
                "status": draw.status,
                "houseHoldingAmount": draw.house_holding_amount,
                "openedAt": draw.opened_at.isoformat() if draw.opened_at else None,
                "closedAt": draw.closed_at.isoformat() if draw.closed_at else None,
                "settledAt": draw.settled_at.isoformat() if draw.settled_at else None,
                "notes": draw.notes,
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
                    "drawName": d.draw_name,
                    "status": d.status,
                    "houseHoldingAmount": d.house_holding_amount,
                    "openedAt": d.opened_at.isoformat() if d.opened_at else None,
                    "closedAt": d.closed_at.isoformat() if d.closed_at else None,
                    "settledAt": d.settled_at.isoformat() if d.settled_at else None,
                    "notes": d.notes,
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
                "drawName": draw.draw_name,
                "status": draw.status,
                "houseHoldingAmount": draw.house_holding_amount,
                "openedAt": draw.opened_at.isoformat() if draw.opened_at else None,
                "closedAt": draw.closed_at.isoformat() if draw.closed_at else None,
                "settledAt": draw.settled_at.isoformat() if draw.settled_at else None,
                "notes": draw.notes,
            }
        return self._with_session(_do)

    def update_draw(
        self, draw_id: int,
        draw_name: str | None = None,
        house_holding_amount: int | None = None,
        notes: str | None = None,
    ) -> dict[str, Any]:
        def _do(s: Any) -> dict[str, Any]:
            draw = DrawService(s).update_draw(
                draw_id, draw_name=draw_name,
                house_holding_amount=house_holding_amount, notes=notes,
            )
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
                {"id": t.id, "drawId": t.draw_id, "ticket": t.ticket, "restrictionType": t.restriction_type}
                for t in tickets
            ]
        return self._with_session(_do)

    def create_blacklist_ticket(self, draw_id: int, ticket: str, restriction_type: str) -> dict[str, Any]:
        def _do(s: Any) -> dict[str, Any]:
            t = BlacklistService(s).create(draw_id, ticket, restriction_type)
            return {"id": t.id, "ticket": t.ticket, "restrictionType": t.restriction_type}
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
                {"id": t.id, "drawId": t.draw_id, "ticket": t.ticket, "prizeType": t.prize_type}
                for t in tickets
            ]
        return self._with_session(_do)

    def create_winning_ticket(self, draw_id: int, ticket: str, prize_type: str) -> dict[str, Any]:
        def _do(s: Any) -> dict[str, Any]:
            t = WinningService(s).create(draw_id, ticket, prize_type)
            return {"id": t.id, "ticket": t.ticket, "prizeType": t.prize_type}
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
                    "commissionRate": a.commission_rate,
                    "jpFactor": a.jp_factor, "spFactor": a.sp_factor,
                    "active": bool(a.active),
                }
                for a in agents
            ]
        return self._with_session(_do)

    def create_agent(
        self, id: str, name: str,
        commission_rate: float = 0.0, jp_factor: float = 0.0, sp_factor: float = 0.0,
    ) -> dict[str, Any]:
        def _do(s: Any) -> dict[str, Any]:
            a = AgentService(s).create(id, name, commission_rate, jp_factor, sp_factor)
            return {"id": a.id, "name": a.name}
        return self._with_session(_do)

    def update_agent(
        self, agent_id: str,
        name: str | None = None,
        commission_rate: float | None = None,
        jp_factor: float | None = None,
        sp_factor: float | None = None,
        active: bool | None = None,
    ) -> dict[str, Any]:
        def _do(s: Any) -> dict[str, Any]:
            a = AgentService(s).update(
                agent_id, name=name, commission_rate=commission_rate,
                jp_factor=jp_factor, sp_factor=sp_factor,
                active=1 if active else 0 if active is not None else None,
            )
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
                    "commissionRate": d.commission_rate,
                    "jpFactor": d.jp_factor, "spFactor": d.sp_factor,
                    "active": bool(d.active),
                }
                for d in dealers
            ]
        return self._with_session(_do)

    def create_master_dealer(
        self, id: str, name: str,
        commission_rate: float = 0.0, jp_factor: float = 0.0, sp_factor: float = 0.0,
    ) -> dict[str, Any]:
        def _do(s: Any) -> dict[str, Any]:
            d = MasterDealerService(s).create(id, name, commission_rate, jp_factor, sp_factor)
            return {"id": d.id, "name": d.name}
        return self._with_session(_do)

    def update_master_dealer(
        self, dealer_id: str,
        name: str | None = None,
        commission_rate: float | None = None,
        jp_factor: float | None = None,
        sp_factor: float | None = None,
        active: bool | None = None,
    ) -> dict[str, Any]:
        def _do(s: Any) -> dict[str, Any]:
            d = MasterDealerService(s).update(
                dealer_id, name=name, commission_rate=commission_rate,
                jp_factor=jp_factor, sp_factor=sp_factor,
                active=1 if active else 0 if active is not None else None,
            )
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
        self, batch_id: int, ticket: str, amount: int,
    ) -> dict[str, Any]:
        def _do(s: Any) -> dict[str, Any]:
            sale = SalesService(s).record_sale(batch_id, ticket, amount)
            return {"id": sale.id, "ticket": sale.ticket, "amount": sale.amount}
        return self._with_session(_do)

    def get_sales_by_draw(self, draw_id: int) -> list[dict[str, Any]]:
        def _do(s: Any) -> list[dict[str, Any]]:
            sales = SalesService(s).get_sales_by_draw(draw_id)
            return [
                {
                    "id": sale.id,
                    "drawId": sale.batch.draw_id,
                    "agentId": sale.batch.agent_id,
                    "batchId": sale.batch_id,
                    "ticket": sale.ticket,
                    "amount": sale.amount,
                }
                for sale in sales
            ]
        return self._with_session(_do)

    def get_or_create_batch(self, draw_id: int, agent_id: str) -> dict[str, Any]:
        def _do(s: Any) -> dict[str, Any]:
            batch = SalesService(s).get_or_create_batch(draw_id, agent_id)
            return {
                "id": batch.id,
                "drawId": batch.draw_id,
                "agentId": batch.agent_id,
                "batchNo": batch.batch_no,
            }
        return self._with_session(_do)

    # ------------------------------------------------------------------
    # Offload / Risk
    # ------------------------------------------------------------------

    def get_risk_breakdown(self, draw_id: int) -> dict[str, Any]:
        def _do(s: Any) -> dict[str, Any]:
            config = self._read_offload_config(s)
            breakdown = OffloadService(s).get_risk_breakdown(
                draw_id, config["admin_hold"], config["max_offload_ticket"]
            )
            def _ticket_risk(t: Any) -> dict[str, Any]:
                return {
                    "ticket": t.ticket,
                    "totalSales": t.total_sales,
                    "holding": t.holding,
                    "offloaded": t.offloaded,
                    "pending": t.pending,
                    "isBlocked": t.is_blocked,
                    "riskLevel": t.risk_level,
                }
            return {
                "holding": [_ticket_risk(t) for t in breakdown.holding],
                "offloaded": [_ticket_risk(t) for t in breakdown.offloaded],
                "pending": [_ticket_risk(t) for t in breakdown.pending],
            }
        return self._with_session(_do)

    def create_offload(
        self, draw_id: int, master_dealer_id: str, entries_json: str,
        page_no: str | None = None, notes: str | None = None,
    ) -> dict[str, Any]:
        def _do(s: Any) -> dict[str, Any]:
            config = self._read_offload_config(s)
            entries = json.loads(entries_json)
            records = OffloadService(s).create_offload(
                draw_id, master_dealer_id, entries,
                page_no=page_no, admin_hold=config["admin_hold"], notes=notes,
            )
            return {
                "records": [
                    {
                        "id": r.id, "ticket": r.ticket, "amount": r.amount,
                        "pageNo": r.page_no, "masterDealerId": r.master_dealer_id,
                    }
                    for r in records
                ],
                "count": len(records),
            }
        return self._with_session(_do)

    def get_offload_history(self, draw_id: int) -> list[dict[str, Any]]:
        def _do(s: Any) -> list[dict[str, Any]]:
            records = OffloadService(s).get_offload_history(draw_id)
            return [
                {
                    "id": r.id,
                    "drawId": r.draw_id,
                    "masterDealerId": r.master_dealer_id,
                    "pageNo": r.page_no,
                    "ticket": r.ticket,
                    "amount": r.amount,
                    "notes": r.notes,
                    "createdAt": r.created_at.isoformat() if r.created_at else None,
                }
                for r in records
            ]
        return self._with_session(_do)

    def get_offload_config(self) -> dict[str, Any]:
        def _do(s: Any) -> dict[str, Any]:
            return self._read_offload_config(s)
        return self._with_session(_do)

    def update_offload_config(self, key: str, value: str) -> dict[str, Any]:
        def _do(s: Any) -> dict[str, Any]:
            valid_keys = {"admin_hold", "max_offload_amount", "max_offload_ticket"}
            if key not in valid_keys:
                return {"error": f"Unknown config key {key!r}. Valid keys: {valid_keys}"}
            try:
                int(value)
            except ValueError:
                return {"error": f"Value for {key!r} must be an integer."}
            pref = s.get(Preference, key)
            if pref:
                pref.value = value
            else:
                s.add(Preference(key=key, value=value))
            return {"ok": True, "key": key, "value": value}
        return self._with_session(_do)

    # ------------------------------------------------------------------
    # Report
    # ------------------------------------------------------------------

    def generate_report(self, draw_id: int) -> dict[str, Any]:
        def _do(s: Any) -> dict[str, Any]:
            report = ReportService(s).generate_report(draw_id)

            def _wt(detail: Any) -> dict[str, Any]:
                return {
                    "ticket": detail.ticket,
                    "type": detail.type,
                    "amount": detail.amount,
                    "payout": detail.payout,
                    "isHalfBlacklisted": detail.is_half_blacklisted,
                }

            return {
                "drawId": report.draw_id,
                "drawStatus": report.draw_status,
                "hasWinningTickets": report.has_winning_tickets,
                "agents": [
                    {
                        "agentId": a.agent_id,
                        "agentName": a.agent_name,
                        "totalSaleAmount": a.total_sale_amount,
                        "commissionPaid": a.commission_paid,
                        "subtotal": a.subtotal,
                        "winningTickets": [_wt(d) for d in a.winning_tickets],
                        "total": a.total,
                    }
                    for a in report.agents
                ],
                "dealers": [
                    {
                        "dealerId": d.dealer_id,
                        "dealerName": d.dealer_name,
                        "totalOffloadedAmount": d.total_offloaded_amount,
                        "commissionToAdmin": d.commission_to_admin,
                        "subtotal": d.subtotal,
                        "winningTickets": [_wt(d) for d in d.winning_tickets],
                        "total": d.total,
                    }
                    for d in report.dealers
                ],
                "admin": {
                    "totalSalesAmount": report.admin.total_sales_amount,
                    "totalCommissionPayable": report.admin.total_commission_payable,
                    "subtotalSales": report.admin.subtotal_sales,
                    "totalOffloadedAmount": report.admin.total_offloaded_amount,
                    "totalCommissionFromMd": report.admin.total_commission_from_md,
                    "subtotalOffloads": report.admin.subtotal_offloads,
                    "winningTickets": [_wt(d) for d in report.admin.winning_tickets],
                    "grandTotal": report.admin.grand_total,
                },
            }
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

    def _read_offload_config(self, session: Any) -> dict[str, Any]:
        """Read offload configuration from preferences with defaults."""
        defaults = {
            "admin_hold": "5000",
            "max_offload_amount": "500000",
            "max_offload_ticket": "60",
        }
        result: dict[str, Any] = {}
        for key, default_val in defaults.items():
            pref = session.get(Preference, key)
            result[key] = int(pref.value) if pref else int(default_val)
        return result

    def _with_session(self, fn: Callable, default: Any = None) -> Any:
        """Execute *fn* inside a transactional session.

        On success the session is committed and the return value is passed
        through.  On any AppError the session is rolled back and an error
        dict is returned.  *default* is used as the return value when the
        caller only wants the side-effect (e.g. set_theme_preference).
        """
        session = get_session()
        try:
            result = fn(session)
            session.commit()
            return result if result is not None else default
        except AppError as exc:
            session.rollback()
            logger.warning("Application error: %s", exc.message)
            return {"error": exc.message, "errorCode": exc.code, "details": exc.details}
        except json.JSONDecodeError as exc:
            session.rollback()
            logger.warning("JSON decode error: %s", exc)
            return {"error": f"Invalid JSON: {exc.msg}", "errorCode": "VALIDATION_ERROR"}
        except IntegrityError:
            session.rollback()
            logger.exception("Database integrity error")
            return {"error": "A record with that data already exists.", "errorCode": "INTEGRITY_ERROR"}
        except Exception:
            session.rollback()
            logger.exception("Unhandled error in API call")
            return {"error": "An internal error occurred.", "errorCode": "INTERNAL_ERROR"}
        finally:
            session.close()
