import { forwardRef } from 'react'

export interface KalawEntry {
  ticket: string
  amount: number
}

interface KalawTemplateProps {
  entries: KalawEntry[]
  drawDate: string
  drawId: number
  pageNumber: number
  masterDealerName: string
  note?: string | null
}

const ROWS_PER_PAGE = 15 // 4-column x 15-row grid

function formatAmount(n: number): string {
  return n.toLocaleString()
}

const KalawTemplate = forwardRef<HTMLDivElement, KalawTemplateProps>(function KalawTemplate(
  { entries, drawDate, drawId, pageNumber, masterDealerName, note },
  ref,
) {
  const totalAmount = entries.reduce((sum, e) => sum + e.amount, 0)
  const rows: Array<KalawEntry | null> = [...entries]
  while (rows.length < ROWS_PER_PAGE) {
    rows.push(null)
  }

  return (
    <div
      ref={ref}
      className="kalaw-template"
      style={{
        position: 'absolute',
        left: '-9999px',
        top: 0,
        width: '800px',
        padding: '32px',
        background: '#fff',
        color: '#000',
        fontFamily: 'Instrument Sans, sans-serif',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '0.15em', margin: 0 }}>
          KALAW
        </h1>
        <div style={{ fontSize: '13px', marginTop: '8px', color: '#555' }}>
          {drawDate} &mdash; Page {pageNumber}
        </div>
        <div style={{ fontSize: '12px', color: '#777', marginTop: '2px' }}>
          Master Dealer: {masterDealerName}
        </div>
      </div>

      {/* Body grid */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #000', borderTop: '2px solid #000' }}>
            <th style={thStyle}>No.</th>
            <th style={thStyle}>Ticket</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Amount (Ks)</th>
            <th style={thStyle}>Remark</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((entry, i) => {
            const isOdd = i % 2 === 1
            return (
              <tr
                key={i}
                style={{
                  background: isOdd ? 'rgba(0,0,0,0.015)' : 'transparent',
                  borderBottom: '1px solid #e0e0e0',
                }}
              >
                <td style={tdStyle}>{entry ? i + 1 : ''}</td>
                <td style={{ ...tdStyle, fontFamily: 'JetBrains Mono, monospace' }}>
                  {entry?.ticket ?? ''}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>
                  {entry ? formatAmount(entry.amount) : ''}
                </td>
                <td style={tdStyle}>{''}</td>
              </tr>
            )
          })}
        </tbody>
        {/* Subtotals */}
        <tfoot>
          <tr style={{ borderTop: '2px solid #000', fontWeight: 600 }}>
            <td style={tdStyle}></td>
            <td style={tdStyle}>{entries.length} tickets</td>
            <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>
              {formatAmount(totalAmount)}
            </td>
            <td style={tdStyle}></td>
          </tr>
        </tfoot>
      </table>

      {/* Footer */}
      <div style={{ marginTop: '32px', fontSize: '11px', color: '#888', textAlign: 'center' }}>
        <div>Draw ID: {drawId}</div>
        <div style={{ marginTop: '4px', fontSize: '14px', fontWeight: 600, color: '#000' }}>
          Total Amount Offloaded: <em style={{ fontStyle: 'italic' }}>{formatAmount(totalAmount)} Ks</em>
        </div>
        {note && (
          <div style={{ marginTop: '8px', color: '#555' }}>Note: {note}</div>
        )}
      </div>
    </div>
  )
})

const thStyle: React.CSSProperties = {
  padding: '8px 12px',
  textAlign: 'left',
  fontWeight: 600,
  fontSize: '12px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

const tdStyle: React.CSSProperties = {
  padding: '7px 12px',
  verticalAlign: 'middle',
}

export default KalawTemplate
