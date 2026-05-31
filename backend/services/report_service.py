"""Financial report generation using the CalculationWorkflow.md formulas.

Agent Payout  = amount * factor * half_flag
Master Payout = offloaded_amount * master_factor * half_flag

Agent Commission = (commission_rate / 100) * total_sales
Master Commission = (commission_rate / 100) * total_offloaded

Admin_Net_Profit =
    Total_Sales
    - Total_Agent_Commission
    - Total_Admin_Payout_To_Agents
    + sum(Master_Net_Profit_Loss[m]) over all master dealers
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import NamedTuple

from sqlalchemy.orm import Session

from backend.database.models import (
    DrawSettlementAgent,
    DrawSettlementMaster,
    DrawSettlementSummary,
    DrawSettlementTicket,
    DrawTicketSnapshot,
)
from backend.errors import NotFoundError
from backend.repositories.agent_repository import AgentRepository
from backend.repositories.blacklist_repository import BlacklistRepository
from backend.repositories.draw_repository import DrawRepository
from backend.repositories.master_dealer_repository import MasterDealerRepository
from backend.repositories.offloaded_repository import OffloadedRepository
from backend.repositories.sale_repository import SaleRepository
from backend.repositories.winning_repository import WinningRepository


class WinningTicketDetail(NamedTuple):
    ticket: str
    type: str
    amount: int
    payout: int
    is_half_blacklisted: bool


class AgentReportLine(NamedTuple):
    agent_id: str
    agent_name: str
    total_sale_amount: int
    commission_paid: int
    subtotal: int
    winning_tickets: list[WinningTicketDetail]
    total: int


class DealerReportLine(NamedTuple):
    dealer_id: str
    dealer_name: str
    total_offloaded_amount: int
    commission_to_admin: int
    subtotal: int
    winning_tickets: list[WinningTicketDetail]
    total: int


class AdminReportSection(NamedTuple):
    total_sales_amount: int
    total_commission_payable: int
    subtotal_sales: int
    total_offloaded_amount: int
    total_commission_from_md: int
    subtotal_offloads: int
    winning_tickets: list[WinningTicketDetail]
    grand_total: int


class ReportData(NamedTuple):
    draw_id: int
    draw_status: str
    has_winning_tickets: bool
    agents: list[AgentReportLine]
    dealers: list[DealerReportLine]
    admin: AdminReportSection


class ReportService:
    """Generates structured financial reports for a draw."""

    def __init__(self, session: Session) -> None:
        self.session = session
        self._draw_repo = DrawRepository(session)
        self._sale_repo = SaleRepository(session)
        self._offloaded_repo = OffloadedRepository(session)
        self._agent_repo = AgentRepository(session)
        self._dealer_repo = MasterDealerRepository(session)
        self._winning_repo = WinningRepository(session)
        self._blacklist_repo = BlacklistRepository(session)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def generate_report(self, draw_id: int) -> ReportData:
        draw = self._draw_repo.get_by_id(draw_id)
        if draw is None:
            raise NotFoundError(f"Draw {draw_id} not found.")

        agents = {a.id: a for a in self._agent_repo.get_all()}
        dealers = {d.id: d for d in self._dealer_repo.get_all()}
        winning_tickets = self._winning_repo.get_by_draw(draw_id)
        has_winners = len(winning_tickets) > 0

        all_sales = self._sale_repo.get_by_draw(draw_id)
        all_offloads = self._offloaded_repo.get_by_draw(draw_id)

        # Aggregate sales by agent, by ticket, and by agent+ticket
        sales_by_agent: dict[str, int] = {}
        sales_by_ticket: dict[str, int] = {}
        sales_by_agent_ticket: dict[tuple[str, str], int] = {}
        for s in all_sales:
            agent_id = s.batch.agent_id
            sales_by_agent[agent_id] = sales_by_agent.get(agent_id, 0) + s.amount
            sales_by_ticket[s.ticket] = sales_by_ticket.get(s.ticket, 0) + s.amount
            key = (agent_id, s.ticket)
            sales_by_agent_ticket[key] = sales_by_agent_ticket.get(key, 0) + s.amount

        # Aggregate offloads by dealer, by ticket, and by dealer+ticket
        offloads_by_dealer: dict[str, int] = {}
        offloads_by_ticket: dict[str, int] = {}
        offloads_by_dealer_ticket: dict[tuple[str, str], int] = {}
        for o in all_offloads:
            offloads_by_dealer[o.master_dealer_id] = (
                offloads_by_dealer.get(o.master_dealer_id, 0) + o.amount
            )
            offloads_by_ticket[o.ticket] = offloads_by_ticket.get(o.ticket, 0) + o.amount
            key = (o.master_dealer_id, o.ticket)
            offloads_by_dealer_ticket[key] = offloads_by_dealer_ticket.get(key, 0) + o.amount

        agent_lines = self._build_agent_sections(
            agents, winning_tickets, sales_by_agent, sales_by_agent_ticket
        )
        dealer_lines = self._build_dealer_sections(
            dealers, winning_tickets, offloads_by_dealer, offloads_by_dealer_ticket
        )
        admin = self._build_admin_section(
            draw_id, agent_lines, dealer_lines, agents, winning_tickets,
            sales_by_ticket, offloads_by_ticket, sales_by_agent_ticket,
        )

        return ReportData(
            draw_id=draw_id,
            draw_status=draw.status,
            has_winning_tickets=has_winners,
            agents=agent_lines,
            dealers=dealer_lines,
            admin=admin,
        )

    # ------------------------------------------------------------------
    # Settlement — persist results when a draw is settled
    # ------------------------------------------------------------------

    def settle_and_persist(self, draw_id: int) -> ReportData:
        """Generate the report, persist settlement records, and mark the draw SETTLED — all in one transaction."""
        draw = self._draw_repo.get_by_id(draw_id)
        if draw is None:
            raise NotFoundError(f"Draw {draw_id} not found.")
        if draw.status == "SETTLED":
            from backend.errors import ValidationError
            raise ValidationError(f"Draw {draw_id} is already SETTLED.")

        report = self.generate_report(draw_id)

        # Clear any prior settlement records for this draw
        self._clear_settlement(draw_id)

        # Persist agent settlements
        for a in report.agents:
            self.session.add(DrawSettlementAgent(
                draw_id=draw_id,
                agent_id=a.agent_id,
                commission_rate_used=self._agent_repo.get_by_id(a.agent_id).commission_rate,
                jp_factor_used=self._agent_repo.get_by_id(a.agent_id).jp_factor,
                sp_factor_used=self._agent_repo.get_by_id(a.agent_id).sp_factor,
                total_sales=a.total_sale_amount,
                commission_amount=a.commission_paid,
                net_collection=a.subtotal,
                winning_settlement=sum(w.payout for w in a.winning_tickets),
                final_balance=a.total,
            ))

        # Persist master dealer settlements
        for d in report.dealers:
            self.session.add(DrawSettlementMaster(
                draw_id=draw_id,
                master_dealer_id=d.dealer_id,
                commission_rate_used=self._dealer_repo.get_by_id(d.dealer_id).commission_rate,
                jp_factor_used=self._dealer_repo.get_by_id(d.dealer_id).jp_factor,
                sp_factor_used=self._dealer_repo.get_by_id(d.dealer_id).sp_factor,
                total_offloaded=d.total_offloaded_amount,
                commission_amount=d.commission_to_admin,
                net_received=d.subtotal,
                winning_liability=sum(w.payout for w in d.winning_tickets),
                profit_loss=d.total,
            ))

        # Persist per-ticket settlement
        all_sales = self._sale_repo.get_by_draw(draw_id)
        all_offloads = self._offloaded_repo.get_by_draw(draw_id)
        sales_by_ticket: dict[str, int] = {}
        for s in all_sales:
            sales_by_ticket[s.ticket] = sales_by_ticket.get(s.ticket, 0) + s.amount
        offloads_by_ticket: dict[str, int] = {}
        for o in all_offloads:
            offloads_by_ticket[o.ticket] = offloads_by_ticket.get(o.ticket, 0) + o.amount
        winning_by_ticket = {w.ticket: w for w in self._winning_repo.get_by_draw(draw_id)}

        all_tickets = set(sales_by_ticket.keys()) | set(offloads_by_ticket.keys())
        for ticket in all_tickets:
            total_sold = sales_by_ticket.get(ticket, 0)
            total_offloaded = offloads_by_ticket.get(ticket, 0)
            is_blocked = self._blacklist_repo.is_blocked(draw_id, ticket)
            draw = self._draw_repo.get_by_id(draw_id)
            effective_hold = 0 if is_blocked else draw.house_holding_amount
            admin_hold = min(total_sold, effective_hold)
            pending = max(total_sold - effective_hold - total_offloaded, 0)

            winning = winning_by_ticket.get(ticket)
            prize_type = winning.prize_type if winning else None

            # Agent settlement for this ticket (admin pays agents)
            agent_settlement = 0
            if winning:
                for s in all_sales:
                    if s.ticket == ticket:
                        agent = self._agent_repo.get_by_id(s.batch.agent_id)
                        if agent:
                            is_half = self._blacklist_repo.is_half(draw_id, ticket)
                            factor = agent.jp_factor if winning.prize_type == "JACKPOT" else agent.sp_factor
                            payout = int(s.amount * factor * (0.5 if is_half else 1.0))
                            agent_settlement += payout

            # Master recovery for this ticket (master pays admin)
            master_recovery = 0
            if winning:
                for o in all_offloads:
                    if o.ticket == ticket:
                        dealer = self._dealer_repo.get_by_id(o.master_dealer_id)
                        if dealer:
                            is_half = self._blacklist_repo.is_half(draw_id, ticket)
                            factor = dealer.jp_factor if winning.prize_type == "JACKPOT" else dealer.sp_factor
                            payout = int(o.amount * factor * (0.5 if is_half else 1.0))
                            master_recovery += payout

            # Per-ticket P&L: sales in - prizes out + master recovery - offloaded out
            admin_profit_loss = (
                total_sold - agent_settlement + master_recovery - total_offloaded
            )

            self.session.add(DrawSettlementTicket(
                draw_id=draw_id,
                ticket=ticket,
                prize_type=prize_type,
                total_sold=total_sold,
                admin_hold=admin_hold,
                offloaded=total_offloaded,
                pending=pending,
                admin_agent_settlement=agent_settlement,
                master_recovery=master_recovery,
                admin_profit_loss=admin_profit_loss,
            ))

        # Persist summary
        self.session.add(DrawSettlementSummary(
            draw_id=draw_id,
            total_sales=report.admin.total_sales_amount,
            total_agent_commission=report.admin.total_commission_payable,
            total_agent_settlement=sum(
                sum(w.payout for w in a.winning_tickets) for a in report.agents
            ),
            total_master_commission=report.admin.total_commission_from_md,
            total_master_recovery=sum(
                sum(w.payout for w in d.winning_tickets) for d in report.dealers
            ),
            admin_net_profit=report.admin.grand_total,
            settled_at=datetime.now(UTC),
        ))

        # Transition draw status to SETTLED
        draw.status = "SETTLED"
        draw.settled_at = datetime.now(UTC)

        self.session.flush()
        return report

    def _clear_settlement(self, draw_id: int) -> None:
        """Remove existing settlement records for a draw."""
        for model in [DrawSettlementAgent, DrawSettlementMaster,
                       DrawSettlementTicket, DrawSettlementSummary, DrawTicketSnapshot]:
            self.session.query(model).filter(
                getattr(model, "draw_id") == draw_id
            ).delete()

    # ------------------------------------------------------------------
    # Agent Sections
    # ------------------------------------------------------------------

    def _build_agent_sections(
        self,
        agents: dict[str, object],
        winning_tickets: list[object],
        sales_by_agent: dict[str, int],
        sales_by_agent_ticket: dict[tuple[str, str], int],
    ) -> list[AgentReportLine]:
        lines: list[AgentReportLine] = []
        for agent_id, total_sales in sales_by_agent.items():
            agent = agents.get(agent_id)
            if agent is None:
                continue

            commission = int(total_sales * agent.commission_rate / 100.0)
            subtotal = total_sales - commission

            wt_details = self._agent_winning_tickets(
                agent, winning_tickets, sales_by_agent_ticket
            )
            total_payout = sum(d.payout for d in wt_details)
            total = subtotal - total_payout

            lines.append(AgentReportLine(
                agent_id=agent_id,
                agent_name=agent.name,
                total_sale_amount=total_sales,
                commission_paid=commission,
                subtotal=subtotal,
                winning_tickets=wt_details,
                total=total,
            ))

        return lines

    def _agent_winning_tickets(
        self,
        agent: object,
        winning_tickets: list[object],
        sales_by_agent_ticket: dict[tuple[str, str], int],
    ) -> list[WinningTicketDetail]:
        details: list[WinningTicketDetail] = []
        for wt in winning_tickets:
            amount = sales_by_agent_ticket.get((agent.id, wt.ticket), 0)
            if amount == 0:
                continue

            is_half = self._blacklist_repo.is_half(wt.draw_id, wt.ticket)
            payout = self._calc_payout(
                amount, wt.prize_type, agent.jp_factor, agent.sp_factor, is_half
            )

            details.append(WinningTicketDetail(
                ticket=wt.ticket,
                type=wt.prize_type,
                amount=amount,
                payout=payout,
                is_half_blacklisted=is_half,
            ))

        return details

    # ------------------------------------------------------------------
    # Dealer Sections
    # ------------------------------------------------------------------

    def _build_dealer_sections(
        self,
        dealers: dict[str, object],
        winning_tickets: list[object],
        offloads_by_dealer: dict[str, int],
        offloads_by_dealer_ticket: dict[tuple[str, str], int],
    ) -> list[DealerReportLine]:
        lines: list[DealerReportLine] = []
        for dealer_id, total_offloaded in offloads_by_dealer.items():
            dealer = dealers.get(dealer_id)
            if dealer is None:
                continue

            commission = int(total_offloaded * dealer.commission_rate / 100.0)
            subtotal = total_offloaded - commission

            wt_details = self._dealer_winning_tickets(
                dealer, winning_tickets, offloads_by_dealer_ticket
            )
            total_payout = sum(d.payout for d in wt_details)
            total = subtotal - total_payout

            lines.append(DealerReportLine(
                dealer_id=dealer_id,
                dealer_name=dealer.name,
                total_offloaded_amount=total_offloaded,
                commission_to_admin=commission,
                subtotal=subtotal,
                winning_tickets=wt_details,
                total=total,
            ))

        return lines

    def _dealer_winning_tickets(
        self,
        dealer: object,
        winning_tickets: list[object],
        offloads_by_dealer_ticket: dict[tuple[str, str], int],
    ) -> list[WinningTicketDetail]:
        details: list[WinningTicketDetail] = []
        for wt in winning_tickets:
            amount = offloads_by_dealer_ticket.get((dealer.id, wt.ticket), 0)
            if amount == 0:
                continue

            is_half = self._blacklist_repo.is_half(wt.draw_id, wt.ticket)
            payout = self._calc_payout(
                amount, wt.prize_type, dealer.jp_factor, dealer.sp_factor, is_half
            )

            details.append(WinningTicketDetail(
                ticket=wt.ticket,
                type=wt.prize_type,
                amount=amount,
                payout=payout,
                is_half_blacklisted=is_half,
            ))

        return details

    # ------------------------------------------------------------------
    # Admin Consolidated Section
    # ------------------------------------------------------------------

    def _build_admin_section(
        self,
        draw_id: int,
        agent_lines: list[AgentReportLine],
        dealer_lines: list[DealerReportLine],
        agents: dict[str, object],
        winning_tickets: list[object],
        sales_by_ticket: dict[str, int],
        offloads_by_ticket: dict[str, int],
        sales_by_agent_ticket: dict[tuple[str, str], int],
    ) -> AdminReportSection:
        total_sales = sum(a.total_sale_amount for a in agent_lines)
        total_commission = sum(a.commission_paid for a in agent_lines)
        subtotal_sales = total_sales - total_commission

        total_offloaded = sum(d.total_offloaded_amount for d in dealer_lines)
        total_commission_md = sum(d.commission_to_admin for d in dealer_lines)
        subtotal_offloads = total_offloaded - total_commission_md

        # Admin-held winning tickets (portion not offloaded)
        admin_wt: list[WinningTicketDetail] = []
        for wt in winning_tickets:
            total_ticket_sales = sales_by_ticket.get(wt.ticket, 0)
            total_ticket_offloaded = offloads_by_ticket.get(wt.ticket, 0)
            admin_held = max(total_ticket_sales - total_ticket_offloaded, 0)

            if admin_held <= 0:
                continue

            is_half = self._blacklist_repo.is_half(draw_id, wt.ticket)

            for (a_id, ticket), agent_sales in sales_by_agent_ticket.items():
                if ticket != wt.ticket or agent_sales <= 0 or total_ticket_sales <= 0:
                    continue

                agent = agents.get(a_id)
                if agent is None:
                    continue

                prorated = (admin_held * agent_sales) // total_ticket_sales
                if prorated <= 0:
                    continue

                payout = self._calc_payout(
                    prorated, wt.prize_type, agent.jp_factor, agent.sp_factor, is_half
                )

                admin_wt.append(WinningTicketDetail(
                    ticket=wt.ticket,
                    type=wt.prize_type,
                    amount=prorated,
                    payout=payout,
                    is_half_blacklisted=is_half,
                ))

        # Admin_Net_Profit (from admin's cash-flow perspective):
        #   + subtotal_sales          (cash FROM agents after commission)
        #   - agent_payout_total      (prize cash TO agents)
        #   - subtotal_offloads       (cash TO master dealers, net of commission)
        #   + dealer_payout_total     (prize cash FROM master dealers)
        agent_payout_total = sum(d.payout for a in agent_lines for d in a.winning_tickets)
        dealer_payout_total = sum(d.payout for d in dealer_lines for d in d.winning_tickets)

        grand_total = subtotal_sales - agent_payout_total - subtotal_offloads + dealer_payout_total

        return AdminReportSection(
            total_sales_amount=total_sales,
            total_commission_payable=total_commission,
            subtotal_sales=subtotal_sales,
            total_offloaded_amount=total_offloaded,
            total_commission_from_md=total_commission_md,
            subtotal_offloads=subtotal_offloads,
            winning_tickets=admin_wt,
            grand_total=grand_total,
        )

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _calc_payout(
        amount: int,
        prize_type: str,
        jp_factor: float,
        sp_factor: float,
        is_half: bool,
    ) -> int:
        factor = jp_factor if prize_type == "JACKPOT" else sp_factor
        payout = int(amount * factor * (0.5 if is_half else 1.0))
        return payout
