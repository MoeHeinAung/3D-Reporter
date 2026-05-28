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
  ApiError,
  BlacklistTicketResult,
  WinningTicketResult,
  DeleteResult,
  PartnerResult,
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
  open_draw(open_date: string, cutoff_time: string, house_holding_amount?: number, note?: string): Promise<DrawResult | ApiError>
  close_draw(draw_id: number): Promise<DrawResult | ApiError>
  settle_draw(draw_id: number): Promise<DrawResult | ApiError>
  get_open_draw(): Promise<OpenDrawInfo | null | ApiError>
  record_sale(draw_id: number, agent_id: string, batch_id: number, ticket: string, amount: number, note?: string): Promise<SaleResult | ApiError>
  get_all_draws(): Promise<OpenDrawInfo[] | ApiError>
  get_draw(draw_id: number): Promise<OpenDrawInfo | ApiError>
  update_draw(draw_id: number, open_date?: string, cutoff_time?: string, house_holding_amount?: number, note?: string): Promise<DrawResult | ApiError>
  delete_draw(draw_id: number): Promise<DeleteResult | ApiError>
  get_blacklist_tickets(draw_id: number): Promise<BlacklistTicketResult[] | ApiError>
  create_blacklist_ticket(draw_id: number, ticket: string, ticket_type: string): Promise<BlacklistTicketResult | ApiError>
  delete_blacklist_ticket(ticket_id: number): Promise<DeleteResult | ApiError>
  get_winning_tickets(draw_id: number): Promise<WinningTicketResult[] | ApiError>
  create_winning_ticket(draw_id: number, ticket: string, ticket_type: string): Promise<WinningTicketResult | ApiError>
  delete_winning_ticket(ticket_id: number): Promise<DeleteResult | ApiError>
  echo(message: string): Promise<string>
  ping(): Promise<string>
  api_mode(): Promise<string>
  get_all_agents(): Promise<Agent[] | ApiError>
  create_agent(id: string, name: string, commission?: number, jp_factor?: number, sp_factor?: number, note?: string): Promise<PartnerResult | ApiError>
  update_agent(agent_id: string, name?: string, commission?: number, jp_factor?: number, sp_factor?: number, note?: string): Promise<PartnerResult | ApiError>
  delete_agent(agent_id: string): Promise<DeleteResult | ApiError>
  get_all_master_dealers(): Promise<MasterDealer[] | ApiError>
  create_master_dealer(id: string, name: string, commission?: number, jp_factor?: number, sp_factor?: number, note?: string): Promise<PartnerResult | ApiError>
  update_master_dealer(dealer_id: string, name?: string, commission?: number, jp_factor?: number, sp_factor?: number, note?: string): Promise<PartnerResult | ApiError>
  delete_master_dealer(dealer_id: string): Promise<DeleteResult | ApiError>
}

// ---------------------------------------------------------------------------
// Mock state — shared mutable store for browser-based dev
// ---------------------------------------------------------------------------

interface MockState {
  _mockDraws: OpenDrawInfo[]
  _nextDrawId: number
  _nextBlacklistId: number
  _nextWinningId: number
  _mockBlacklist: Array<{ id: number; drawId: number; ticket: string; type: string }>
  _mockWinnings: Array<{ id: number; drawId: number; ticket: string; type: string }>
  _mockAgents: Agent[]
  _mockMasterDealers: MasterDealer[]
}

// ---------------------------------------------------------------------------
// Resolve the API — real pywebview or mock
// ---------------------------------------------------------------------------

