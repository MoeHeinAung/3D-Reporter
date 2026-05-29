import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/api/bridge'
import { isApiError } from '@/types'
import type { OpenDrawInfo, ReportData } from '@/types'

export default function Report() {
  const [draws, setDraws] = useState<OpenDrawInfo[]>([])
  const [selectedDrawId, setSelectedDrawId] = useState<number | null>(null)
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const reportRef = useRef<HTMLDivElement>(null)
  const exportRef = useRef<HTMLDivElement>(null)

  // Load all draws for the selector
  const loadDraws = useCallback(async () => {
    const result = await api.get_all_draws()
    if (isApiError(result)) {
      setError(result.error)
      return
    }
    setDraws(result)
  }, [])

  useEffect(() => {
    loadDraws()
  }, [loadDraws])

  // Generate report when draw is selected
  const generateReport = useCallback(async (drawId: number) => {
    setLoading(true)
    setError(null)
    setReport(null)

    const result = await api.generate_report(drawId)
    if (isApiError(result)) {
      setError(result.error)
      setLoading(false)
      return
    }
    setReport(result)
    setLoading(false)
  }, [])

  const handleDrawChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = parseInt(e.target.value, 10)
    setSelectedDrawId(id)
    if (id) {
      setReport(null)
    }
  }

  const handleGenerate = () => {
    if (selectedDrawId) {
      generateReport(selectedDrawId)
    }
  }

  // Export as PNG
  const handleExport = async () => {
    if (!exportRef.current) return
    setExporting(true)

    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: '#0A0B0E',
        scale: 2,
        useCORS: true,
      })
      const link = document.createElement('a')
      const drawId = report?.drawId ?? 'report'
      link.download = `Report_Draw${drawId}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      console.error('html2canvas export failed:', err)
    }

    setExporting(false)
  }

  // Build export template content (hidden, used for html2canvas capture)
  const exportTemplate = report ? (
    <div ref={exportRef} className="report__export-template" style={{ padding: '24px' }}>
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <h2 style={{ color: '#00F0FF', fontFamily: 'Tektur', fontSize: '20px', margin: 0 }}>
          FINANCIAL REPORT — DRAW {report.drawId}
        </h2>
        <p style={{ color: '#888', fontFamily: 'Instrument Sans', fontSize: '12px', margin: '4px 0 0' }}>
          Status: {report.drawStatus} | {report.hasWinningTickets ? 'Winners Declared' : 'No Winners'}
        </p>
      </div>

      {/* Agent Section */}
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ color: '#00F0FF', fontFamily: 'Tektur', fontSize: '14px', borderBottom: '1px solid #2D323E', paddingBottom: '4px', margin: '0 0 8px' }}>
          AGENT SECTION
        </h3>
        {report.agents.length === 0 ? (
          <p style={{ color: '#666', fontSize: '12px' }}>No sales data.</p>
        ) : (
          report.agents.map((a) => (
            <div key={a.agentId} style={{ marginBottom: '12px', padding: '8px', border: '1px solid #2D323E', borderRadius: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'JetBrains Mono', fontSize: '11px', marginBottom: '4px' }}>
                <strong style={{ color: '#00F0FF' }}>{a.agentName} ({a.agentId})</strong>
              </div>
              <table style={{ width: '100%', fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#ccc', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '2px 8px' }}>Total Sale Amount</td>
                    <td style={{ padding: '2px 8px', textAlign: 'right' }}>{a.totalSaleAmount.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '2px 8px' }}>Commission Paid</td>
                    <td style={{ padding: '2px 8px', textAlign: 'right' }}>{a.commissionPaid.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '2px 8px', borderTop: '1px solid #2D323E', color: '#00F0FF' }}>Subtotal</td>
                    <td style={{ padding: '2px 8px', textAlign: 'right', borderTop: '1px solid #2D323E', color: '#00F0FF' }}>{a.subtotal.toLocaleString()}</td>
                  </tr>
                  {a.winningTickets.length > 0 && (
                    <>
                      <tr><td colSpan={2} style={{ padding: '4px 8px 0', color: '#8A2BE2', fontSize: '10px' }}>Winning Tickets:</td></tr>
                      {a.winningTickets.map((wt, i) => (
                        <tr key={i}>
                          <td style={{ padding: '2px 8px 2px 16px', color: '#8A2BE2' }}>
                            {wt.ticket} ({wt.type}{wt.isHalfBlacklisted ? ', HALF' : ''})
                          </td>
                          <td style={{ padding: '2px 8px', textAlign: 'right', color: '#8A2BE2' }}>
                            Amt: {wt.amount.toLocaleString()} / Pay: {wt.payout.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </>
                  )}
                  <tr>
                    <td style={{ padding: '4px 8px', borderTop: '2px solid #00F0FF', fontWeight: 'bold', color: '#00F0FF' }}>Total</td>
                    <td style={{ padding: '4px 8px', textAlign: 'right', borderTop: '2px solid #00F0FF', fontWeight: 'bold', color: '#00F0FF' }}>{a.total.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>

      {/* Dealer Section */}
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ color: '#00F0FF', fontFamily: 'Tektur', fontSize: '14px', borderBottom: '1px solid #2D323E', paddingBottom: '4px', margin: '0 0 8px' }}>
          MASTER DEALER SECTION
        </h3>
        {report.dealers.length === 0 ? (
          <p style={{ color: '#666', fontSize: '12px' }}>No offload data.</p>
        ) : (
          report.dealers.map((d) => (
            <div key={d.dealerId} style={{ marginBottom: '12px', padding: '8px', border: '1px solid #2D323E', borderRadius: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'JetBrains Mono', fontSize: '11px', marginBottom: '4px' }}>
                <strong style={{ color: '#00F0FF' }}>{d.dealerName} ({d.dealerId})</strong>
              </div>
              <table style={{ width: '100%', fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#ccc', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '2px 8px' }}>Total Offloaded Amount</td>
                    <td style={{ padding: '2px 8px', textAlign: 'right' }}>{d.totalOffloadedAmount.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '2px 8px' }}>Commission to Admin/House</td>
                    <td style={{ padding: '2px 8px', textAlign: 'right' }}>{d.commissionToAdmin.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '2px 8px', borderTop: '1px solid #2D323E', color: '#00F0FF' }}>Subtotal</td>
                    <td style={{ padding: '2px 8px', textAlign: 'right', borderTop: '1px solid #2D323E', color: '#00F0FF' }}>{d.subtotal.toLocaleString()}</td>
                  </tr>
                  {d.winningTickets.length > 0 && (
                    <>
                      <tr><td colSpan={2} style={{ padding: '4px 8px 0', color: '#8A2BE2', fontSize: '10px' }}>Winning Tickets:</td></tr>
                      {d.winningTickets.map((wt, i) => (
                        <tr key={i}>
                          <td style={{ padding: '2px 8px 2px 16px', color: '#8A2BE2' }}>
                            {wt.ticket} ({wt.type}{wt.isHalfBlacklisted ? ', HALF' : ''})
                          </td>
                          <td style={{ padding: '2px 8px', textAlign: 'right', color: '#8A2BE2' }}>
                            Amt: {wt.amount.toLocaleString()} / Pay: {wt.payout.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </>
                  )}
                  <tr>
                    <td style={{ padding: '4px 8px', borderTop: '2px solid #00F0FF', fontWeight: 'bold', color: '#00F0FF' }}>Total</td>
                    <td style={{ padding: '4px 8px', textAlign: 'right', borderTop: '2px solid #00F0FF', fontWeight: 'bold', color: '#00F0FF' }}>{d.total.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>

      {/* Admin/House Section */}
      <div>
        <h3 style={{ color: '#00F0FF', fontFamily: 'Tektur', fontSize: '14px', borderBottom: '1px solid #2D323E', paddingBottom: '4px', margin: '0 0 8px' }}>
          ADMIN/HOUSE CONSOLIDATED
        </h3>
        <table style={{ width: '100%', fontFamily: 'JetBrains Mono', fontSize: '12px', color: '#ccc', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ padding: '3px 8px' }}>Total Sales Amount (All Agents)</td>
              <td style={{ padding: '3px 8px', textAlign: 'right' }}>{report.admin.totalSalesAmount.toLocaleString()}</td>
            </tr>
            <tr>
              <td style={{ padding: '3px 8px' }}>Total Commission Payable (All Agents)</td>
              <td style={{ padding: '3px 8px', textAlign: 'right' }}>{report.admin.totalCommissionPayable.toLocaleString()}</td>
            </tr>
            <tr>
              <td style={{ padding: '3px 8px', borderTop: '1px solid #2D323E', color: '#00F0FF' }}>Subtotal</td>
              <td style={{ padding: '3px 8px', textAlign: 'right', borderTop: '1px solid #2D323E', color: '#00F0FF' }}>{report.admin.subtotalSales.toLocaleString()}</td>
            </tr>
            <tr>
              <td style={{ padding: '6px 8px 3px' }}>Total Offloaded Amount (All Dealers)</td>
              <td style={{ padding: '6px 8px 3px', textAlign: 'right' }}>{report.admin.totalOffloadedAmount.toLocaleString()}</td>
            </tr>
            <tr>
              <td style={{ padding: '3px 8px' }}>Commission from Master Dealers</td>
              <td style={{ padding: '3px 8px', textAlign: 'right' }}>{report.admin.totalCommissionFromMd.toLocaleString()}</td>
            </tr>
            <tr>
              <td style={{ padding: '3px 8px', borderTop: '1px solid #2D323E', color: '#00F0FF' }}>Subtotal</td>
              <td style={{ padding: '3px 8px', textAlign: 'right', borderTop: '1px solid #2D323E', color: '#00F0FF' }}>{report.admin.subtotalOffloads.toLocaleString()}</td>
            </tr>
            {report.admin.winningTickets.length > 0 && (
              <>
                <tr><td colSpan={2} style={{ padding: '6px 8px 0', color: '#8A2BE2', fontSize: '11px' }}>Winning Tickets (Admin-Held):</td></tr>
                {report.admin.winningTickets.map((wt, i) => (
                  <tr key={i}>
                    <td style={{ padding: '3px 8px 3px 16px', color: '#8A2BE2' }}>
                      {wt.ticket} ({wt.type}{wt.isHalfBlacklisted ? ', HALF' : ''})
                    </td>
                    <td style={{ padding: '3px 8px', textAlign: 'right', color: '#8A2BE2' }}>
                      Held: {wt.amount.toLocaleString()} / Payout: {wt.payout.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </>
            )}
            <tr>
              <td style={{ padding: '6px 8px', borderTop: '2px solid #00F0FF', fontWeight: 'bold', color: '#00F0FF', fontSize: '14px' }}>GRAND TOTAL</td>
              <td style={{ padding: '6px 8px', textAlign: 'right', borderTop: '2px solid #00F0FF', fontWeight: 'bold', color: '#00F0FF', fontSize: '14px' }}>{report.admin.grandTotal.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  ) : null

  return (
    <>
      {/* Hidden export template (captured by html2canvas) */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        {exportTemplate}
      </div>

      {/* Controls bar — Row 1 */}
      <div
        className="card"
        style={{
          gridColumn: 'span 12',
          gridRow: 'span 1',
          zIndex: 1,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '0 20px',
        }}
      >
        <div className="card__header" style={{ borderBottom: 'none', marginBottom: 0, paddingBottom: 0, flexShrink: 0 }}>
          Report
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
          <select
            className="input"
            value={selectedDrawId ?? ''}
            onChange={handleDrawChange}
            style={{ maxWidth: '220px' }}
          >
            <option value="">-- Select Draw --</option>
            {draws.map((d) => (
              <option key={d.id} value={d.id}>
                Draw {d.id} — {d.openDate} [{d.status}]
              </option>
            ))}
          </select>

          <button className="btn" onClick={handleGenerate} disabled={!selectedDrawId || loading}>
            {loading ? 'Generating...' : 'Generate Report'}
          </button>

          {report && (
            <button className="btn btn--special" onClick={handleExport} disabled={exporting}>
              {exporting ? 'Exporting...' : 'Export as Image'}
            </button>
          )}
        </div>

        {report && (
          <span style={{ color: '#888', fontSize: '11px', fontFamily: 'JetBrains Mono', flexShrink: 0 }}>
            Draw {report.drawId} | {report.drawStatus}
            {report.drawStatus === 'SETTLED' ? ' (Final)' : ''}
          </span>
        )}
      </div>

      {/* Report content — Rows 2-8 */}
      <div
        className="card"
        style={{
          gridColumn: 'span 12',
          gridRow: 'span 7',
          zIndex: 1,
          position: 'relative',
        }}
      >
        <div className="card__body" style={{ padding: 0, height: '100%' }}>
          {(() => {
            if (loading) {
              return (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <div className="scanline" style={{ width: '60%', height: '40px' }} />
                </div>
              )
            }

            if (error) {
              return (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px' }}>
                  <span style={{ color: '#FF0055', fontFamily: 'JetBrains Mono', fontSize: '13px' }}>{error}</span>
                  <button className="btn" onClick={() => selectedDrawId && generateReport(selectedDrawId)}>Retry</button>
                </div>
              )
            }

            if (!report) {
              return (
                <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
                  <span style={{ color: '#666', fontFamily: 'Instrument Sans', fontSize: '14px' }}>
                    Select a draw and click "Generate Report" to view the financial report.
                  </span>
                </div>
              )
            }

            // Render the report content
            return (
              <div ref={reportRef} className="scroll-container" style={{ height: '100%', padding: '20px 24px' }}>
                {/* Agent Section */}
                <div className="report__section" style={{ marginBottom: '20px' }}>
                  <h3 className="report__section-title">AGENT SECTION</h3>
                  {report.agents.length === 0 ? (
                    <p className="text-muted">No sales data for this draw.</p>
                  ) : (
                    report.agents.map((a) => (
                      <div key={a.agentId} className="report__party-card">
                        <div className="report__party-header">
                          <span className="report__party-name">{a.agentName}</span>
                          <span className="report__party-id">{a.agentId}</span>
                        </div>
                        <table className="report__table">
                          <tbody>
                            <tr>
                              <td>Total Sale Amount</td>
                              <td className="report__num">{a.totalSaleAmount.toLocaleString()}</td>
                            </tr>
                            <tr>
                              <td>Commission Paid ({a.commissionPaid > 0 && a.totalSaleAmount > 0 ? Math.round(a.commissionPaid / a.totalSaleAmount * 100) : 0}%)</td>
                              <td className="report__num">{a.commissionPaid.toLocaleString()}</td>
                            </tr>
                            <tr className="report__subtotal-row">
                              <td>Subtotal</td>
                              <td className="report__num">{a.subtotal.toLocaleString()}</td>
                            </tr>
                            {report.hasWinningTickets && a.winningTickets.length > 0 && (
                              <>
                                <tr><td colSpan={2} className="report__wt-header">Winning Ticket Details</td></tr>
                                {a.winningTickets.map((wt, i) => (
                                  <tr key={i} className="report__wt-row">
                                    <td>
                                      <span className="report__wt-ticket">{wt.ticket}</span>
                                      <span className="report__wt-type">{wt.type}</span>
                                      {wt.isHalfBlacklisted && <span className="report__wt-half">HALF</span>}
                                    </td>
                                    <td className="report__num">
                                      Amt: {wt.amount.toLocaleString()} / Pay: {wt.payout.toLocaleString()}
                                    </td>
                                  </tr>
                                ))}
                              </>
                            )}
                            <tr className="report__total-row">
                              <td>Total</td>
                              <td className="report__num">{a.total.toLocaleString()}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ))
                  )}
                </div>

                {/* Master Dealer Section */}
                <div className="report__section" style={{ marginBottom: '20px' }}>
                  <h3 className="report__section-title">MASTER DEALER SECTION</h3>
                  {report.dealers.length === 0 ? (
                    <p className="text-muted">No offload data for this draw.</p>
                  ) : (
                    report.dealers.map((d) => (
                      <div key={d.dealerId} className="report__party-card">
                        <div className="report__party-header">
                          <span className="report__party-name">{d.dealerName}</span>
                          <span className="report__party-id">{d.dealerId}</span>
                        </div>
                        <table className="report__table">
                          <tbody>
                            <tr>
                              <td>Total Offloaded Amount</td>
                              <td className="report__num">{d.totalOffloadedAmount.toLocaleString()}</td>
                            </tr>
                            <tr>
                              <td>Commission Paid to Admin/House</td>
                              <td className="report__num">{d.commissionToAdmin.toLocaleString()}</td>
                            </tr>
                            <tr className="report__subtotal-row">
                              <td>Subtotal</td>
                              <td className="report__num">{d.subtotal.toLocaleString()}</td>
                            </tr>
                            {report.hasWinningTickets && d.winningTickets.length > 0 && (
                              <>
                                <tr><td colSpan={2} className="report__wt-header">Winning Ticket Details</td></tr>
                                {d.winningTickets.map((wt, i) => (
                                  <tr key={i} className="report__wt-row">
                                    <td>
                                      <span className="report__wt-ticket">{wt.ticket}</span>
                                      <span className="report__wt-type">{wt.type}</span>
                                      {wt.isHalfBlacklisted && <span className="report__wt-half">HALF</span>}
                                    </td>
                                    <td className="report__num">
                                      Amt: {wt.amount.toLocaleString()} / Pay: {wt.payout.toLocaleString()}
                                    </td>
                                  </tr>
                                ))}
                              </>
                            )}
                            <tr className="report__total-row">
                              <td>Total</td>
                              <td className="report__num">{d.total.toLocaleString()}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ))
                  )}
                </div>

                {/* Admin/House Section */}
                <div className="report__section report__section--admin">
                  <h3 className="report__section-title">ADMIN / HOUSE — CONSOLIDATED</h3>
                  <table className="report__table report__table--admin">
                    <tbody>
                      <tr>
                        <td>Total Sales Amount (All Agents)</td>
                        <td className="report__num">{report.admin.totalSalesAmount.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td>Total Commission Payable (All Agents)</td>
                        <td className="report__num">{report.admin.totalCommissionPayable.toLocaleString()}</td>
                      </tr>
                      <tr className="report__subtotal-row">
                        <td>Subtotal</td>
                        <td className="report__num">{report.admin.subtotalSales.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td colSpan={2} style={{ height: '8px' }} />
                      </tr>
                      <tr>
                        <td>Total Offloaded Amount (All Master Dealers)</td>
                        <td className="report__num">{report.admin.totalOffloadedAmount.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td>Commission from Master Dealers</td>
                        <td className="report__num">{report.admin.totalCommissionFromMd.toLocaleString()}</td>
                      </tr>
                      <tr className="report__subtotal-row">
                        <td>Subtotal</td>
                        <td className="report__num">{report.admin.subtotalOffloads.toLocaleString()}</td>
                      </tr>
                      {report.hasWinningTickets && report.admin.winningTickets.length > 0 && (
                        <>
                          <tr><td colSpan={2} style={{ height: '8px' }} /></tr>
                          <tr><td colSpan={2} className="report__wt-header">Winning Ticket Details (Admin-Held Portion)</td></tr>
                          {report.admin.winningTickets.map((wt, i) => (
                            <tr key={i} className="report__wt-row">
                              <td>
                                <span className="report__wt-ticket">{wt.ticket}</span>
                                <span className="report__wt-type">{wt.type}</span>
                                {wt.isHalfBlacklisted && <span className="report__wt-half">HALF</span>}
                              </td>
                              <td className="report__num">
                                Held: {wt.amount.toLocaleString()} / Payout: {wt.payout.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </>
                      )}
                      <tr>
                        <td colSpan={2} style={{ height: '8px' }} />
                      </tr>
                      <tr className="report__grand-total-row">
                        <td>GRAND TOTAL</td>
                        <td className="report__num">{report.admin.grandTotal.toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })()}
        </div>
      </div>
    </>
  )
}
