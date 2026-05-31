import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/bridge'
import { isApiError } from '../types'
import type { OpenDrawInfo, BlacklistTicketResult, WinningTicketResult } from '../types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TicketTab = 'blacklist' | 'winning'

interface DrawFormData {
  drawName: string
  houseHoldingAmount: number
  notes: string
}

const EMPTY_FORM: DrawFormData = {
  drawName: '',
  houseHoldingAmount: 0,
  notes: '',
}

// ---------------------------------------------------------------------------
// Inline SVG Icons
// ---------------------------------------------------------------------------

function EditIcon() {
  return (
    <svg
      className="icon-btn__svg"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11.5 2.5l2 2L5 13H3v-2L11.5 2.5z" />
      <path d="M10 4l2 2" />
    </svg>
  )
}

function DeleteIcon() {
  return (
    <svg
      className="icon-btn__svg"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 4h12" />
      <path d="M5.5 4V3a1 1 0 011-1h3a1 1 0 011 1v1" />
      <path d="M12.5 4v9a1 1 0 01-1 1h-7a1 1 0 01-1-1V4" />
      <path d="M6 7v5" />
      <path d="M10 7v5" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg
      className="icon-btn__svg"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M3 3l10 10M13 3L3 13" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Draws Page
// ---------------------------------------------------------------------------

export default function Draws() {
  // -- draws state --
  const [draws, setDraws] = useState<OpenDrawInfo[]>([])
  const [drawsLoading, setDrawsLoading] = useState(true)
  const [drawsError, setDrawsError] = useState<string | null>(null)
  const [selectedDrawId, setSelectedDrawId] = useState<number | null>(null)

  // -- draw modal state --
  const [drawModalOpen, setDrawModalOpen] = useState(false)
  const [drawFormMode, setDrawFormMode] = useState<'insert' | 'edit'>('insert')
  const [drawForm, setDrawForm] = useState<DrawFormData>(EMPTY_FORM)
  const [drawFormSubmitting, setDrawFormSubmitting] = useState(false)
  const [editingDrawId, setEditingDrawId] = useState<number | null>(null)

  // -- ticket tabs / state --
  const [ticketTab, setTicketTab] = useState<TicketTab>('blacklist')
  const [blacklistTickets, setBlacklistTickets] = useState<BlacklistTicketResult[]>([])
  const [winningTickets, setWinningTickets] = useState<WinningTicketResult[]>([])
  const [ticketsLoading, setTicketsLoading] = useState(false)
  const [ticketsError, setTicketsError] = useState<string | null>(null)

  // -- ticket modal state --
  const [ticketModalOpen, setTicketModalOpen] = useState(false)
  const [ticketForm, setTicketForm] = useState({ ticket: '', type: 'HALF' })
  const [ticketFormSubmitting, setTicketFormSubmitting] = useState(false)

  // ---- Fetch draws ----

  const fetchDraws = useCallback(async (retainSelection?: number) => {
    setDrawsLoading(true)
    setDrawsError(null)
    const result = await api.get_all_draws()
    if (isApiError(result)) {
      setDrawsError(result.error)
    } else {
      setDraws(result)
      // Resolve selected ID: keep current if still valid, else pick first
      const current = retainSelection ?? selectedDrawId
      if (current !== null && result.find((d) => d.id === current)) {
        if (selectedDrawId !== current) setSelectedDrawId(current)
      } else if (result.length > 0 && selectedDrawId === null) {
        setSelectedDrawId(result[0].id)
      } else if (result.length === 0) {
        setSelectedDrawId(null)
      } else if (selectedDrawId !== null && !result.find((d) => d.id === selectedDrawId)) {
        setSelectedDrawId(result[0].id)
      }
    }
    setDrawsLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDraws()
  }, [fetchDraws])

  // ---- Fetch tickets for selected draw ----

  const fetchTickets = useCallback(async (drawId: number) => {
    setTicketsLoading(true)
    setTicketsError(null)
    const [blResult, wlResult] = await Promise.all([
      api.get_blacklist_tickets(drawId),
      api.get_winning_tickets(drawId),
    ])
    if (isApiError(blResult)) {
      setTicketsError(blResult.error)
    } else {
      setBlacklistTickets(blResult)
    }
    if (isApiError(wlResult)) {
      setTicketsError((prev) => prev ?? wlResult.error)
    } else {
      setWinningTickets(wlResult)
    }
    setTicketsLoading(false)
  }, [])

  useEffect(() => {
    if (selectedDrawId !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchTickets(selectedDrawId)
    }
  }, [selectedDrawId, fetchTickets])

  // ---- Selected draw ----

  const selectedDraw = draws.find((d) => d.id === selectedDrawId) ?? null

  // ---- Draw modal handlers ----

  const openInsertModal = () => {
    setDrawFormMode('insert')
    setDrawForm(EMPTY_FORM)
    setEditingDrawId(null)
    setDrawModalOpen(true)
  }

  const openEditModal = (draw: OpenDrawInfo) => {
    setDrawFormMode('edit')
    setDrawForm({
      drawName: draw.drawName,
      houseHoldingAmount: draw.houseHoldingAmount,
      notes: draw.notes ?? '',
    })
    setEditingDrawId(draw.id)
    setDrawModalOpen(true)
  }

  const closeDrawModal = () => {
    setDrawModalOpen(false)
    setDrawFormSubmitting(false)
  }

  const submitDrawForm = async () => {
    setDrawFormSubmitting(true)
    const { drawName, houseHoldingAmount, notes } = drawForm
    if (drawFormMode === 'insert') {
      const result = await api.open_draw(drawName, houseHoldingAmount, notes || undefined)
      if (isApiError(result)) {
        setDrawsError(result.error)
        setDrawFormSubmitting(false)
        return
      }
      closeDrawModal()
      await fetchDraws()
    } else if (editingDrawId !== null) {
      const result = await api.update_draw(editingDrawId, drawName, houseHoldingAmount, notes || undefined)
      if (isApiError(result)) {
        setDrawsError(result.error)
        setDrawFormSubmitting(false)
        return
      }
      closeDrawModal()
      await fetchDraws()
    }
    setDrawFormSubmitting(false)
  }

  const handleDeleteDraw = async (drawId: number) => {
    if (!window.confirm(`Delete draw #${drawId}? This cannot be undone.`)) return
    const result = await api.delete_draw(drawId)
    if (isApiError(result)) {
      setDrawsError(result.error)
    } else {
      await fetchDraws()
    }
  }

  // ---- Ticket modal handlers ----

  const openTicketModal = () => {
    setTicketForm({ ticket: '', type: ticketTab === 'blacklist' ? 'HALF' : 'JACKPOT' })
    setTicketModalOpen(true)
  }

  const closeTicketModal = () => {
    setTicketModalOpen(false)
    setTicketFormSubmitting(false)
  }

  const submitTicketForm = async () => {
    if (!selectedDrawId) return
    setTicketFormSubmitting(true)
    if (ticketTab === 'blacklist') {
      const result = await api.create_blacklist_ticket(selectedDrawId, ticketForm.ticket, ticketForm.type)
      if (isApiError(result)) {
        setTicketsError(result.error)
        setTicketFormSubmitting(false)
        return
      }
      closeTicketModal()
      await fetchTickets(selectedDrawId)
    } else {
      const result = await api.create_winning_ticket(selectedDrawId, ticketForm.ticket, ticketForm.type)
      if (isApiError(result)) {
        setTicketsError(result.error)
        setTicketFormSubmitting(false)
        return
      }
      closeTicketModal()
      await fetchTickets(selectedDrawId)
    }
    setTicketFormSubmitting(false)
  }

  const handleDeleteTicket = async (ticketId: number) => {
    if (!window.confirm(`Delete this ${ticketTab} ticket? This cannot be undone.`)) return
    const result =
      ticketTab === 'blacklist'
        ? await api.delete_blacklist_ticket(ticketId)
        : await api.delete_winning_ticket(ticketId)
    if (isApiError(result)) {
      setTicketsError(result.error)
    } else if (selectedDrawId) {
      await fetchTickets(selectedDrawId)
    }
  }

  // ---- Render ----

  const currentTickets = ticketTab === 'blacklist' ? blacklistTickets : winningTickets;
  const getTicketType = (t: BlacklistTicketResult | WinningTicketResult): string =>
    'restrictionType' in t ? t.restrictionType : t.prizeType;

  return (
    <>
      {/* ================================================================
          Main Draw Table — Column 4/13, Row 1/5
          ================================================================ */}
      <div
        className="card"
        style={{ gridColumn: '4 / 13', gridRow: '1 / 5', zIndex: 1, position: 'relative' }}
      >
        <div className="card__header">
          <span>Draws</span>
          <button className="btn btn--primary btn--sm" type="button" onClick={openInsertModal}>
            + Insert New Draw
          </button>
        </div>
        <div className="card__body" style={{ padding: 0 }}>
          {drawsLoading ? (
            <div className="draws__state">
              <span className="draws__spinner" />
              Loading draws...
            </div>
          ) : drawsError ? (
            <div className="draws__state draws__state--error">
              <span className="draws__state-icon">!</span>
              {drawsError}
              <button className="btn btn--sm" type="button" onClick={() => fetchDraws()} style={{ marginTop: '0.5rem' }}>
                Retry
              </button>
            </div>
          ) : (
            <div className="draws__split">
              {/* ---- Column A: List View ---- */}
              <div className="draws__list">
                {draws.length === 0 ? (
                  <div className="table__empty">
                    <div className="table__empty-icon">&mdash;</div>
                    <span>No draws found</span>
                  </div>
                ) : (
                  draws.map((draw) => (
                    <div
                      key={draw.id}
                      className={`draws__list-item${draw.id === selectedDrawId ? ' draws__list-item--active' : ''}`}
                      onClick={() => setSelectedDrawId(draw.id)}
                    >
                      <div className="draws__list-item-main">
                        <span className="draws__list-item-id">#{draw.id}</span>
                        <div className="draws__list-item-info">
                          <span className="draws__list-item-date">{draw.drawName}</span>
                          <span className="draws__list-item-cutoff">{draw.openedAt ? new Date(draw.openedAt).toLocaleString() : '—'}</span>
                        </div>
                        <span className={`draws__badge draws__badge--${draw.status.toLowerCase()}`}>
                          {draw.status}
                        </span>
                      </div>
                      <div className="draws__list-item-actions">
                        <button
                          className="icon-btn"
                          type="button"
                          title="Edit draw"
                          onClick={(e) => {
                            e.stopPropagation()
                            openEditModal(draw)
                          }}
                        >
                          <EditIcon />
                        </button>
                        <button
                          className="icon-btn icon-btn--danger"
                          type="button"
                          title="Delete draw"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteDraw(draw.id)
                          }}
                        >
                          <DeleteIcon />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* ---- Column B: Summary View ---- */}
              <div className="draws__summary">
                {selectedDraw ? (
                  <>
                    <div className="draws__summary-header">
                      <span className="draws__summary-title">Draw #{selectedDraw.id}</span>
                      <span className={`draws__badge draws__badge--${selectedDraw.status.toLowerCase()} draws__badge--lg`}>
                        {selectedDraw.status}
                      </span>
                    </div>
                    <dl className="draws__summary-dl">
                      <div className="draws__summary-row">
                        <dt>Draw Name</dt>
                        <dd>{selectedDraw.drawName}</dd>
                      </div>
                      <div className="draws__summary-row">
                        <dt>Opened At</dt>
                        <dd>{selectedDraw.openedAt ? new Date(selectedDraw.openedAt).toLocaleString() : '—'}</dd>
                      </div>
                      <div className="draws__summary-row">
                        <dt>House Holding</dt>
                        <dd className="telemetry">{selectedDraw.houseHoldingAmount.toLocaleString()}</dd>
                      </div>
                      <div className="draws__summary-row">
                        <dt>Notes</dt>
                        <dd>{selectedDraw.notes || <span className="text-muted">—</span>}</dd>
                      </div>
                    </dl>
                  </>
                ) : (
                  <div className="draws__state">Select a draw to view details.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================================================================
          Ticket Management Table — Column 4/13, Row 5/8
          ================================================================ */}
      <div
        className="card"
        style={{ gridColumn: '4 / 13', gridRow: '5 / 8', zIndex: 1, position: 'relative' }}
      >
        <div className="card__header">
          <div className="draws__tabs">
            <button
              className={`draws__tab${ticketTab === 'blacklist' ? ' draws__tab--active' : ''}`}
              type="button"
              onClick={() => setTicketTab('blacklist')}
            >
              Blacklist Tickets
            </button>
            <button
              className={`draws__tab${ticketTab === 'winning' ? ' draws__tab--active' : ''}`}
              type="button"
              onClick={() => setTicketTab('winning')}
            >
              Winning Tickets
            </button>
          </div>
          <button
            className="btn btn--primary btn--sm"
            type="button"
            onClick={openTicketModal}
            disabled={!selectedDrawId}
            title={!selectedDrawId ? 'Select a draw first' : undefined}
          >
            + {ticketTab === 'blacklist' ? 'Create Blacklist' : 'Create Winning'}
          </button>
        </div>
        <div className="card__body" style={{ padding: 0 }}>
          {!selectedDrawId ? (
            <div className="draws__state">Select a draw above to manage its tickets.</div>
          ) : ticketsLoading ? (
            <div className="draws__state">
              <span className="draws__spinner" />
              Loading tickets...
            </div>
          ) : ticketsError ? (
            <div className="draws__state draws__state--error">
              <span className="draws__state-icon">!</span>
              {ticketsError}
            </div>
          ) : currentTickets.length === 0 ? (
            <div className="table__empty">
              <div className="table__empty-icon">&mdash;</div>
              <span>No {ticketTab === 'blacklist' ? 'blacklist' : 'winning'} tickets found</span>
            </div>
          ) : (
            <div className="draws__ticket-table-wrapper">
              <table className="draws__ticket-table">
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>ID</th>
                    <th>Ticket</th>
                    <th>Type</th>
                    <th style={{ width: 80 }} />
                  </tr>
                </thead>
                <tbody>
                  {currentTickets.map((t) => (
                    <tr key={t.id}>
                      <td className="text-muted">#{t.id}</td>
                      <td className="table__cell--mono">{t.ticket}</td>
                      <td>
                        <span className="draws__badge draws__badge--ticket">{getTicketType(t)}</span>
                      </td>
                      <td>
                        <button
                          className="icon-btn icon-btn--danger"
                          type="button"
                          title={`Delete ${ticketTab === 'blacklist' ? 'blacklist' : 'winning'} ticket`}
                          onClick={() => handleDeleteTicket(t.id)}
                        >
                          <DeleteIcon />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ================================================================
          Draw Modal (Insert / Edit)
          ================================================================ */}
      {drawModalOpen && (
        <div className="modal-overlay" onClick={closeDrawModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <span>{drawFormMode === 'insert' ? 'Insert New Draw' : 'Edit Draw'}</span>
              <button className="icon-btn" type="button" title="Close" onClick={closeDrawModal}>
                <CloseIcon />
              </button>
            </div>
            <div className="modal__body">
              <label className="input-label">
                Draw Name
                <input
                  className="input"
                  type="text"
                  value={drawForm.drawName}
                  onChange={(e) => setDrawForm((f) => ({ ...f, drawName: e.target.value }))}
                  placeholder="e.g. 2026-05-31 Morning"
                />
              </label>
              <label className="input-label">
                House Holding Amount
                <input
                  className="input"
                  type="number"
                  value={drawForm.houseHoldingAmount}
                  onChange={(e) => setDrawForm((f) => ({ ...f, houseHoldingAmount: Number(e.target.value) }))}
                />
              </label>
              <label className="input-label">
                Notes
                <input
                  className="input"
                  type="text"
                  value={drawForm.notes}
                  onChange={(e) => setDrawForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional notes"
                />
              </label>
            </div>
            <div className="modal__footer">
              <button className="btn" type="button" onClick={closeDrawModal}>
                Cancel
              </button>
              <button
                className="btn btn--primary"
                type="button"
                onClick={submitDrawForm}
                disabled={drawFormSubmitting}
              >
                {drawFormSubmitting
                  ? 'Saving...'
                  : drawFormMode === 'insert'
                    ? 'Create Draw'
                    : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================
          Ticket Modal (Create Blacklist / Winning)
          ================================================================ */}
      {ticketModalOpen && (
        <div className="modal-overlay" onClick={closeTicketModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <span>
                {ticketTab === 'blacklist' ? 'Create Blacklist Ticket' : 'Create Winning Ticket'}
              </span>
              <button className="icon-btn" type="button" title="Close" onClick={closeTicketModal}>
                <CloseIcon />
              </button>
            </div>
            <div className="modal__body">
              <label className="input-label">
                Ticket Number
                <input
                  className="input"
                  type="text"
                  value={ticketForm.ticket}
                  onChange={(e) => setTicketForm((f) => ({ ...f, ticket: e.target.value }))}
                  placeholder="e.g. 12345"
                />
              </label>
              <label className="input-label">
                Type
                <select
                  className="select"
                  value={ticketForm.type}
                  onChange={(e) => setTicketForm((f) => ({ ...f, type: e.target.value }))}
                >
                  {ticketTab === 'blacklist' ? (
                    <>
                      <option value="HALF">HALF</option>
                      <option value="BLOCK">BLOCK</option>
                    </>
                  ) : (
                    <>
                      <option value="JACKPOT">JACKPOT</option>
                      <option value="MINOR">MINOR</option>
                    </>
                  )}
                </select>
              </label>
            </div>
            <div className="modal__footer">
              <button className="btn" type="button" onClick={closeTicketModal}>
                Cancel
              </button>
              <button
                className="btn btn--primary"
                type="button"
                onClick={submitTicketForm}
                disabled={ticketFormSubmitting || !ticketForm.ticket.trim()}
              >
                {ticketFormSubmitting ? 'Saving...' : 'Create Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
