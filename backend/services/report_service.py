"""Financial report generation with per-agent, per-dealer, and admin consolidation."""

from __future__ import annotations

from typing import NamedTuple

from sqlalchemy.orm import Session

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

        agent_lines = self._build_agent_sections(draw_id, agents, winning_tickets)
        dealer_lines = self._build_dealer_sections(draw_id, dealers, winning_tickets)
        admin = self._build_admin_section(
            draw_id, agent_lines, dealer_lines, agents, winning_tickets
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
    # Agent Sections
    # ------------------------------------------------------------------

    def _build_agent_sections(
        self,
        draw_id: int,
        agents: dict[str, object],
        winning_tickets: list[object],
    ) -> list[AgentReportLine]:
        sales_by_agent = dict(self._sale_repo.get_sales_grouped_by_agent(draw_id))

        lines: list[AgentReportLine] = []
        for agent_id, total_sales in sales_by_agent.items():
            agent = agents.get(agent_id)
            if agent is None:
                continue

            commission = total_sales * int(agent.commission) // 100
            subtotal = total_sales - commission

            wt_details = self._agent_winning_tickets(draw_id, agent, winning_tickets)
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
        draw_id: int,
        agent: object,
        winning_tickets: list[object],
    ) -> list[WinningTicketDetail]:
        details: list[WinningTicketDetail] = []
        for wt in winning_tickets:
            agent_sales = dict(
                self._sale_repo.get_by_ticket_grouped_by_agent(draw_id, wt.ticket)
            )
            amount = agent_sales.get(agent.id, 0)
            if amount == 0:
                continue

            is_half = self._blacklist_repo.is_half(draw_id, wt.ticket)
            payout = self._calc_payout(amount, wt.type, agent.jp_factor, agent.sp_factor, is_half)

            details.append(WinningTicketDetail(
                ticket=wt.ticket,
                type=wt.type,
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
        draw_id: int,
        dealers: dict[str, object],
        winning_tickets: list[object],
    ) -> list[DealerReportLine]:
        offloads_by_dealer = dict(
            self._offloaded_repo.get_offloads_grouped_by_dealer(draw_id)
        )

        lines: list[DealerReportLine] = []
        for dealer_id, total_offloaded in offloads_by_dealer.items():
            dealer = dealers.get(dealer_id)
            if dealer is None:
                continue

            commission = total_offloaded * int(dealer.commission) // 100
            subtotal = total_offloaded - commission

            wt_details = self._dealer_winning_tickets(draw_id, dealer, winning_tickets)
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
        draw_id: int,
        dealer: object,
        winning_tickets: list[object],
    ) -> list[WinningTicketDetail]:
        details: list[WinningTicketDetail] = []
        for wt in winning_tickets:
            dealer_offloads = dict(
                self._offloaded_repo.get_by_ticket_grouped_by_dealer(draw_id, wt.ticket)
            )
            amount = dealer_offloads.get(dealer.id, 0)
            if amount == 0:
                continue

            is_half = self._blacklist_repo.is_half(draw_id, wt.ticket)
            payout = self._calc_payout(
                amount, wt.type, dealer.jp_factor, dealer.sp_factor, is_half
            )

            details.append(WinningTicketDetail(
                ticket=wt.ticket,
                type=wt.type,
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
    ) -> AdminReportSection:
        total_sales = sum(a.total_sale_amount for a in agent_lines)
        total_commission = sum(a.commission_paid for a in agent_lines)
        subtotal_sales = total_sales - total_commission

        total_offloaded = sum(d.total_offloaded_amount for d in dealer_lines)
        total_commission_md = sum(d.commission_to_admin for d in dealer_lines)
        subtotal_offloads = total_offloaded - total_commission_md

        admin_wt: list[WinningTicketDetail] = []
        for wt in winning_tickets:
            total_ticket_sales = self._total_sales_for_ticket(draw_id, wt.ticket)
            total_ticket_offloaded = self._total_offloads_for_ticket(draw_id, wt.ticket)
            admin_held = max(total_ticket_sales - total_ticket_offloaded, 0)

            if admin_held <= 0:
                continue

            is_half = self._blacklist_repo.is_half(draw_id, wt.ticket)

            # Attribute admin-held amount proportionally to each agent that sold the ticket
            agent_sales_map = dict(
                self._sale_repo.get_by_ticket_grouped_by_agent(draw_id, wt.ticket)
            )

            for agent_id, agent_sales in agent_sales_map.items():
                if agent_sales <= 0 or total_ticket_sales <= 0:
                    continue

                agent = agents.get(agent_id)
                if agent is None:
                    continue

                prorated = (admin_held * agent_sales) // total_ticket_sales
                if prorated <= 0:
                    continue

                payout = self._calc_payout(
                    prorated, wt.type, agent.jp_factor, agent.sp_factor, is_half
                )

                admin_wt.append(WinningTicketDetail(
                    ticket=wt.ticket,
                    type=wt.type,
                    amount=prorated,
                    payout=payout,
                    is_half_blacklisted=is_half,
                ))

        all_payouts = (
            sum(d.payout for a in agent_lines for d in a.winning_tickets)
            + sum(d.payout for d in dealer_lines for d in d.winning_tickets)
            + sum(d.payout for d in admin_wt)
        )

        grand_total = subtotal_sales + subtotal_offloads + total_commission_md - all_payouts

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

    def _total_sales_for_ticket(self, draw_id: int, ticket: str) -> int:
        totals = dict(self._sale_repo.get_ticket_totals(draw_id))
        return totals.get(ticket, 0)

    def _total_offloads_for_ticket(self, draw_id: int, ticket: str) -> int:
        totals = dict(self._offloaded_repo.get_ticket_totals(draw_id))
        return totals.get(ticket, 0)

    @staticmethod
    def _calc_payout(
        amount: int,
        ticket_type: str,
        jp_factor: int,
        sp_factor: int,
        is_half: bool,
    ) -> int:
        factor = jp_factor if ticket_type == "Jackpot" else sp_factor
        payout = amount * factor
        if is_half:
            payout = payout // 2
        return payout
