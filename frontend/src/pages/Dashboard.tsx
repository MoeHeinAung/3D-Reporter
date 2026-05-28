import { api } from '../api/bridge'
import { useSystemInfo } from '../hooks/useSystemInfo'

export default function Dashboard() {
  const { data: systemInfo, loading } = useSystemInfo()

  return (
    <>
      {/* System Info — 3 cols × 4 rows */}
      <div className="card" style={{ gridColumn: 'span 3', gridRow: 'span 4', zIndex: 1, position: 'relative' }}>
        <div className="card__header">System</div>
        <div className="card__body">
          {loading ? (
            <div className="scanline" style={{ height: 100 }} />
          ) : systemInfo ? (
            <dl style={{ display: 'grid', gap: '0.5rem' }}>
              {Object.entries(systemInfo).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <dt className="text-muted label-sm">{k}</dt>
                  <dd className="telemetry telemetry-sm">{v}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <div className="text-muted" style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
              Unable to load system info
            </div>
          )}
        </div>
      </div>

      {/* Risk Telemetry — 5 cols × 4 rows */}
      <div className="card pulse-hologram" style={{ gridColumn: 'span 5', gridRow: 'span 4', zIndex: 1, position: 'relative' }}>
        <div className="card__header">Risk Telemetry</div>
        <div className="card__body">
          <div className="text-muted" style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
            Nightingale chart placeholder
          </div>
        </div>
      </div>

      {/* Operational Status — 4 cols × 4 rows */}
      <div className="card" style={{ gridColumn: 'span 4', gridRow: 'span 4', zIndex: 1, position: 'relative' }}>
        <div className="card__header">Operational Status</div>
        <div className="card__body">
          <div className="text-muted" style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
            Status panel placeholder
          </div>
        </div>
      </div>

      {/* Quick Actions — full-width bottom row */}
      <div className="card card--compact" style={{ gridColumn: 'span 12', gridRow: 'span 4', zIndex: 1, position: 'relative' }}>
        <div className="card__header">Quick Actions</div>
        <div className="card__body">
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn btn--primary btn--sm" type="button" onClick={() => api.ping()}>
              Ping Backend
            </button>
            <button className="btn btn--special btn--sm" type="button">
              Digital Ping
            </button>
            <button className="btn btn--danger btn--sm" type="button">
              Alert
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
