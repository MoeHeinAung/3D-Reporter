/**
 * API response/request types matching backend/api.py and bridge.ts contracts.
 */

export interface SystemInfo {
  platform: string
  platformRelease: string
  arch: string
  pythonVersion: string
  hostname: string
}

export interface RiskCategory {
  label: string
  value: number
  threshold: number
}

export interface RiskTelemetry {
  categories: RiskCategory[]
  overall: number
  updatedAt: string
}

export interface OpenDrawInfo {
  id: number
  drawName: string
  status: string
  houseHoldingAmount: number
  openedAt: string | null
  closedAt: string | null
  settledAt: string | null
  notes: string | null
}

export interface DrawResult {
  id: number
  status: string
}

export interface SaleResult {
  id: number
  ticket: string
  amount: number
}

export interface SaleRecord {
  id: number
  drawId: number
  agentId: string
  batchId: number
  ticket: string
  amount: number
}

export interface BatchInfo {
  id: number
  drawId: number
  agentId: string
}

/** Standard error shape returned by the backend on failure. */
export interface ApiError {
  error: string
  errorCode?: string
  details?: Record<string, unknown>
}

/** Discriminated result: either success data or an error. */
export type ApiResult<T> = T | ApiError

export interface BlacklistTicketResult {
  id: number
  drawId: number
  ticket: string
  restrictionType: string
}

export interface WinningTicketResult {
  id: number
  drawId: number
  ticket: string
  prizeType: string
}

export interface DeleteResult {
  ok: boolean
}

export interface PartnerResult {
  id: string
  name: string
}

export interface TicketRisk {
  ticket: string
  totalSales: number
  holding: number
  offloaded: number
  pending: number
  isBlocked: boolean
}

export interface RiskBreakdown {
  holding: TicketRisk[]
  offloaded: TicketRisk[]
  pending: TicketRisk[]
}

export interface OffloadConfig {
  adminHold: number
  maxOffloadAmount: number
  maxOffloadTicket: number
  offloadPageNumber: number
}

export interface OffloadRecord {
  id: number
  drawId: number
  masterDealerId: string
  pageNo: string
  ticket: string
  amount: number
  notes: string | null
  createdAt: string
}

export interface OffloadResult {
  records: Array<{ id: number; ticket: string; amount: number; pageNo: string; masterDealerId: string }>
  count: number
}

export interface WinningTicketDetail {
  ticket: string
  type: string
  amount: number
  payout: number
  isHalfBlacklisted: boolean
}

export interface AgentReportLine {
  agentId: string
  agentName: string
  totalSaleAmount: number
  commissionPaid: number
  subtotal: number
  winningTickets: WinningTicketDetail[]
  total: number
}

export interface DealerReportLine {
  dealerId: string
  dealerName: string
  totalOffloadedAmount: number
  commissionToAdmin: number
  subtotal: number
  winningTickets: WinningTicketDetail[]
  total: number
}

export interface AdminReportSection {
  totalSalesAmount: number
  totalCommissionPayable: number
  subtotalSales: number
  totalOffloadedAmount: number
  totalCommissionFromMd: number
  subtotalOffloads: number
  winningTickets: WinningTicketDetail[]
  grandTotal: number
}

export interface ReportData {
  drawId: number
  drawStatus: string
  hasWinningTickets: boolean
  agents: AgentReportLine[]
  dealers: DealerReportLine[]
  admin: AdminReportSection
}

/** Type guard: true if the result is an ApiError. */
export function isApiError(result: unknown): result is ApiError {
  return typeof result === 'object' && result !== null && 'error' in result
}
