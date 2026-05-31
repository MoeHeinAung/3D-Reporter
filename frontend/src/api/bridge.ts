/**
 * API Bridge — TypeScript wrapper around the pywebview Python backend.
 *
 * In the desktop app, `window.pywebview.api` exposes the Python API class.
 * This module provides typed access and a mock fallback for browser dev.
 */

import type {
  OpenDrawInfo,
  RiskTelemetry,
  SystemInfo,
  DrawResult,
  SaleResult,
  SaleRecord,
  BatchInfo,
  ApiError,
  BlacklistTicketResult,
  WinningTicketResult,
  DeleteResult,
  PartnerResult,
  TicketRisk,
  RiskBreakdown,
  OffloadConfig,
  OffloadRecord,
  OffloadResult,
  ReportData,
} from '../types'
import type { Agent, MasterDealer } from '../types'

// ---------------------------------------------------------------------------
// pywebview JS API type
// ---------------------------------------------------------------------------

interface PywebviewAPI {
  get_system_info(): Promise<SystemInfo>
  get_uptime_seconds(): Promise<number>
  get_server_time(): Promise<string>
  get_risk_telemetry(): Promise<RiskTelemetry>
  get_theme_preference(): Promise<string>
  set_theme_preference(theme: string): Promise<boolean>
  open_draw(draw_name: string, house_holding_amount?: number, notes?: string): Promise<DrawResult | ApiError>
  close_draw(draw_id: number): Promise<DrawResult | ApiError>
  settle_draw(draw_id: number): Promise<DrawResult | ApiError>
  get_open_draw(): Promise<OpenDrawInfo | null | ApiError>
  record_sale(batch_id: number, ticket: string, amount: number): Promise<SaleResult | ApiError>
  get_all_draws(): Promise<OpenDrawInfo[] | ApiError>
  get_draw(draw_id: number): Promise<OpenDrawInfo | ApiError>
  update_draw(draw_id: number, draw_name?: string, house_holding_amount?: number, notes?: string): Promise<DrawResult | ApiError>
  delete_draw(draw_id: number): Promise<DeleteResult | ApiError>
  get_blacklist_tickets(draw_id: number): Promise<BlacklistTicketResult[] | ApiError>
  create_blacklist_ticket(draw_id: number, ticket: string, restriction_type: string): Promise<BlacklistTicketResult | ApiError>
  delete_blacklist_ticket(ticket_id: number): Promise<DeleteResult | ApiError>
  get_winning_tickets(draw_id: number): Promise<WinningTicketResult[] | ApiError>
  create_winning_ticket(draw_id: number, ticket: string, prize_type: string): Promise<WinningTicketResult | ApiError>
  delete_winning_ticket(ticket_id: number): Promise<DeleteResult | ApiError>
  echo(message: string): Promise<string>
  ping(): Promise<string>
  api_mode(): Promise<string>
  get_all_agents(): Promise<Agent[] | ApiError>
  create_agent(id: string, name: string, commission_rate?: number, jp_factor?: number, sp_factor?: number): Promise<PartnerResult | ApiError>
  update_agent(agent_id: string, name?: string, commission_rate?: number, jp_factor?: number, sp_factor?: number, active?: boolean): Promise<PartnerResult | ApiError>
  delete_agent(agent_id: string): Promise<DeleteResult | ApiError>
  get_all_master_dealers(): Promise<MasterDealer[] | ApiError>
  create_master_dealer(id: string, name: string, commission_rate?: number, jp_factor?: number, sp_factor?: number): Promise<PartnerResult | ApiError>
  update_master_dealer(dealer_id: string, name?: string, commission_rate?: number, jp_factor?: number, sp_factor?: number, active?: boolean): Promise<PartnerResult | ApiError>
  delete_master_dealer(dealer_id: string): Promise<DeleteResult | ApiError>
  get_sales_by_draw(draw_id: number): Promise<SaleRecord[] | ApiError>
  get_or_create_batch(draw_id: number, agent_id: string): Promise<BatchInfo | ApiError>
  get_risk_breakdown(draw_id: number): Promise<RiskBreakdown | ApiError>
  create_offload(draw_id: number, master_dealer_id: string, entries_json: string, page_no?: string, notes?: string): Promise<OffloadResult | ApiError>
  get_offload_history(draw_id: number): Promise<OffloadRecord[] | ApiError>
  get_offload_config(): Promise<OffloadConfig | ApiError>
  update_offload_config(key: string, value: string): Promise<{ ok: boolean } | ApiError>
  generate_report(draw_id: number): Promise<ReportData | ApiError>
}

