/**
 * Domain entity interfaces matching the backend ORM models.
 *
 * These represent the core business entities in the 3D lottery system.
 * Only fields that the frontend displays or manipulates are included.
 */

export interface Agent {
  id: string
  name: string
  commissionRate: number
  jpFactor: number
  spFactor: number
  active: boolean
}

export interface MasterDealer {
  id: string
  name: string
  commissionRate: number
  jpFactor: number
  spFactor: number
  active: boolean
}

export interface Draw {
  id: number
  drawName: string
  status: 'OPEN' | 'CLOSED' | 'SETTLED'
  houseHoldingAmount: number
  openedAt: string | null
  closedAt: string | null
  settledAt: string | null
  notes: string | null
}

export interface Batch {
  id: number
  drawId: number
  agentId: string
  batchNo: string
  totalAmount: number
  ticketCount: number
  closedAt: string | null
  remarks: string | null
}

export interface Sale {
  id: number
  batchId: number
  ticket: string
  amount: number
}

export interface Offloaded {
  id: number
  drawId: number
  masterDealerId: string
  pageNo: string
  ticket: string
  amount: number
  notes: string | null
  createdAt: string
}

export interface BlacklistTicket {
  id: number
  drawId: number
  ticket: string
  restrictionType: 'HALF' | 'BLOCK'
}

export interface WinningTicket {
  id: number
  drawId: number
  ticket: string
  prizeType: 'JACKPOT' | 'MINOR'
}
