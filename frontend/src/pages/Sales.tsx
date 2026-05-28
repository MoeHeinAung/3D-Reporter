import { useCallback, useEffect, useState } from 'react'
import { api } from '@/api/bridge'
import { isApiError } from '@/types'
import type { Agent, SaleRecord, OpenDrawInfo } from '@/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SaleFormData {
  ticket: string
  amount: number
  note: string
}

const EMPTY_SALE_FORM: SaleFormData = {
  ticket: '',
  amount: 0,
  note: '',
}

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
  const [saleForm, setSaleForm] = useState<SaleFormData>(EMPTY_SALE_FORM)
  const [saleFormSubmitting, setSaleFormSubmitting] = useState(false)

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
      if (result.length > 0 && selectedAgentId === null) {
        setSelectedAgentId(result[0].id)
      }
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

  // ---- Derived ----

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) ?? null
  const agentSales = sales.filter((s) => s.agentId === selectedAgentId)
  const agentSalesTotal = agentSales.reduce((sum, s) => sum + s.amount, 0)

  const loading = drawLoading || agentsLoading
  const error = drawError ?? agentsError

  // ---- Modal handlers ----

  const openSaleModal = (agentId: string) => {
    setModalAgentId(agentId)
    setSaleForm(EMPTY_SALE_FORM)
    setSaleModalOpen(true)
  }

  const closeSaleModal = () => {
    setSaleModalOpen(false)
    setSaleFormSubmitting(false)
    setModalAgentId(null)
  }

  const submitSaleForm = async () => {
    if (!openDraw || !modalAgentId) return
    setSaleFormSubmitting(true)

    const batchResult = await api.get_or_create_batch(openDraw.id, modalAgentId)
    if (isApiError(batchResult)) {
      setSalesError(batchResult.error)
      setSaleFormSubmitting(false)
      return
    }

    const saleResult = await api.record_sale(
      openDraw.id,
      modalAgentId,
      batchResult.id,
      saleForm.ticket,
      saleForm.amount,
      saleForm.note || undefined,
    )
    if (isApiError(saleResult)) {
      setSalesError(saleResult.error)
      setSaleFormSubmitting(false)
      return
    }

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
        <div className="card__header">
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
              {/* ---- Agent List (left 3 columns) ---- */}
              <div className="draws__list">
                {agents.length === 0 ? (
                  <div className="draws__state">No agents found.</div>
                ) : (
                  agents.map((agent) => (
                    <div
                      key={agent.id}
                      className={`draws__list-item${agent.id === selectedAgentId ? ' draws__list-item--active' : ''}`}
                      onClick={() => setSelectedAgentId(agent.id)}
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

              {/* ---- Sales Records (right side) ---- */}
              <div className="draws__summary">
                {selectedAgent ? (
                  <>
                    <div className="draws__summary-header">
                      <span className="draws__summary-title">
                        {selectedAgent.name} ({selectedAgent.id})
                      </span>
                      <button
                        className="btn btn--primary btn--sm"
                        type="button"
                        onClick={() => openSaleModal(selectedAgent.id)}
                      >
                        + Record Sale
                      </button>
                    </div>
                    <dl className="draws__summary-dl">
                      <div className="draws__summary-row">
                        <dt>Commission</dt>
                        <dd>{selectedAgent.commission}%</dd>
                      </div>
                      <div className="draws__summary-row">
                        <dt>JP Factor</dt>
                        <dd>{selectedAgent.jpFactor}</dd>
                      </div>
                      <div className="draws__summary-row">
                        <dt>SP Factor</dt>
                        <dd>{selectedAgent.spFactor}</dd>
                      </div>
                      <div className="draws__summary-row">
                        <dt>Sales Count</dt>
                        <dd>{agentSales.length}</dd>
                      </div>
                      <div className="draws__summary-row">
                        <dt>Total Amount</dt>
                        <dd className="telemetry">{agentSalesTotal.toLocaleString()}</dd>
                      </div>
                    </dl>

                    {/* ---- Sales Table ---- */}
                    <div className="draws__ticket-table-wrapper" style={{ marginTop: 'var(--space-5)', maxHeight: 'calc(100% - 220px)' }}>
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
                        <table className="draws__ticket-table">
                          <thead>
                            <tr>
                              <th style={{ width: 60 }}>ID</th>
                              <th>Ticket</th>
                              <th style={{ width: 120 }}>Amount</th>
                              <th>Note</th>
                            </tr>
                          </thead>
                          <tbody>
                            {agentSales.map((sale) => (
                              <tr key={sale.id}>
                                <td className="text-muted">#{sale.id}</td>
                                <td className="telemetry">{sale.ticket}</td>
                                <td className="telemetry">{sale.amount.toLocaleString()}</td>
                                <td className="text-muted" style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {sale.note || '—'}
                                </td>
                              </tr>
                            ))}
                            {agentSales.length === 0 && (
                              <tr>
                                <td colSpan={4} className="draws__state" style={{ padding: 'var(--space-5)' }}>
                                  No sales recorded for this agent.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="draws__state">Select an agent to view sales.</div>
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
                Record Sale
                {modalAgentId && ` — Agent ${modalAgentId}`}
              </span>
              <button className="icon-btn" type="button" title="Close" onClick={closeSaleModal}>
                <CloseIcon />
              </button>
            </div>
            <div className="modal__body">
              <label className="input-label">
                Ticket Number
                <input
                  className="input"
                  type="text"
                  value={saleForm.ticket}
                  onChange={(e) => setSaleForm((f) => ({ ...f, ticket: e.target.value }))}
                  placeholder="e.g. 123"
                  maxLength={3}
                />
              </label>
              <label className="input-label">
                Amount
                <input
                  className="input"
                  type="number"
                  value={saleForm.amount || ''}
                  onChange={(e) => setSaleForm((f) => ({ ...f, amount: Number(e.target.value) }))}
                  placeholder="0"
                />
              </label>
              <label className="input-label">
                Note
                <input
                  className="input"
                  type="text"
                  value={saleForm.note}
                  onChange={(e) => setSaleForm((f) => ({ ...f, note: e.target.value }))}
                  placeholder="Optional note"
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
                onClick={submitSaleForm}
                disabled={saleFormSubmitting || !saleForm.ticket.trim() || saleForm.amount <= 0}
              >
                {saleFormSubmitting ? 'Saving...' : 'Record Sale'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
