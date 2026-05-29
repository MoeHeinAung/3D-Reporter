/**
 * Domain entity interfaces matching the backend ORM models.
 *
 * These represent the core business entities in the 3D lottery system.
 * Only fields that the frontend displays or manipulates are included.
 */

export interface Agent {
  id: string
  name: string
  commission: number
  jpFactor: number
  spFactor: number
  note: string | null
}

export interface MasterDealer {
  id: string
  name: string
  commission: number
  jpFactor: number
  spFactor: number
  note: string | null
}

export interface Draw {
  id: number
  openDate: string
  cutoffTime: string
  status: 'OPEN' | 'CLOSED' | 'SETTLED'
  houseHoldingAmount: number
  note: string | null
}

export interface Batch {
  id: number
  drawId: number
  agentId: string
  totalAmount: number
  note: string | null
}

export interface Sale {
  id: number
  drawId: number
  agentId: string
  batchId: number
  ticket: string
  amount: number
  note: string | null
}

export interface Offloaded {
  id: number
  drawId: number
  masterDealerId: string
  pageNo: number
  ticket: string
  amount: number
  note: string | null
  createdAt: string
}

export interface BlacklistTicket {
  id: number
  drawId: number
  ticket: string
  type: 'HALF' | 'BLOCK'
}

export interface WinningTicket {
  id: number
  drawId: number
  ticket: string
  type: 'Jackpot' | 'Minor'
}
