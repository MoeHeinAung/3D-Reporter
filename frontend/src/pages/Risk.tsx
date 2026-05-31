import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/api/bridge'
import { isApiError } from '@/types'
import type { MasterDealer, OpenDrawInfo, TicketRisk, RiskBreakdown, OffloadConfig, OffloadRecord } from '@/types'
import KalawTemplate from '@/components/KalawTemplate'
import type { KalawEntry } from '@/components/KalawTemplate'

type TabId = 'holding' | 'offloaded' | 'pending' | 'history'

interface SelectedEntry extends KalawEntry {
  maxAmount: number
}

export default function Risk() {
  // -- Draw --
  const [openDraw, setOpenDraw] = useState<OpenDrawInfo | null>(null)
  const [drawLoading, setDrawLoading] = useState(true)

  // -- Master Dealers --
  const [dealers, setDealers] = useState<MasterDealer[]>([])
  const [dealersLoading, setDealersLoading] = useState(true)
  const [selectedDealerId, setSelectedDealerId] = useState<string>('')

  // -- Config --
  const [config, setConfig] = useState<OffloadConfig>({
    adminHold: 5000,
    maxOffloadAmount: 500000,
    maxOffloadTicket: 60,
    offloadPageNumber: 1,
  })
  const [configLoading, setConfigLoading] = useState(true)
  const [dirtyConfig, setDirtyConfig] = useState<Partial<OffloadConfig>>({})

  // -- Breakdown --
  const [breakdown, setBreakdown] = useState<RiskBreakdown | null>(null)
  const [breakdownLoading, setBreakdownLoading] = useState(false)
  const [breakdownError, setBreakdownError] = useState<string | null>(null)

  // -- History --
  const [history, setHistory] = useState<OffloadRecord[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // -- Tabs --
  const [activeTab, setActiveTab] = useState<TabId>('pending')

  // -- Pending selection --
  const [selectedTickets, setSelectedTickets] = useState<Map<string, SelectedEntry>>(new Map())

  // -- KALAW export --
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const templateRef = useRef<HTMLDivElement>(null)
  const [templateData, setTemplateData] = useState<{
    entries: KalawEntry[]
    pageNumber: number
  } | null>(null)

  // -- Note --
  const [offloadNote, setOffloadNote] = useState('')

  // ---- Derived ----
  const currentConfig = { ...config, ...dirtyConfig }
  const selectedTotal = Array.from(selectedTickets.values()).reduce((s, e) => s + e.amount, 0)
  const canOffload = selectedDealerId && openDraw && selectedTickets.size > 0 && !exporting

  // ---- Fetch draw ----
  const fetchDraw = useCallback(async () => {
    setDrawLoading(true)
    const result = await api.get_open_draw()
    if (result === null) {
      setOpenDraw(null)
    } else if (isApiError(result)) {
      setOpenDraw(null)
    } else {
      setOpenDraw(result)
    }
    setDrawLoading(false)
  }, [])

  // ---- Fetch dealers ----
  const fetchDealers = useCallback(async () => {
    setDealersLoading(true)
    const result = await api.get_all_master_dealers()
    if (isApiError(result)) {
      setDealers([])
    } else {
      setDealers(result)
      if (result.length > 0 && !selectedDealerId) {
        setSelectedDealerId(result[0].id)
      }
    }
    setDealersLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Fetch config ----
  const fetchConfig = useCallback(async () => {
    setConfigLoading(true)
    const result = await api.get_offload_config()
    if (!isApiError(result)) {
      setConfig(result)
    }
    setConfigLoading(false)
  }, [])

  // ---- Fetch breakdown ----
  const fetchBreakdown = useCallback(async (drawId: number) => {
    setBreakdownLoading(true)
    setBreakdownError(null)
    const result = await api.get_risk_breakdown(drawId)
    if (isApiError(result)) {
      setBreakdownError(result.error)
      setBreakdown(null)
    } else {
      setBreakdown(result)
    }
    setBreakdownLoading(false)
  }, [])

  // ---- Fetch history ----
  const fetchHistory = useCallback(async (drawId: number) => {
    setHistoryLoading(true)
    const result = await api.get_offload_history(drawId)
    if (!isApiError(result)) {
      setHistory(result)
    }
    setHistoryLoading(false)
  }, [])

  // ---- Init ----
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDraw()
    fetchDealers()
    fetchConfig()
  }, [fetchDraw, fetchDealers, fetchConfig])

  useEffect(() => {
    if (openDraw) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchBreakdown(openDraw.id)
      fetchHistory(openDraw.id)
    }
  }, [openDraw, fetchBreakdown, fetchHistory])

  // Reset selection when tab or breakdown changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedTickets(new Map())
    setExportError(null)
  }, [activeTab, breakdown])

  // Sync page number from config
  useEffect(() => {
    if (config.offloadPageNumber && !dirtyConfig.offloadPageNumber) {
      // keep in sync
    }
  }, [config.offloadPageNumber]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Config helpers ----
  const updateConfig = async (key: keyof OffloadConfig, value: number) => {
    setDirtyConfig((prev) => ({ ...prev, [key]: value }))
    const result = await api.update_offload_config(key, String(value))
    if (!isApiError(result)) {
      setConfig((prev) => ({ ...prev, [key]: value }))
      setDirtyConfig((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  // ---- Selection helpers ----
  const toggleTicket = (ticket: TicketRisk) => {
    setSelectedTickets((prev) => {
      const next = new Map(prev)
      if (next.has(ticket.ticket)) {
        next.delete(ticket.ticket)
      } else {
        const maxAmount = Math.min(ticket.pending, currentConfig.maxOffloadAmount)
        next.set(ticket.ticket, { ticket: ticket.ticket, amount: maxAmount, maxAmount })
      }
      return next
    })
  }

  const selectAllPending = () => {
    if (!breakdown) return
    setSelectedTickets((prev) => {
      const next = new Map(prev)
      for (const t of breakdown.pending) {
        if (!next.has(t.ticket)) {
          const maxAmount = Math.min(t.pending, currentConfig.maxOffloadAmount)
          next.set(t.ticket, { ticket: t.ticket, amount: maxAmount, maxAmount })
        }
      }
      return next
    })
  }

  const deselectAllPending = () => {
    setSelectedTickets(new Map())
  }

  const updateOffloadAmount = (ticket: string, amount: number) => {
    setSelectedTickets((prev) => {
      const next = new Map(prev)
      const existing = next.get(ticket)
      if (existing) {
        next.set(ticket, { ...existing, amount: Math.max(1, Math.min(amount, existing.maxAmount)) })
      }
      return next
    })
  }

  // ---- Export workflow ----
  const handlePerformOffload = async () => {
    if (!openDraw || !selectedDealerId || selectedTickets.size === 0) return

    setExporting(true)
    setExportError(null)

    const entries = Array.from(selectedTickets.values()).map((e) => ({
      ticket: e.ticket,
      amount: e.amount,
    }))
    const pageNumber = currentConfig.offloadPageNumber

    const result = await api.create_offload(
      openDraw.id,
      selectedDealerId,
      JSON.stringify(entries),
      String(pageNumber),
      offloadNote || undefined,
    )

    if (isApiError(result)) {
      setExportError(result.error)
      setExporting(false)
      return
    }

    // Show KALAW template for capture
    setTemplateData({ entries, pageNumber })

    // Wait for render, then capture with html2canvas
    setTimeout(async () => {
      try {
        const html2canvas = (await import('html2canvas')).default
        if (templateRef.current) {
          const canvas = await html2canvas(templateRef.current, {
            backgroundColor: '#ffffff',
            scale: 2,
            useCORS: true,
          })
          // Download PNG
          const link = document.createElement('a')
          link.download = `KALAW_Draw${openDraw.id}_Page${pageNumber}.png`
          link.href = canvas.toDataURL('image/png')
          link.click()
        }
      } catch (err) {
        console.error('html2canvas capture failed:', err)
      }

      // Advance page number
      const nextPage = pageNumber + 1
      await api.update_offload_config('offload_page_number', String(nextPage))
      setConfig((prev) => ({ ...prev, offloadPageNumber: nextPage }))

      // Cleanup and refresh
      setTemplateData(null)
      setSelectedTickets(new Map())
      setExporting(false)
      setOffloadNote('')

      // Refresh breakdown and history
      if (openDraw) {
        fetchBreakdown(openDraw.id)
        fetchHistory(openDraw.id)
      }
    }, 100)
  }

  // ---- Render helpers ----

  const renderTabButton = (id: TabId, label: string, count?: number) => (
    <button
      className={`btn ${activeTab === id ? 'btn--primary' : ''}`}
      onClick={() => setActiveTab(id)}
      style={{ marginRight: 'var(--space-2)' }}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span style={{ marginLeft: 6, opacity: 0.7, fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)' }}>({count})</span>
      )}
    </button>
  )

  const renderConfigInput = (
    label: string,
    key: keyof OffloadConfig,
    value: number,
    min?: number,
  ) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label className="input-label">{label}</label>
      <input
        type="number"
        className="input"
        value={value}
        min={min ?? 0}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10)
          if (!isNaN(v)) updateConfig(key, v)
        }}
        style={{ width: 130 }}
      />
    </div>
  )

  const renderTicketRow = (
    t: TicketRisk,
    extra?: { checkbox?: boolean; checked?: boolean; onToggle?: () => void; amountInput?: { value: number; max: number; onChange: (v: number) => void } },
  ) => (
    <tr key={t.ticket}>
      {extra?.checkbox !== undefined && (
        <td style={{ width: 32 }}>
          <input
            type="checkbox"
            checked={extra.checked ?? false}
            onChange={extra.onToggle}
          />
        </td>
      )}
      <td className="table__cell--mono" style={{ fontWeight: 600 }}>{t.ticket}</td>
      <td className="table__cell--numeric">{t.totalSales.toLocaleString()}</td>
      <td className="table__cell--numeric">{t.holding.toLocaleString()}</td>
      <td className="table__cell--numeric">{t.offloaded.toLocaleString()}</td>
      <td className="table__cell--numeric" style={{ fontWeight: t.pending > 0 ? 600 : 400, color: t.pending > 0 ? 'var(--color-warning, #f0a020)' : undefined }}>
        {t.pending.toLocaleString()}
      </td>
      {extra?.amountInput && (
        (() => {
          const amtInput = extra.amountInput
          return (
            <td>
              <input
                type="number"
                className="input"
                value={amtInput.value}
                min={1}
                max={amtInput.max}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10)
                  if (!isNaN(v)) amtInput.onChange(v)
                }}
                style={{ width: 100, textAlign: 'right', fontFamily: 'var(--font-mono)' }}
              />
            </td>
          )
        })()
      )}
      {t.isBlocked && (
        <td style={{ color: 'var(--color-error)', fontSize: 'var(--text-xs)', fontWeight: 600 }}>BLOCKED</td>
      )}
    </tr>
  )

  // ---- Main render ----

  if (drawLoading || configLoading) {
    return (
      <div className="card" style={{ gridColumn: 'span 12', gridRow: 'span 8', zIndex: 1, position: 'relative' }}>
        <div className="card__header">Risk</div>
        <div className="card__body">
          <div className="text-muted" style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
            Loading...
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="card" style={{ gridColumn: 'span 12', gridRow: 'span 8', zIndex: 1, position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* ---- Header ---- */}
        <div className="card__header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <span>Risk Management</span>
          {openDraw && (
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
              Draw #{openDraw.id} &mdash; {openDraw.drawName}
            </span>
          )}
        </div>

        {/* ---- Config Bar ---- */}
        <div style={{ padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--color-glass-border)', display: 'flex', alignItems: 'flex-end', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
          {/* Master Dealer */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label className="input-label">Master Dealer</label>
            {dealersLoading ? (
              <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>Loading...</span>
            ) : dealers.length === 0 ? (
              <span style={{ color: 'var(--color-error)', fontSize: 'var(--text-xs)' }}>No master dealers — add one in Partners</span>
            ) : (
              <select
                className="select"
                value={selectedDealerId}
                onChange={(e) => setSelectedDealerId(e.target.value)}
                style={{ width: 180 }}
              >
                {dealers.map((d) => (
                  <option key={d.id} value={d.id}>{d.id} &mdash; {d.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Draw status */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label className="input-label">Draw</label>
            {openDraw ? (
              <span style={{ fontSize: 'var(--text-sm)', fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}>
                #{openDraw.id} OPEN
              </span>
            ) : (
              <span style={{ color: 'var(--color-warning, #f0a020)', fontSize: 'var(--text-xs)' }}>
                No open draw
              </span>
            )}
          </div>

          {/* Config inputs */}
          {renderConfigInput('Hold Amt', 'adminHold', currentConfig.adminHold, 0)}
          {renderConfigInput('Max Offload Amt', 'maxOffloadAmount', currentConfig.maxOffloadAmount, 1)}
          {renderConfigInput('Max Tickets', 'maxOffloadTicket', currentConfig.maxOffloadTicket, 1)}

          {/* Refresh */}
          <button
            className="btn"
            onClick={() => {
              if (openDraw) {
                fetchBreakdown(openDraw.id)
                fetchHistory(openDraw.id)
              }
              fetchConfig()
              fetchDraw()
            }}
            style={{ marginBottom: 0 }}
          >
            Refresh
          </button>
        </div>

        {/* ---- Tabs ---- */}
        <div style={{ padding: 'var(--space-3) var(--space-4) 0' }}>
          {renderTabButton('pending', 'Pending', breakdown?.pending.length)}
          {renderTabButton('holding', 'Holding', breakdown?.holding.length)}
          {renderTabButton('offloaded', 'Offloaded', breakdown?.offloaded.length)}
          {renderTabButton('history', 'History')}
        </div>

        {/* ---- Tab Content ---- */}
        <div className="card__body" style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          {breakdownLoading && (
            <div className="text-muted" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>Loading breakdown...</div>
          )}
          {breakdownError && (
            <div style={{ color: 'var(--color-error)', textAlign: 'center', padding: 'var(--space-6)' }}>{breakdownError}</div>
          )}

          {!breakdownLoading && !breakdownError && breakdown && (
            <>
              {/* Pending Tab */}
              {activeTab === 'pending' && (
                <>
                  <div style={{ marginBottom: 'var(--space-3)', display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                    <button className="btn btn--sm" onClick={selectAllPending}>Select All</button>
                    <button className="btn btn--sm" onClick={deselectAllPending}>Deselect All</button>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                      {selectedTickets.size} of {breakdown.pending.length} selected
                    </span>
                  </div>
                  {breakdown.pending.length === 0 ? (
                    <div className="text-muted" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
                      No pending tickets. All liability is within hold limits.
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--color-glass-border)' }}>
                            <th style={{ width: 32 }}></th>
                            <th style={thStyle}>Ticket</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>Total Sales</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>Holding</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>Offloaded</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>Pending</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>Offload Amt</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {breakdown.pending.map((t) => {
                            const sel = selectedTickets.get(t.ticket)
                            return renderTicketRow(t, {
                              checkbox: true,
                              checked: sel !== undefined,
                              onToggle: () => toggleTicket(t),
                              amountInput: sel
                                ? { value: sel.amount, max: sel.maxAmount, onChange: (v) => updateOffloadAmount(t.ticket, v) }
                                : undefined,
                            })
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

              {/* Holding Tab */}
              {activeTab === 'holding' && (
                <>
                  {breakdown.holding.length === 0 ? (
                    <div className="text-muted" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
                      No tickets in holding.
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--color-glass-border)' }}>
                            <th style={thStyle}>Ticket</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>Total Sales</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>Holding</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>Offloaded</th>
                          </tr>
                        </thead>
                        <tbody>
                          {breakdown.holding.map((t) => renderTicketRow(t))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

              {/* Offloaded Tab */}
              {activeTab === 'offloaded' && (
                <>
                  {breakdown.offloaded.length === 0 ? (
                    <div className="text-muted" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
                      No tickets have been offloaded yet.
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--color-glass-border)' }}>
                            <th style={thStyle}>Ticket</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>Total Sales</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>Holding</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>Offloaded</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>Pending</th>
                          </tr>
                        </thead>
                        <tbody>
                          {breakdown.offloaded.map((t) => renderTicketRow(t))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

              {/* History Tab */}
              {activeTab === 'history' && (
                <>
                  {historyLoading ? (
                    <div className="text-muted" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>Loading history...</div>
                  ) : history.length === 0 ? (
                    <div className="text-muted" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
                      No offload transactions recorded.
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--color-glass-border)' }}>
                            <th style={thStyle}>Page</th>
                            <th style={thStyle}>Ticket</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>Amount</th>
                            <th style={thStyle}>Dealer</th>
                            <th style={thStyle}>Date</th>
                            <th style={thStyle}>Note</th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.map((r) => (
                            <tr key={r.id}>
                              <td style={tdStyle}>{r.pageNo}</td>
                              <td className="table__cell--mono" style={tdStyle}>{r.ticket}</td>
                              <td className="table__cell--numeric" style={tdStyle}>{r.amount.toLocaleString()}</td>
                              <td style={tdStyle}>{r.masterDealerId}</td>
                              <td style={{ ...tdStyle, fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                                {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '-'}
                              </td>
                              <td style={{ ...tdStyle, fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                                {r.notes || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {!breakdownLoading && !breakdownError && !breakdown && (
            <div className="text-muted" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
              {openDraw ? 'No sales data available.' : 'Open a draw and record sales to see risk breakdown.'}
            </div>
          )}
        </div>

        {/* ---- Action Footer (Pending tab only) ---- */}
        {activeTab === 'pending' && (
          <div style={{ padding: 'var(--space-3) var(--space-4)', borderTop: '1px solid var(--color-glass-border)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label className="input-label">Note (optional)</label>
                <input
                  type="text"
                  className="input"
                  value={offloadNote}
                  onChange={(e) => setOffloadNote(e.target.value)}
                  placeholder="Offload note..."
                  style={{ width: 200 }}
                />
              </div>
            </div>

            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                {selectedTickets.size} tickets &middot; {selectedTotal.toLocaleString()} Ks
              </span>
              <button
                className="btn btn--special"
                disabled={!canOffload}
                onClick={handlePerformOffload}
              >
                {exporting ? 'Processing...' : 'Perform Offload'}
              </button>
            </div>

            {exportError && (
              <div style={{ width: '100%', color: 'var(--color-error)', fontSize: 'var(--text-xs)' }}>
                {exportError}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hidden KALAW template for html2canvas capture */}
      {templateData && openDraw && (
        <KalawTemplate
          ref={templateRef}
          entries={templateData.entries}
          drawDate={openDraw.drawName}
          drawId={openDraw.id}
          pageNumber={templateData.pageNumber}
          masterDealerName={dealers.find((d) => d.id === selectedDealerId)?.name ?? selectedDealerId}
          note={offloadNote || null}
        />
      )}
    </>
  )
}

const thStyle: React.CSSProperties = {
  padding: 'var(--space-2) var(--space-3)',
  textAlign: 'left',
  fontWeight: 600,
  fontSize: 'var(--text-xs)',
  color: 'var(--color-text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  whiteSpace: 'nowrap',
}

const tdStyle: React.CSSProperties = {
  padding: 'var(--space-2) var(--space-3)',
  borderBottom: '1px solid var(--color-glass-border)',
  verticalAlign: 'middle',
}
