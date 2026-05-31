import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/bridge'
import { isApiError } from '../types'
import type { Agent, MasterDealer } from '../types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PartnerTab = 'agents' | 'dealers'

interface PartnerFormData {
  id: string
  name: string
  commission: number
  jpFactor: number
  spFactor: number
  note: string
}

const EMPTY_FORM: PartnerFormData = {
  id: '',
  name: '',
  commission: 0,
  jpFactor: 0,
  spFactor: 0,
  note: '',
}

// ---------------------------------------------------------------------------
// Inline SVG Icons
// ---------------------------------------------------------------------------

function EditIcon() {
  return (
    <svg className="icon-btn__svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11.5 2.5l2 2L5 13H3v-2L11.5 2.5z" />
      <path d="M10 4l2 2" />
    </svg>
  )
}

function DeleteIcon() {
  return (
    <svg className="icon-btn__svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
    <svg className="icon-btn__svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M3 3l10 10M13 3L3 13" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Partners Page
// ---------------------------------------------------------------------------

export default function Partners() {
  // -- tab --
  const [tab, setTab] = useState<PartnerTab>('agents')

  // -- agents state --
  const [agents, setAgents] = useState<Agent[]>([])
  const [agentsLoading, setAgentsLoading] = useState(true)
  const [agentsError, setAgentsError] = useState<string | null>(null)

  // -- dealers state --
  const [dealers, setDealers] = useState<MasterDealer[]>([])
  const [dealersLoading, setDealersLoading] = useState(true)
  const [dealersError, setDealersError] = useState<string | null>(null)

  // -- modal state --
  const [modalOpen, setModalOpen] = useState(false)
  const [formMode, setFormMode] = useState<'insert' | 'edit'>('insert')
  const [form, setForm] = useState<PartnerFormData>(EMPTY_FORM)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // ---- Fetch ----

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
  }, [])

  const fetchDealers = useCallback(async () => {
    setDealersLoading(true)
    setDealersError(null)
    const result = await api.get_all_master_dealers()
    if (isApiError(result)) {
      setDealersError(result.error)
    } else {
      setDealers(result)
    }
    setDealersLoading(false)
  }, [])

  useEffect(() => {
    fetchAgents()
  }, [fetchAgents])

  useEffect(() => {
    fetchDealers()
  }, [fetchDealers])

  const fetchCurrent = () => {
    if (tab === 'agents') fetchAgents()
    else fetchDealers()
  }

  // ---- Modal handlers ----

  const openInsertModal = () => {
    setFormMode('insert')
    setForm(EMPTY_FORM)
    setEditingId(null)
    setModalOpen(true)
  }

  const openEditModal = (item: Agent | MasterDealer) => {
    setFormMode('edit')
    setForm({
      id: item.id,
      name: item.name,
      commission: item.commission,
      jpFactor: item.jpFactor,
      spFactor: item.spFactor,
      note: item.note ?? '',
    })
    setEditingId(item.id)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setFormSubmitting(false)
  }

  const submitForm = async () => {
    setFormSubmitting(true)
    if (tab === 'agents') {
      if (formMode === 'insert') {
        const result = await api.create_agent(form.id, form.name, form.commission, form.jpFactor, form.spFactor, form.note || undefined)
        if (isApiError(result)) { setAgentsError(result.error); setFormSubmitting(false); return }
        closeModal()
        await fetchAgents()
      } else if (editingId) {
        const result = await api.update_agent(editingId, form.name, form.commission, form.jpFactor, form.spFactor, form.note || undefined)
        if (isApiError(result)) { setAgentsError(result.error); setFormSubmitting(false); return }
        closeModal()
        await fetchAgents()
      }
    } else {
      if (formMode === 'insert') {
        const result = await api.create_master_dealer(form.id, form.name, form.commission, form.jpFactor, form.spFactor, form.note || undefined)
        if (isApiError(result)) { setDealersError(result.error); setFormSubmitting(false); return }
        closeModal()
        await fetchDealers()
      } else if (editingId) {
        const result = await api.update_master_dealer(editingId, form.name, form.commission, form.jpFactor, form.spFactor, form.note || undefined)
        if (isApiError(result)) { setDealersError(result.error); setFormSubmitting(false); return }
        closeModal()
        await fetchDealers()
      }
    }
    setFormSubmitting(false)
  }

  const handleDelete = async (id: string) => {
    const result = tab === 'agents' ? await api.delete_agent(id) : await api.delete_master_dealer(id)
    if (isApiError(result)) {
      if (tab === 'agents') setAgentsError(result.error)
      else setDealersError(result.error)
    } else {
      fetchCurrent()
    }
  }

  // ---- Derived ----

  const data = tab === 'agents' ? agents : dealers
  const loading = tab === 'agents' ? agentsLoading : dealersLoading
  const error = tab === 'agents' ? agentsError : dealersError
  const label = tab === 'agents' ? 'Agent' : 'Master Dealer'

  // ---- Render ----

  return (
    <>
      {/* ================================================================
          Partners Table — Column 4/13, Row 2/8
          ================================================================ */}
      <div
        className="card"
        style={{ gridColumn: '4 / 13', gridRow: '1 / 8', zIndex: 1, position: 'relative' }}
      >
        <div className="card__header">
          <div className="draws__tabs">
            <button
              className={`draws__tab${tab === 'agents' ? ' draws__tab--active' : ''}`}
              type="button"
              onClick={() => setTab('agents')}
            >
              Agent Table
            </button>
            <button
              className={`draws__tab${tab === 'dealers' ? ' draws__tab--active' : ''}`}
              type="button"
              onClick={() => setTab('dealers')}
            >
              Master Dealer Table
            </button>
          </div>
          <button className="btn btn--primary btn--sm" type="button" onClick={openInsertModal}>
            + Insert {label}
          </button>
        </div>
        <div className="card__body" style={{ padding: 0 }}>
          {loading ? (
            <div className="draws__state">
              <span className="draws__spinner" />
              Loading {label.toLowerCase()}s...
            </div>
          ) : error ? (
            <div className="draws__state draws__state--error">
              <span className="draws__state-icon">!</span>
              {error}
              <button className="btn btn--sm" type="button" onClick={fetchCurrent} style={{ marginTop: '0.5rem' }}>
                Retry
              </button>
            </div>
          ) : (
            <div className="draws__ticket-table-wrapper">
              <table className="draws__ticket-table">
                <thead>
                  <tr>
                    <th style={{ width: 72 }}>ID</th>
                    <th>Name</th>
                    <th style={{ width: 100 }}>Commission</th>
                    <th style={{ width: 90 }}>JP Factor</th>
                    <th style={{ width: 90 }}>SP Factor</th>
                    <th>Note</th>
                    <th style={{ width: 72 }} />
                  </tr>
                </thead>
                <tbody>
                  {data.map((item) => (
                    <tr key={item.id}>
                      <td className="table__cell--mono">{item.id}</td>
                      <td>{item.name}</td>
                      <td className="table__cell--numeric">{item.commission.toLocaleString()}</td>
                      <td className="table__cell--numeric">{item.jpFactor}</td>
                      <td className="table__cell--numeric">{item.spFactor}</td>
                      <td className="text-muted" style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.note || '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                          <button
                            className="icon-btn"
                            type="button"
                            title={`Edit ${label.toLowerCase()}`}
                            onClick={() => openEditModal(item)}
                          >
                            <EditIcon />
                          </button>
                          <button
                            className="icon-btn icon-btn--danger"
                            type="button"
                            title={`Delete ${label.toLowerCase()}`}
                            onClick={() => handleDelete(item.id)}
                          >
                            <DeleteIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {data.length === 0 && (
                    <tr>
                      <td colSpan={7} className="draws__state" style={{ padding: 'var(--space-5)' }}>
                        No {label.toLowerCase()}s found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ================================================================
          Partner Modal (Insert / Edit)
          ================================================================ */}
      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <span>{formMode === 'insert' ? `Insert ${label}` : `Edit ${label}`}</span>
              <button className="icon-btn" type="button" title="Close" onClick={closeModal}>
                <CloseIcon />
              </button>
            </div>
            <div className="modal__body">
              <label className="input-label">
                ID
                <input
                  className="input"
                  type="text"
                  value={form.id}
                  onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
                  placeholder="e.g. A01"
                  disabled={formMode === 'edit'}
                  maxLength={3}
                />
              </label>
              <label className="input-label">
                Name
                <input
                  className="input"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. John Doe"
                />
              </label>
              <label className="input-label">
                Commission
                <input
                  className="input"
                  type="number"
                  value={form.commission}
                  onChange={(e) => setForm((f) => ({ ...f, commission: Number(e.target.value) }))}
                />
              </label>
              <label className="input-label">
                JP Factor
                <input
                  className="input"
                  type="number"
                  value={form.jpFactor}
                  onChange={(e) => setForm((f) => ({ ...f, jpFactor: Number(e.target.value) }))}
                />
              </label>
              <label className="input-label">
                SP Factor
                <input
                  className="input"
                  type="number"
                  value={form.spFactor}
                  onChange={(e) => setForm((f) => ({ ...f, spFactor: Number(e.target.value) }))}
                />
              </label>
              <label className="input-label">
                Note
                <input
                  className="input"
                  type="text"
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  placeholder="Optional note"
                />
              </label>
            </div>
            <div className="modal__footer">
              <button className="btn" type="button" onClick={closeModal}>
                Cancel
              </button>
              <button
                className="btn btn--primary"
                type="button"
                onClick={submitForm}
                disabled={formSubmitting || !form.id.trim() || !form.name.trim()}
              >
                {formSubmitting ? 'Saving...' : formMode === 'insert' ? `Create ${label}` : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
