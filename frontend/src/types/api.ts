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
  openDate: string
  cutoffTime: string
  status: string
  houseHoldingAmount: number
  note: string | null
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
  note: string | null
}

export interface BatchInfo {
  id: number
  drawId: number
  agentId: string
}

/** Standard error shape returned by the backend on failure. */
export interface ApiError {
  error: string
  details?: Record<string, unknown>
}

/** Discriminated result: either success data or an error. */
export type ApiResult<T> = T | ApiError

export interface BlacklistTicketResult {
  id: number
  ticket: string
  type: string
}

export interface WinningTicketResult {
  id: number
  ticket: string
  type: string
}

export interface DeleteResult {
  ok: boolean
}

export interface PartnerResult {
  id: string
  name: string
}

/** Type guard: true if the result is an ApiError. */
export function isApiError(result: unknown): result is ApiError {
  return typeof result === 'object' && result !== null && 'error' in result
}
