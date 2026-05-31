import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '@/api/bridge'
import { isApiError } from '@/types'
import type { Agent, SaleRecord, OpenDrawInfo } from '@/types'

// ---------------------------------------------------------------------------
// Ticket Parsing Engine
// ---------------------------------------------------------------------------

interface SaleEntry {
  ticket: string
  amount: number
}

type FormatType = 'direct' | 'round' | 'dual'

interface ParsedLine {
  index: number
  raw: string
  ticket: string | null
  entries: SaleEntry[]
  formatType: FormatType | null
  isValid: boolean
  error: string | null
}

/** Generate all unique permutations of a 3-character digit string. */
function generatePermutations(digits: string): string[] {
  const chars = digits.split('')
  const seen = new Set<string>()

  function permute(prefix: string, remaining: string[]): void {
    if (remaining.length === 0) {
      seen.add(prefix)
      return
    }
    for (let i = 0; i < remaining.length; i++) {
      const next = remaining.slice()
      next.splice(i, 1)
      permute(prefix + remaining[i], next)
    }
  }

  permute('', chars)
  return Array.from(seen)
}

/**
 * Parse multi-line input into structured sale entries.
 *
 * Rules (applied per line, first match wins):
 *   1. Direct  — single amount → one record: {ticket, amount}
 *   2. Round   — R indicator → all ticket permutations, same amount
 *   3. Dual    — two amounts → first perm gets amt1, rest get amt2
 *
 * The prefix (first 3 chars) is the ticket and MUST be exactly 3 digits.
 * A non-digit separator must appear between ticket and amount.
 */
function parseSalesInput(input: string): ParsedLine[] {
  return input.split('\n').map((line, index) => {
    const trimmed = line.trim()
    if (!trimmed) {
      return { index, raw: line, ticket: null, entries: [], formatType: null, isValid: true, error: null }
    }

    if (trimmed.length < 4) {
      return { index, raw: line, ticket: null, entries: [], formatType: null, isValid: false, error: 'Too short — need at least 4 chars (TTT + amount)' }
    }

    const ticket = trimmed.substring(0, 3)
    const body = trimmed.substring(3).replace(/[/~+.\=\s]+$/, '')

    if (!/^\d{3}$/.test(ticket)) {
      return { index, raw: line, ticket, entries: [], formatType: null, isValid: false, error: `Invalid ticket "${ticket}" — must be exactly 3 digits` }
    }

    // Require a separator between ticket and amount (4th char must not be a digit)
    if (/^\d/.test(trimmed.substring(3))) {
      return { index, raw: line, ticket, entries: [], formatType: null, isValid: false, error: 'Missing separator between ticket and amount' }
    }

    // ---- Rule 3 (Dual): two amounts, first perm gets amt1, rest get amt2 ----
    const dualMatch = body.match(/(\d+)[Rr\/\s\=\-\.\+\~]+(\d+)/)
    if (dualMatch) {
      const amt1 = parseInt(dualMatch[1], 10)
      const amt2 = parseInt(dualMatch[2], 10)
      const perms = generatePermutations(ticket)
      const entries: SaleEntry[] = perms.map((t, i) => ({
        ticket: t,
        amount: i === 0 ? amt1 : amt2,
      }))
      return { index, raw: line, ticket, entries, formatType: 'dual', isValid: true, error: null }
    }

    // ---- Rule 2 (Round): R indicator → all permutations, same amount ----
    if (/[Rr®]/.test(body)) {
      const digits = body.replace(/[^0-9]/g, '')
      if (!digits) {
        return { index, raw: line, ticket, entries: [], formatType: null, isValid: false, error: 'R indicator present but no amount found' }
      }
      const amount = parseInt(digits, 10)
      const perms = generatePermutations(ticket)
      const entries: SaleEntry[] = perms.map((t) => ({ ticket: t, amount }))
      return { index, raw: line, ticket, entries, formatType: 'round', isValid: true, error: null }
    }

    // ---- Rule 1 (Direct): single record ----
    const cleanDigits = body.replace(/[^0-9]/g, '')
    if (!cleanDigits) {
      return { index, raw: line, ticket, entries: [], formatType: null, isValid: false, error: 'No valid amount found' }
    }
    return {
      index, raw: line, ticket,
      entries: [{ ticket, amount: parseInt(cleanDigits, 10) }],
      formatType: 'direct', isValid: true, error: null,
    }
  })
}