function getAPI(): PywebviewAPI {
  const w = window as unknown as { pywebview?: { api: PywebviewAPI } }

  if (w.pywebview?.api) {
    return w.pywebview.api
  }

  // Mock backend for browser-based development
  return {
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
    async open_draw(this: MockState, open_date: string, cutoff_time: string, house_holding_amount?: number, note?: string) {
      const hasOpen = this._mockDraws.find((d) => d.status === 'OPEN')
      if (hasOpen) {
        return { error: `Cannot open a new draw: draw ${hasOpen.id} is already OPEN.` }
      }
      const hasClosed = this._mockDraws.find((d) => d.status === 'CLOSED')
      if (hasClosed) {
        return { error: `Cannot open a new draw: draw ${hasClosed.id} must be SETTLED before opening a new draw.` }
      }
      const entry: OpenDrawInfo = {
        id: this._nextDrawId++,
        openDate: open_date,
        cutoffTime: cutoff_time,
        status: 'OPEN',
        houseHoldingAmount: house_holding_amount ?? 0,
        note: note ?? null,
      }
      this._mockDraws.push(entry)
      return { id: entry.id, status: entry.status }
    },
    async close_draw(this: MockState, draw_id: number) {
      const d = this._mockDraws.find((x) => x.id === draw_id)
      if (!d) return { error: `Draw ${draw_id} not found.` }
      if (d.status !== 'OPEN') return { error: `Cannot close draw ${draw_id}: status is ${d.status}.` }
      d.status = 'CLOSED'
      return { id: d.id, status: d.status }
    },
    async settle_draw(this: MockState, draw_id: number) {
      const d = this._mockDraws.find((x) => x.id === draw_id)
      if (!d) return { error: `Draw ${draw_id} not found.` }
      if (d.status !== 'CLOSED') return { error: `Cannot settle draw ${draw_id}: status is ${d.status}.` }
      d.status = 'SETTLED'
      return { id: d.id, status: d.status }
    },
    async get_open_draw(this: MockState) {
      const d = this._mockDraws.find((x) => x.status === 'OPEN')
      return d ?? null
    },
    async record_sale() {
      return { id: 1, ticket: '123', amount: 100 }
    },

    // -- Draw CRUD --
    _mockDraws: [] as OpenDrawInfo[],
    _nextDrawId: 1,
    _nextBlacklistId: 1,
    _nextWinningId: 1,
    _mockBlacklist: [] as Array<{ id: number; drawId: number; ticket: string; type: string }>,
    _mockWinnings: [] as Array<{ id: number; drawId: number; ticket: string; type: string }>,

    // -- Agent & Master Dealer --
    _mockAgents: [] as Agent[],
    _mockMasterDealers: [] as MasterDealer[],

    async get_all_draws(this: MockState) {
      return [...this._mockDraws].reverse()
    },
    async get_draw(this: MockState, draw_id: number) {
      const d = this._mockDraws.find((x) => x.id === draw_id)
      return d ?? { error: `Draw ${draw_id} not found.` }
    },
    async update_draw(this: MockState, draw_id: number, open_date?: string, cutoff_time?: string, house_holding_amount?: number, note?: string) {
      const d = this._mockDraws.find((x) => x.id === draw_id)
      if (!d) return { error: `Draw ${draw_id} not found.` }
      if (open_date !== undefined && open_date !== null) d.openDate = open_date
      if (cutoff_time !== undefined && cutoff_time !== null) d.cutoffTime = cutoff_time
      if (house_holding_amount !== undefined && house_holding_amount !== null) d.houseHoldingAmount = house_holding_amount
      if (note !== undefined) d.note = note
      return { id: d.id, status: d.status }
    },
    async delete_draw(this: MockState, draw_id: number) {
      const idx = this._mockDraws.findIndex((x) => x.id === draw_id)
      if (idx === -1) return { error: `Draw ${draw_id} not found.` }
      this._mockDraws.splice(idx, 1)
      return { ok: true }
    },
    async get_blacklist_tickets(this: MockState, draw_id: number) {
      return this._mockBlacklist.filter((t) => t.drawId === draw_id)
    },
    async create_blacklist_ticket(this: MockState, draw_id: number, ticket: string, ticket_type: string) {
      const entry = { id: this._nextBlacklistId++, drawId: draw_id, ticket, type: ticket_type }
      this._mockBlacklist.push(entry)
      return { id: entry.id, ticket: entry.ticket, type: entry.type }
    },
    async delete_blacklist_ticket(this: MockState, ticket_id: number) {
      const idx = this._mockBlacklist.findIndex((t) => t.id === ticket_id)
      if (idx === -1) return { error: `Blacklist ticket ${ticket_id} not found.` }
      this._mockBlacklist.splice(idx, 1)
      return { ok: true }
    },
    async get_winning_tickets(this: MockState, draw_id: number) {
      return this._mockWinnings.filter((t) => t.drawId === draw_id)
    },
    async create_winning_ticket(this: MockState, draw_id: number, ticket: string, ticket_type: string) {
      const entry = { id: this._nextWinningId++, drawId: draw_id, ticket, type: ticket_type }
      this._mockWinnings.push(entry)
      return { id: entry.id, ticket: entry.ticket, type: entry.type }
    },
    async delete_winning_ticket(this: MockState, ticket_id: number) {
      const idx = this._mockWinnings.findIndex((t) => t.id === ticket_id)
      if (idx === -1) return { error: `Winning ticket ${ticket_id} not found.` }
      this._mockWinnings.splice(idx, 1)
      return { ok: true }
    },

    // -- Agents --
    async get_all_agents(this: MockState) {
      return [...this._mockAgents]
    },
    async create_agent(this: MockState, id: string, name: string, commission?: number, jp_factor?: number, sp_factor?: number, note?: string) {
      const exists = this._mockAgents.find((a) => a.id === id)
      if (exists) return { error: `Agent ${id} already exists.` }
      const entry: Agent = { id, name, commission: commission ?? 0, jpFactor: jp_factor ?? 0, spFactor: sp_factor ?? 0, note: note ?? null }
      this._mockAgents.push(entry)
      return { id: entry.id, name: entry.name }
    },
    async update_agent(this: MockState, agent_id: string, name?: string, commission?: number, jp_factor?: number, sp_factor?: number, note?: string) {
      const a = this._mockAgents.find((x) => x.id === agent_id)
      if (!a) return { error: `Agent ${agent_id} not found.` }
      if (name !== undefined) a.name = name
      if (commission !== undefined && commission !== null) a.commission = commission
      if (jp_factor !== undefined && jp_factor !== null) a.jpFactor = jp_factor
      if (sp_factor !== undefined && sp_factor !== null) a.spFactor = sp_factor
      if (note !== undefined) a.note = note
      return { id: a.id, name: a.name }
    },
    async delete_agent(this: MockState, agent_id: string) {
      const idx = this._mockAgents.findIndex((a) => a.id === agent_id)
      if (idx === -1) return { error: `Agent ${agent_id} not found.` }
      this._mockAgents.splice(idx, 1)
      return { ok: true }
    },

    // -- Master Dealers --
    async get_all_master_dealers(this: MockState) {
      return [...this._mockMasterDealers]
    },
    async create_master_dealer(this: MockState, id: string, name: string, commission?: number, jp_factor?: number, sp_factor?: number, note?: string) {
      const exists = this._mockMasterDealers.find((d) => d.id === id)
      if (exists) return { error: `Master Dealer ${id} already exists.` }
      const entry: MasterDealer = { id, name, commission: commission ?? 0, jpFactor: jp_factor ?? 0, spFactor: sp_factor ?? 0, note: note ?? null }
      this._mockMasterDealers.push(entry)
      return { id: entry.id, name: entry.name }
    },
    async update_master_dealer(this: MockState, dealer_id: string, name?: string, commission?: number, jp_factor?: number, sp_factor?: number, note?: string) {
      const d = this._mockMasterDealers.find((x) => x.id === dealer_id)
      if (!d) return { error: `Master Dealer ${dealer_id} not found.` }
      if (name !== undefined) d.name = name
      if (commission !== undefined && commission !== null) d.commission = commission
      if (jp_factor !== undefined && jp_factor !== null) d.jpFactor = jp_factor
      if (sp_factor !== undefined && sp_factor !== null) d.spFactor = sp_factor
      if (note !== undefined) d.note = note
      return { id: d.id, name: d.name }
    },
    async delete_master_dealer(this: MockState, dealer_id: string) {
      const idx = this._mockMasterDealers.findIndex((d) => d.id === dealer_id)
      if (idx === -1) return { error: `Master Dealer ${dealer_id} not found.` }
      this._mockMasterDealers.splice(idx, 1)
      return { ok: true }
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
}

export const api = getAPI()