// ---------------------------------------------------------------------------
// Resolve the API — real pywebview or mock
// ---------------------------------------------------------------------------

function getAPI(): PywebviewAPI {
  const w = window as unknown as { pywebview?: { api: PywebviewAPI } }

  if (w.pywebview?.api) {
    return w.pywebview.api
  }

  // Mock state — closure variables for browser-based dev
  const _mockDraws: OpenDrawInfo[] = []
  let _nextDrawId = 1
  let _nextBlacklistId = 1
  let _nextWinningId = 1
  const _mockBlacklist: Array<{ id: number; drawId: number; ticket: string; restrictionType: string }> = []
  const _mockWinnings: Array<{ id: number; drawId: number; ticket: string; prizeType: string }> = []
  const _mockAgents: Agent[] = []
  const _mockMasterDealers: MasterDealer[] = []
  const _mockSales: SaleRecord[] = []
  let _nextSaleId = 1
  let _nextBatchId = 1
  const _mockBatches: Array<{ id: number; drawId: number; agentId: string; totalAmount: number }> = []
  const _mockOffloads: OffloadRecord[] = []
  let _nextOffloadId = 1
  const _mockOffloadConfig: OffloadConfig = {
    adminHold: 5000,
    maxOffloadAmount: 500000,
    maxOffloadTicket: 60,
    offloadPageNumber: 1,
  }

  // Mock backend for browser-based development
  const mock: PywebviewAPI = {
    async get_system_info() {
      return {
        platform: 'browser',
        platformRelease: 'dev',
        arch: 'web',
        pythonVersion: 'mock',
        hostname: 'localhost',
      }
    },
    async get_uptime_seconds() {
      return 0
    },
    async get_server_time() {
      return new Date().toISOString()
    },
    async get_risk_telemetry() {
      return {
        categories: [
          { label: 'Network', value: 0.32, threshold: 0.7 },
          { label: 'Storage', value: 0.55, threshold: 0.8 },
          { label: 'Compute', value: 0.18, threshold: 0.6 },
          { label: 'Memory', value: 0.72, threshold: 0.75 },
          { label: 'IO', value: 0.44, threshold: 0.65 },
          { label: 'Security', value: 0.08, threshold: 0.5 },
        ],
        overall: 0.38,
        updatedAt: new Date().toISOString(),
      }
    },
    async get_theme_preference() {
      return 'dark'
    },
    async set_theme_preference() {
      return true
    },
    async open_draw(draw_name: string, house_holding_amount?: number, notes?: string) {
      const hasOpen = _mockDraws.find((d) => d.status === 'OPEN')
      if (hasOpen) {
        return { error: `Cannot open a new draw: draw ${hasOpen.id} is already OPEN.` }
      }
      const hasClosed = _mockDraws.find((d) => d.status === 'CLOSED')
      if (hasClosed) {
        return { error: `Cannot open a new draw: draw ${hasClosed.id} must be SETTLED before opening a new draw.` }
      }
      const entry: OpenDrawInfo = {
        id: _nextDrawId++,
        drawName: draw_name,
        status: 'OPEN',
        houseHoldingAmount: house_holding_amount ?? 0,
        openedAt: new Date().toISOString(),
        closedAt: null,
        settledAt: null,
        notes: notes ?? null,
      }
      _mockDraws.push(entry)
      return { id: entry.id, status: entry.status }
    },
    async close_draw(draw_id: number) {
      const d = _mockDraws.find((x) => x.id === draw_id)
      if (!d) return { error: `Draw ${draw_id} not found.` }
      if (d.status !== 'OPEN') return { error: `Cannot close draw ${draw_id}: status is ${d.status}.` }
      d.status = 'CLOSED'
      return { id: d.id, status: d.status }
    },
    async settle_draw(draw_id: number) {
      const d = _mockDraws.find((x) => x.id === draw_id)
      if (!d) return { error: `Draw ${draw_id} not found.` }
      if (d.status !== 'CLOSED') return { error: `Cannot settle draw ${draw_id}: status is ${d.status}.` }
      d.status = 'SETTLED'
      return { id: d.id, status: d.status }
    },
    async get_open_draw() {
      const d = _mockDraws.find((x) => x.status === 'OPEN')
      return d ?? null
    },
    async record_sale(batch_id: number, ticket: string, amount: number) {
      const batch = _mockBatches.find((b) => b.id === batch_id)
      if (!batch) return { error: `Batch ${batch_id} not found.` }
      const entry: SaleRecord = {
        id: _nextSaleId++,
        drawId: batch.drawId,
        agentId: batch.agentId,
        batchId: batch_id,
        ticket,
        amount,
      }
      _mockSales.push(entry)
      batch.totalAmount += amount
      return { id: entry.id, ticket: entry.ticket, amount: entry.amount }
    },

    async get_all_draws() {
      return [..._mockDraws].reverse()
    },
    async get_draw(draw_id: number) {
      const d = _mockDraws.find((x) => x.id === draw_id)
      return d ?? { error: `Draw ${draw_id} not found.` }
    },
    async update_draw(draw_id: number, draw_name?: string, house_holding_amount?: number, notes?: string) {
      const d = _mockDraws.find((x) => x.id === draw_id)
      if (!d) return { error: `Draw ${draw_id} not found.` }
      if (draw_name !== undefined && draw_name !== null) d.drawName = draw_name
      if (house_holding_amount !== undefined && house_holding_amount !== null) d.houseHoldingAmount = house_holding_amount
      if (notes !== undefined) d.notes = notes
      return { id: d.id, status: d.status }
    },
    async delete_draw(draw_id: number) {
      const idx = _mockDraws.findIndex((x) => x.id === draw_id)
      if (idx === -1) return { error: `Draw ${draw_id} not found.` }
      _mockDraws.splice(idx, 1)
      return { ok: true }
    },
    async get_blacklist_tickets(draw_id: number) {
      return _mockBlacklist.filter((t) => t.drawId === draw_id)
    },
    async create_blacklist_ticket(draw_id: number, ticket: string, restriction_type: string) {
      const entry = { id: _nextBlacklistId++, drawId: draw_id, ticket, restrictionType: restriction_type }
      _mockBlacklist.push(entry)
      return { id: entry.id, drawId: entry.drawId, ticket: entry.ticket, restrictionType: entry.restrictionType }
    },
    async delete_blacklist_ticket(ticket_id: number) {
      const idx = _mockBlacklist.findIndex((t) => t.id === ticket_id)
      if (idx === -1) return { error: `Blacklist ticket ${ticket_id} not found.` }
      _mockBlacklist.splice(idx, 1)
      return { ok: true }
    },
    async get_winning_tickets(draw_id: number) {
      return _mockWinnings.filter((t) => t.drawId === draw_id)
    },
    async create_winning_ticket(draw_id: number, ticket: string, prize_type: string) {
      const entry = { id: _nextWinningId++, drawId: draw_id, ticket, prizeType: prize_type }
      _mockWinnings.push(entry)
      return { id: entry.id, drawId: entry.drawId, ticket: entry.ticket, prizeType: entry.prizeType }
    },
    async delete_winning_ticket(ticket_id: number) {
      const idx = _mockWinnings.findIndex((t) => t.id === ticket_id)
      if (idx === -1) return { error: `Winning ticket ${ticket_id} not found.` }
      _mockWinnings.splice(idx, 1)
      return { ok: true }
    },

    // -- Agents --
    async get_all_agents() {
      return [..._mockAgents]
    },
    async create_agent(id: string, name: string, commission_rate?: number, jp_factor?: number, sp_factor?: number) {
      const exists = _mockAgents.find((a) => a.id === id)
      if (exists) return { error: `Agent ${id} already exists.` }
      const entry: Agent = { id, name, commissionRate: commission_rate ?? 0, jpFactor: jp_factor ?? 0, spFactor: sp_factor ?? 0, active: true }
      _mockAgents.push(entry)
      return { id: entry.id, name: entry.name }
    },
    async update_agent(agent_id: string, name?: string, commission_rate?: number, jp_factor?: number, sp_factor?: number, active?: boolean) {
      const a = _mockAgents.find((x) => x.id === agent_id)
      if (!a) return { error: `Agent ${agent_id} not found.` }
      if (name !== undefined) a.name = name
      if (commission_rate !== undefined && commission_rate !== null) a.commissionRate = commission_rate
      if (jp_factor !== undefined && jp_factor !== null) a.jpFactor = jp_factor
      if (sp_factor !== undefined && sp_factor !== null) a.spFactor = sp_factor
      if (active !== undefined) a.active = active
      return { id: a.id, name: a.name }
    },
    async delete_agent(agent_id: string) {
      const idx = _mockAgents.findIndex((a) => a.id === agent_id)
      if (idx === -1) return { error: `Agent ${agent_id} not found.` }
      _mockAgents.splice(idx, 1)
      return { ok: true }
    },

    // -- Master Dealers --
    async get_all_master_dealers() {
      return [..._mockMasterDealers]
    },
    async create_master_dealer(id: string, name: string, commission_rate?: number, jp_factor?: number, sp_factor?: number) {
      const exists = _mockMasterDealers.find((d) => d.id === id)
      if (exists) return { error: `Master Dealer ${id} already exists.` }
      const entry: MasterDealer = { id, name, commissionRate: commission_rate ?? 0, jpFactor: jp_factor ?? 0, spFactor: sp_factor ?? 0, active: true }
      _mockMasterDealers.push(entry)
      return { id: entry.id, name: entry.name }
    },
    async update_master_dealer(dealer_id: string, name?: string, commission_rate?: number, jp_factor?: number, sp_factor?: number, active?: boolean) {
      const d = _mockMasterDealers.find((x) => x.id === dealer_id)
      if (!d) return { error: `Master Dealer ${dealer_id} not found.` }
      if (name !== undefined) d.name = name
      if (commission_rate !== undefined && commission_rate !== null) d.commissionRate = commission_rate
      if (jp_factor !== undefined && jp_factor !== null) d.jpFactor = jp_factor
      if (sp_factor !== undefined && sp_factor !== null) d.spFactor = sp_factor
      if (active !== undefined) d.active = active
      return { id: d.id, name: d.name }
    },
    async delete_master_dealer(dealer_id: string) {
      const idx = _mockMasterDealers.findIndex((d) => d.id === dealer_id)
      if (idx === -1) return { error: `Master Dealer ${dealer_id} not found.` }
      _mockMasterDealers.splice(idx, 1)
      return { ok: true }
    },

    // -- Sales & Batches --
    async get_sales_by_draw(draw_id: number) {
      return _mockSales
        .filter((s) => s.drawId === draw_id)
        .sort((a, b) => b.id - a.id)
    },
    async get_or_create_batch(draw_id: number, agent_id: string) {
      let batch = _mockBatches.find((b) => b.drawId === draw_id && b.agentId === agent_id)
      if (!batch) {
        batch = { id: _nextBatchId++, drawId: draw_id, agentId: agent_id, totalAmount: 0 }
        _mockBatches.push(batch)
      }
      return { id: batch.id, drawId: batch.drawId, agentId: batch.agentId }
    },

    // -- Offload / Risk --

    async get_risk_breakdown(draw_id: number) {
      const sales = _mockSales.filter((s) => s.drawId === draw_id)
      const offloads = _mockOffloads.filter((o) => o.drawId === draw_id)
      const blocked = _mockBlacklist
        .filter((b) => b.drawId === draw_id && b.restrictionType === 'BLOCK')
        .map((b) => b.ticket)

      const ticketMap = new Map<string, { totalSales: number; offloaded: number }>()
      for (const s of sales) {
        const entry = ticketMap.get(s.ticket) || { totalSales: 0, offloaded: 0 }
        entry.totalSales += s.amount
        ticketMap.set(s.ticket, entry)
      }
      for (const o of offloads) {
        const entry = ticketMap.get(o.ticket) || { totalSales: 0, offloaded: 0 }
        entry.offloaded += o.amount
        ticketMap.set(o.ticket, entry)
      }

      const allTickets: TicketRisk[] = []
      for (const [ticket, data] of ticketMap) {
        const effectiveHold = blocked.includes(ticket) ? 0 : _mockOffloadConfig.adminHold
        const holding = Math.min(data.totalSales, effectiveHold)
        const pending = Math.max(data.totalSales - effectiveHold - data.offloaded, 0)
        allTickets.push({
          ticket,
          totalSales: data.totalSales,
          holding,
          offloaded: data.offloaded,
          pending,
          isBlocked: blocked.includes(ticket),
        })
      }

      return {
        holding: allTickets.filter((t) => t.pending === 0 && t.offloaded === 0),
        offloaded: allTickets.filter((t) => t.offloaded > 0),
        pending: allTickets
          .filter((t) => t.pending > 0)
          .sort((a, b) => b.pending - a.pending)
          .slice(0, _mockOffloadConfig.maxOffloadTicket),
      }
    },

    async create_offload(draw_id: number, master_dealer_id: string, entries_json: string, page_no?: string, notes?: string) {
      const entries: Array<{ ticket: string; amount: number }> = JSON.parse(entries_json)
      const records: Array<{ id: number; ticket: string; amount: number; pageNo: string; masterDealerId: string }> = []
      for (const entry of entries) {
        const record: OffloadRecord = {
          id: _nextOffloadId++,
          drawId: draw_id,
          masterDealerId: master_dealer_id,
          pageNo: page_no ?? '',
          ticket: entry.ticket,
          amount: entry.amount,
          notes: notes ?? null,
          createdAt: new Date().toISOString(),
        }
        _mockOffloads.push(record)
        records.push({ id: record.id, ticket: record.ticket, amount: record.amount, pageNo: record.pageNo, masterDealerId: record.masterDealerId })
      }
      return { records, count: records.length }
    },

    async get_offload_history(draw_id: number) {
      return _mockOffloads
        .filter((o) => o.drawId === draw_id)
        .sort((a, b) => b.id - a.id)
    },

    async get_offload_config() {
      return { ..._mockOffloadConfig }
    },

    async update_offload_config(key: string, value: string) {
      const numValue = parseInt(value, 10)
      if (key === 'adminHold') _mockOffloadConfig.adminHold = numValue
      else if (key === 'maxOffloadAmount') _mockOffloadConfig.maxOffloadAmount = numValue
      else if (key === 'maxOffloadTicket') _mockOffloadConfig.maxOffloadTicket = numValue
      else if (key === 'offloadPageNumber') _mockOffloadConfig.offloadPageNumber = numValue
      return { ok: true }
    },

    // -- Report --

    async generate_report(draw_id: number) {
      const draw = _mockDraws.find((d) => d.id === draw_id)
      if (!draw) return { error: `Draw ${draw_id} not found.` }

      const agentMap = new Map(_mockAgents.map((a) => [a.id, a]))
      const dealerMap = new Map(_mockMasterDealers.map((d) => [d.id, d]))
      const winners = _mockWinnings.filter((w) => w.drawId === draw_id)
      const hasWinners = winners.length > 0

      const salesByAgent = new Map<string, number>()
      for (const s of _mockSales.filter((s) => s.drawId === draw_id)) {
        salesByAgent.set(s.agentId, (salesByAgent.get(s.agentId) || 0) + s.amount)
      }

      const agents = []
      for (const [agentId, totalSales] of salesByAgent) {
        const agent = agentMap.get(agentId)
        if (!agent) continue
        const commission = Math.floor(totalSales * agent.commissionRate / 100)
        const subtotal = totalSales - commission

        const wtDetails = winners.map((wt) => {
          const agentSalesForTicket = _mockSales
            .filter((s) => s.drawId === draw_id && s.agentId === agentId && s.ticket === wt.ticket)
            .reduce((sum, s) => sum + s.amount, 0)
          if (agentSalesForTicket === 0) return null
          const isHalf = _mockBlacklist.some(
            (b) => b.drawId === draw_id && b.ticket === wt.ticket && b.restrictionType === 'HALF'
          )
          const factor = wt.prizeType === 'JACKPOT' ? agent.jpFactor : agent.spFactor
          const payout = isHalf ? Math.floor(agentSalesForTicket * factor / 2) : agentSalesForTicket * factor
          return { ticket: wt.ticket, type: wt.prizeType as string, amount: agentSalesForTicket, payout, isHalfBlacklisted: isHalf }
        }).filter(Boolean) as ReportData['agents'][number]['winningTickets']

        const total = subtotal - wtDetails.reduce((sum, d) => sum + d.payout, 0)
        agents.push({ agentId, agentName: agent.name, totalSaleAmount: totalSales, commissionPaid: commission, subtotal, winningTickets: wtDetails, total })
      }

      const offloadsByDealer = new Map<string, number>()
      for (const o of _mockOffloads.filter((o) => o.drawId === draw_id)) {
        offloadsByDealer.set(o.masterDealerId, (offloadsByDealer.get(o.masterDealerId) || 0) + o.amount)
      }

      const dealers = []
      for (const [dealerId, totalOffloaded] of offloadsByDealer) {
        const dealer = dealerMap.get(dealerId)
        if (!dealer) continue
        const commission = Math.floor(totalOffloaded * dealer.commissionRate / 100)
        const subtotal = totalOffloaded - commission

        const wtDetails = winners.map((wt) => {
          const dealerOffloadsForTicket = _mockOffloads
            .filter((o) => o.drawId === draw_id && o.masterDealerId === dealerId && o.ticket === wt.ticket)
            .reduce((sum, o) => sum + o.amount, 0)
          if (dealerOffloadsForTicket === 0) return null
          const isHalf = _mockBlacklist.some(
            (b) => b.drawId === draw_id && b.ticket === wt.ticket && b.restrictionType === 'HALF'
          )
          const factor = wt.prizeType === 'JACKPOT' ? dealer.jpFactor : dealer.spFactor
          const payout = isHalf ? Math.floor(dealerOffloadsForTicket * factor / 2) : dealerOffloadsForTicket * factor
          return { ticket: wt.ticket, type: wt.prizeType as string, amount: dealerOffloadsForTicket, payout, isHalfBlacklisted: isHalf }
        }).filter(Boolean) as ReportData['dealers'][number]['winningTickets']

        const total = subtotal - wtDetails.reduce((sum, d) => sum + d.payout, 0)
        dealers.push({ dealerId, dealerName: dealer.name, totalOffloadedAmount: totalOffloaded, commissionToAdmin: commission, subtotal, winningTickets: wtDetails, total })
      }

      const totalSales = agents.reduce((sum, a) => sum + a.totalSaleAmount, 0)
      const totalCommission = agents.reduce((sum, a) => sum + a.commissionPaid, 0)
      const subtotalSales = totalSales - totalCommission
      const totalOffloaded = dealers.reduce((sum, d) => sum + d.totalOffloadedAmount, 0)
      const totalCommissionMd = dealers.reduce((sum, d) => sum + d.commissionToAdmin, 0)
      const subtotalOffloads = totalOffloaded - totalCommissionMd

      const adminWt: ReportData['admin']['winningTickets'] = []
      for (const wt of winners) {
        const totalTicketSales = _mockSales
          .filter((s) => s.drawId === draw_id && s.ticket === wt.ticket)
          .reduce((sum, s) => sum + s.amount, 0)
        const totalTicketOffloaded = _mockOffloads
          .filter((o) => o.drawId === draw_id && o.ticket === wt.ticket)
          .reduce((sum, o) => sum + o.amount, 0)
        const adminHeld = Math.max(totalTicketSales - totalTicketOffloaded, 0)
        if (adminHeld <= 0) continue

        const isHalf = _mockBlacklist.some(
          (b) => b.drawId === draw_id && b.ticket === wt.ticket && b.restrictionType === 'HALF'
        )

        const agentSalesMap = new Map<string, number>()
        for (const s of _mockSales.filter((s) => s.drawId === draw_id && s.ticket === wt.ticket)) {
          agentSalesMap.set(s.agentId, (agentSalesMap.get(s.agentId) || 0) + s.amount)
        }

        for (const [agentId, agentSales] of agentSalesMap) {
          const agent = agentMap.get(agentId)
          if (!agent || totalTicketSales <= 0) continue
          const prorated = Math.floor((adminHeld * agentSales) / totalTicketSales)
          if (prorated <= 0) continue

          const factor = wt.prizeType === 'JACKPOT' ? agent.jpFactor : agent.spFactor
          const payout = isHalf ? Math.floor(prorated * factor / 2) : prorated * factor

          adminWt.push({ ticket: wt.ticket, type: wt.prizeType as string, amount: prorated, payout, isHalfBlacklisted: isHalf })
        }
      }

      const allPayouts =
        agents.reduce((sum, a) => sum + a.winningTickets.reduce((s, d) => s + d.payout, 0), 0) +
        dealers.reduce((sum, d) => sum + d.winningTickets.reduce((s, wt) => s + wt.payout, 0), 0) +
        adminWt.reduce((sum, d) => sum + d.payout, 0)

      const grandTotal = subtotalSales + subtotalOffloads + totalCommissionMd - allPayouts

      return {
        drawId: draw_id,
        drawStatus: draw.status,
        hasWinningTickets: hasWinners,
        agents,
        dealers,
        admin: {
          totalSalesAmount: totalSales,
          totalCommissionPayable: totalCommission,
          subtotalSales,
          totalOffloadedAmount: totalOffloaded,
          totalCommissionFromMd: totalCommissionMd,
          subtotalOffloads,
          winningTickets: adminWt,
          grandTotal,
        },
      }
    },

    async echo(message: string) {
      return `[mock-backend] ${message}`
    },
    async ping() {
      return 'pong'
    },
    async api_mode() {
      return 'mock'
    },
  }

  return mock
}

export const api = getAPI()