// ---------------------------------------------------------------------------
// Batch grouping
// ---------------------------------------------------------------------------

interface BatchGroup {
  batchId: number
  agentId: string
  agentName: string
  sales: SaleRecord[]
  totalAmount: number
}

type SortField = 'batchId' | 'agentName' | 'totalAmount' | 'saleCount'
type SortDir = 'asc' | 'desc'

// ---------------------------------------------------------------------------
// Inline SVG Icons
// ---------------------------------------------------------------------------

function PlusIcon() {
  return (
    <svg className="icon-btn__svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M8 3v10M3 8h10" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg className="icon-btn__svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M3 3l10 10M13 3L3 13" />
    </svg>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className="icon-btn__svg"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      style={{
        display: 'inline-flex',
        transition: 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
      }}
    >
      <path d="M6 4l4 4-4 4" />
    </svg>
  )
}

function SortArrow({ field, current, dir }: { field: SortField; current: SortField; dir: SortDir }) {
  if (field !== current) return <span className="sales__sort-arrow sales__sort-arrow--idle">▸</span>
  return <span className="sales__sort-arrow">{dir === 'asc' ? '▴' : '▾'}</span>
}

// ---------------------------------------------------------------------------
// Sales Page
// ---------------------------------------------------------------------------

export default function Sales() {
  // -- open draw --
  const [openDraw, setOpenDraw] = useState<OpenDrawInfo | null>(null)
  const [drawLoading, setDrawLoading] = useState(true)
  const [drawError, setDrawError] = useState<string | null>(null)

  // -- agents --
  const [agents, setAgents] = useState<Agent[]>([])
  const [agentsLoading, setAgentsLoading] = useState(true)
  const [agentsError, setAgentsError] = useState<string | null>(null)

  // -- selected agent --
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)

  // -- sales --
  const [sales, setSales] = useState<SaleRecord[]>([])
  const [salesLoading, setSalesLoading] = useState(false)
  const [salesError, setSalesError] = useState<string | null>(null)

  // -- sale modal --
  const [saleModalOpen, setSaleModalOpen] = useState(false)
  const [modalAgentId, setModalAgentId] = useState<string | null>(null)
  const [rawInput, setRawInput] = useState('')
  const [saleNote, setSaleNote] = useState('')
  const [saleFormSubmitting, setSaleFormSubmitting] = useState(false)

  // -- confirmation modal --
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)

  // -- table state --
  const [sortField, setSortField] = useState<SortField>('batchId')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [expandedBatches, setExpandedBatches] = useState<Set<number>>(new Set())

  // -- mirror textarea refs --
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)

  const syncScroll = () => {
    if (textareaRef.current && backdropRef.current) {
      backdropRef.current.scrollTop = textareaRef.current.scrollTop
      backdropRef.current.scrollLeft = textareaRef.current.scrollLeft
    }
  }

  // ---- Parse input in real-time ----

  const parsedLines = useMemo(() => parseSalesInput(rawInput), [rawInput])
  const validLines = useMemo(() => parsedLines.filter((pl) => pl.raw.trim() && pl.isValid), [parsedLines])
  const invalidLines = useMemo(() => parsedLines.filter((pl) => pl.raw.trim() && !pl.isValid), [parsedLines])
  const allEntries = useMemo(() => validLines.flatMap((pl) => pl.entries), [validLines])
  const totalAmount = useMemo(() => allEntries.reduce((sum, e) => sum + e.amount, 0), [allEntries])

  // ---- Fetch open draw ----

  const fetchOpenDraw = useCallback(async () => {
    setDrawLoading(true)
    setDrawError(null)
    const result = await api.get_open_draw()
    if (result === null) {
      setOpenDraw(null)
    } else if (isApiError(result)) {
      setDrawError(result.error)
    } else {
      setOpenDraw(result)
    }
    setDrawLoading(false)
  }, [])

  useEffect(() => {
    fetchOpenDraw()
  }, [fetchOpenDraw])

  // ---- Fetch agents ----

  const fetchAgents = useCallback(async () => {
    setAgentsLoading(true)
    setAgentsError(null)
    const result = await api.get_all_agents()
    if (isApiError(result)) {
      setAgentsError(result.error)
    } else {
      setAgents(result)
    }
    setAgentsLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchAgents()
  }, [fetchAgents])

  // Keep selectedAgentId in sync when agents list changes
  useEffect(() => {
    if (selectedAgentId !== null && agents.length > 0 && !agents.find((a) => a.id === selectedAgentId)) {
      setSelectedAgentId(agents[0].id)
    }
    if (agents.length === 0) {
      setSelectedAgentId(null)
    }
  }, [agents, selectedAgentId])

  // ---- Fetch sales ----

  const fetchSales = useCallback(async (drawId: number) => {
    setSalesLoading(true)
    setSalesError(null)
    const result = await api.get_sales_by_draw(drawId)
    if (isApiError(result)) {
      setSalesError(result.error)
      setSales([])
    } else {
      setSales(result)
    }
    setSalesLoading(false)
  }, [])

  useEffect(() => {
    if (openDraw) {
      fetchSales(openDraw.id)
    } else {
      setSales([])
    }
  }, [openDraw, fetchSales])

  // ---- Derived: batch grouping ----

  const filteredSales = useMemo(() => {
    if (selectedAgentId) return sales.filter((s) => s.agentId === selectedAgentId)
    return sales
  }, [sales, selectedAgentId])

  const batchGroups = useMemo(() => {
    const groups = new Map<number, BatchGroup>()
    for (const sale of filteredSales) {
      const existing = groups.get(sale.batchId)
      if (existing) {
        existing.sales.push(sale)
        existing.totalAmount += sale.amount
      } else {
        const agent = agents.find((a) => a.id === sale.agentId)
        groups.set(sale.batchId, {
          batchId: sale.batchId,
          agentId: sale.agentId,
          agentName: agent?.name ?? sale.agentId,
          sales: [sale],
          totalAmount: sale.amount,
        })
      }
    }
    return Array.from(groups.values())
  }, [filteredSales, agents])

  const sortedGroups = useMemo(() => {
    const sorted = [...batchGroups]
    sorted.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'batchId': cmp = a.batchId - b.batchId; break
        case 'agentName': cmp = a.agentName.localeCompare(b.agentName); break
        case 'totalAmount': cmp = a.totalAmount - b.totalAmount; break
        case 'saleCount': cmp = a.sales.length - b.sales.length; break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return sorted
  }, [batchGroups, sortField, sortDir])

  const grandTotal = useMemo(() => filteredSales.reduce((sum, s) => sum + s.amount, 0), [filteredSales])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const toggleBatch = (batchId: number) => {
    setExpandedBatches((prev) => {
      const next = new Set(prev)
      if (next.has(batchId)) next.delete(batchId)
      else next.add(batchId)
      return next
    })
  }

  // ---- Derived ----

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) ?? null
  const loading = drawLoading || agentsLoading
  const error = drawError ?? agentsError

  const modalAgent = agents.find((a) => a.id === modalAgentId) ?? null

  // ---- Modal handlers ----

  const openSaleModal = (agentId: string) => {
    setModalAgentId(agentId)
    setRawInput('')
    setSaleNote('')
    setSaleModalOpen(true)
  }

  const closeSaleModal = () => {
    setSaleModalOpen(false)
    setSaleFormSubmitting(false)
    setModalAgentId(null)
    setRawInput('')
    setSaleNote('')
  }

  const openConfirmModal = () => {
    if (allEntries.length === 0) return
    setConfirmModalOpen(true)
  }

  const closeConfirmModal = () => {
    setConfirmModalOpen(false)
  }

  const submitSales = async () => {
    if (!openDraw || !modalAgentId) return
    setSaleFormSubmitting(true)

    const batchResult = await api.get_or_create_batch(openDraw.id, modalAgentId)
    if (isApiError(batchResult)) {
      setSalesError(batchResult.error)
      setSaleFormSubmitting(false)
      return
    }

    let firstError: string | null = null
    for (const entry of allEntries) {
      const result = await api.record_sale(
        openDraw.id,
        modalAgentId,
        batchResult.id,
        entry.ticket,
        entry.amount,
        saleNote || undefined,
      )
      if (isApiError(result) && !firstError) {
        firstError = result.error
      }
    }

    if (firstError) {
      setSalesError(firstError)
      setSaleFormSubmitting(false)
      return
    }

    setConfirmModalOpen(false)
    closeSaleModal()
    await fetchSales(openDraw.id)
    setSaleFormSubmitting(false)
  }

  // ---- Render ----

  return (
    <>
      {/* ================================================================
          Sales Table — Column 4/13, Row 1/8
          ================================================================ */}
      <div
        className="card"
        style={{ gridColumn: '4 / 13', gridRow: '1 / 8', zIndex: 1, position: 'relative' }}
      >
        <div className="card__header" onClick={() => setSelectedAgentId(null)}>
          <span>Sales</span>
          {openDraw && (
            <span className="draws__badge draws__badge--open draws__badge--lg">
              Draw #{openDraw.id} — {openDraw.status}
            </span>
          )}
        </div>
        <div className="card__body" style={{ padding: 0 }}>
          {loading ? (
            <div className="draws__state">
              <span className="draws__spinner" />
              Loading...
            </div>
          ) : error ? (
            <div className="draws__state draws__state--error">
              <span className="draws__state-icon">!</span>
              {error}
              <button className="btn btn--sm" type="button" onClick={() => { fetchOpenDraw(); fetchAgents(); }} style={{ marginTop: '0.5rem' }}>
                Retry
              </button>
            </div>
          ) : !openDraw ? (
            <div className="draws__state">
              <span className="draws__state-icon">?</span>
              No open draw. Open a draw on the Draws page to record sales.
            </div>
          ) : (
            <div className="draws__split">
              {/* ---- Agent List ---- */}
              <div className="draws__list" onClick={() => setSelectedAgentId(null)}>
                {agents.length === 0 ? (
                  <div className="draws__state">No agents found.</div>
                ) : (
                  agents.map((agent) => (
                    <div
                      key={agent.id}
                      className={`draws__list-item${agent.id === selectedAgentId ? ' draws__list-item--active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedAgentId(agent.id === selectedAgentId ? null : agent.id)
                      }}
                    >
                      <div className="draws__list-item-main">
                        <span className="draws__list-item-id">{agent.id}</span>
                        <div className="draws__list-item-info">
                          <span className="draws__list-item-date">{agent.name}</span>
                          <span className="draws__list-item-cutoff">
                            Comm: {agent.commission}% | JP: {agent.jpFactor} | SP: {agent.spFactor}
                          </span>
                        </div>
                      </div>
                      <div className="draws__list-item-actions">
                        <button
                          className="icon-btn"
                          type="button"
                          title="Record sale for this agent"
                          onClick={(e) => {
                            e.stopPropagation()
                            openSaleModal(agent.id)
                          }}
                        >
                          <PlusIcon />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* ---- Batch-Grouped Sales Table ---- */}
              <div className="draws__summary">
                <div className="draws__summary-header">
                  <span className="draws__summary-title">
                    {selectedAgent ? `${selectedAgent.name} (${selectedAgent.id})` : 'All Agents'}
                  </span>
                  {selectedAgent && (
                    <button
                      className="btn btn--primary btn--sm"
                      type="button"
                      onClick={() => openSaleModal(selectedAgent.id)}
                    >
                      + Record Sale
                    </button>
                  )}
                </div>

                {salesLoading ? (
                  <div className="draws__state">
                    <span className="draws__spinner" />
                    Loading sales...
                  </div>
                ) : salesError ? (
                  <div className="draws__state draws__state--error">
                    <span className="draws__state-icon">!</span>
                    {salesError}
                  </div>
                ) : (
                  <>
                    <div className="draws__ticket-table-wrapper">
                      <table className="draws__ticket-table">
                        <thead>
                          <tr>
                            <th className="sales__sortable" style={{ width: 80 }} onClick={() => handleSort('batchId')}>
                              Batch ID<SortArrow field="batchId" current={sortField} dir={sortDir} />
                            </th>
                            <th className="sales__sortable" onClick={() => handleSort('agentName')}>
                              Agent Name<SortArrow field="agentName" current={sortField} dir={sortDir} />
                            </th>
                            <th className="sales__sortable" style={{ width: 90 }} onClick={() => handleSort('saleCount')}>
                              Tickets<SortArrow field="saleCount" current={sortField} dir={sortDir} />
                            </th>
                            <th className="sales__sortable" style={{ width: 120 }} onClick={() => handleSort('totalAmount')}>
                              Total Amount<SortArrow field="totalAmount" current={sortField} dir={sortDir} />
                            </th>
                            <th style={{ width: 36 }} />
                          </tr>
                        </thead>
                        <tbody>
                          {sortedGroups.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="draws__state" style={{ padding: 'var(--space-5)' }}>
                                {selectedAgent ? 'No sales recorded for this agent.' : 'No sales recorded for this draw.'}
                              </td>
                            </tr>
                          ) : (
                            sortedGroups.flatMap((group) => {
                              const rows = [
                                <tr
                                  key={`batch-${group.batchId}`}
                                  className="sales__batch-row"
                                  onClick={() => toggleBatch(group.batchId)}
                                >
                                  <td className="telemetry">#{group.batchId}</td>
                                  <td>{group.agentName}</td>
                                  <td className="telemetry">{group.sales.length}</td>
                                  <td className="telemetry">{group.totalAmount.toLocaleString()}</td>
                                  <td>
                                    <span className="sales__expand-icon">
                                      <ChevronIcon open={expandedBatches.has(group.batchId)} />
                                    </span>
                                  </td>
                                </tr>,
                              ]
                              if (expandedBatches.has(group.batchId)) {
                                for (const sale of group.sales) {
                                  rows.push(
                                    <tr key={`sale-${sale.id}`} className="sales__child-row">
                                      <td />
                                      <td className="text-muted" style={{ paddingLeft: 'var(--space-5)' }}>{sale.ticket}</td>
                                      <td className="telemetry">{sale.amount.toLocaleString()}</td>
                                      <td className="text-muted" style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {sale.note || '—'}
                                      </td>
                                      <td />
                                    </tr>,
                                  )
                                }
                              }
                              return rows
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Table Footer */}
                    <div className="sales__table-footer">
                      <span className="sales__footer-stat">
                        Total Batches: <strong>{batchGroups.length}</strong>
                      </span>
                      <span className="sales__footer-stat">
                        Total Amount: <strong className="telemetry">{grandTotal.toLocaleString()}</strong>
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================================================================
          Sale Form Modal
          ================================================================ */}
      {saleModalOpen && (
        <div className="modal-overlay" onClick={closeSaleModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <span>
                Record Sales
                {modalAgentId && ` — Agent ${modalAgentId}`}
              </span>
              <button className="icon-btn" type="button" title="Close" onClick={closeSaleModal}>
                <CloseIcon />
              </button>
            </div>
            <div className="modal__body">
              <div>
                <div className="sales__input-label-row" style={{ marginBottom: 'var(--space-1)' }}>
                  <span className="input-label" style={{ marginBottom: 0 }}>
                    Ticket & Amount
                  </span>
                  <span className={`sales__line-count${invalidLines.length > 0 ? ' sales__line-count--warn' : ''}`}>
                    {allEntries.length} record{allEntries.length !== 1 ? 's' : ''}{invalidLines.length > 0 && ` / ${invalidLines.length} warn`}
                  </span>
                </div>
                <div className="sales__input-container">
                  <div className="sales__input-backdrop" ref={backdropRef} aria-hidden="true">
                    {rawInput
                      ? parsedLines.map((pl) => (
                          <span
                            key={pl.index}
                            className={`sales__backdrop-line${!pl.isValid && pl.raw.trim() ? ' sales__backdrop-line--warn' : ''}`}
                          >
                            {pl.raw || '\n'}
                          </span>
                        ))
                      : (
                        <span className="sales__backdrop-line">{'\n'}</span>
                      )}
                  </div>
                  <textarea
                    ref={textareaRef}
                    className="sales__textarea"
                    value={rawInput}
                    onChange={(e) => setRawInput(e.target.value)}
                    onScroll={syncScroll}
                    placeholder={`000 1000\n001 500\n002 200/100\n003 R400`}
                    rows={8}
                    spellCheck={false}
                  />
                </div>
              </div>

              <label className="input-label">
                Note
                <input
                  className="input"
                  type="text"
                  value={saleNote}
                  onChange={(e) => setSaleNote(e.target.value)}
                  placeholder="Optional note for all records"
                />
              </label>
            </div>
            <div className="modal__footer">
              <button className="btn" type="button" onClick={closeSaleModal}>
                Cancel
              </button>
              <button
                className="btn btn--primary"
                type="button"
                onClick={openConfirmModal}
                disabled={allEntries.length === 0}
              >
                Sale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================
          Confirmation Modal
          ================================================================ */}
      {confirmModalOpen && openDraw && modalAgent && (
        <div className="modal-overlay" onClick={closeConfirmModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal__header">
              <span>Confirm Sale</span>
              <button className="icon-btn" type="button" title="Close" onClick={closeConfirmModal}>
                <CloseIcon />
              </button>
            </div>
            <div className="modal__body" style={{ gap: 'var(--space-3)' }}>
              <dl className="draws__summary-dl">
                <div className="draws__summary-row">
                  <dt>Draw ID</dt>
                  <dd className="telemetry">#{openDraw.id}</dd>
                </div>
                <div className="draws__summary-row">
                  <dt>Agent</dt>
                  <dd>{modalAgent.id} — {modalAgent.name}</dd>
                </div>
                <div className="draws__summary-row">
                  <dt>Records</dt>
                  <dd className="telemetry">{allEntries.length}</dd>
                </div>
                <div className="draws__summary-row">
                  <dt>Total Amount</dt>
                  <dd className="telemetry">{totalAmount.toLocaleString()}</dd>
                </div>
                {saleNote && (
                  <div className="draws__summary-row">
                    <dt>Note</dt>
                    <dd>{saleNote}</dd>
                  </div>
                )}
              </dl>

              <div className="sales__confirm-table-wrapper">
                <table className="draws__ticket-table table">
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>#</th>
                      <th>Ticket</th>
                      <th style={{ width: 100 }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allEntries.map((entry, i) => (
                      <tr key={i}>
                        <td className="text-muted">{i + 1}</td>
                        <td className="table__cell--mono">{entry.ticket}</td>
                        <td className="table__cell--numeric">{entry.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn" type="button" onClick={closeConfirmModal}>
                Cancel
              </button>
              <button
                className="btn btn--primary"
                type="button"
                onClick={submitSales}
                disabled={saleFormSubmitting}
              >
                {saleFormSubmitting ? 'Processing...' : `Confirm & Record ${allEntries.length} Sale${allEntries.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
