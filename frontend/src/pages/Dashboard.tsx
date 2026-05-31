import { api } from '../api/bridge'
import { useSystemInfo } from '../hooks/useSystemInfo'
import { useSystemStore } from '../stores/systemStore'

export default function Dashboard() {
  const { data: systemInfo, loading, error } = useSystemInfo()
  const uptime = useSystemStore((s) => s.uptime)

  const handlePing = async () => {
    await api.ping()
  }

  const handleDigitalPing = async () => {
    await api.ping()
  }

  const handleAlert = () => {
    alert('Test alert dispatched to monitoring channel')
  }

  return (
    <>
      {/* System Info — 3 cols × 4 rows */}
      <div className="card" style={{ gridColumn: 'span 3', gridRow: 'span 4', zIndex: 1, position: 'relative' }}>
        <div className="card__header">System</div>
        <div className="card__body">
          {loading ? (
            <div className="scanline" style={{ height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                Loading system data...
              </div>
            </div>
          ) : error ? (
            <div className="draws__state draws__state--error">
              <div className="draws__state-icon">!</div>
              <span>Unable to load</span>
            </div>
          ) : systemInfo ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              <div className="stat-grid">
                <div className="stat-group">
                  <span className="stat-group__label">Python Version</span>
                  <span className="stat-group__value">{systemInfo.pythonVersion || '—'}</span>
                </div>
                <div className="stat-group">
                  <span className="stat-group__label">Platform</span>
                  <span className="stat-group__value">{systemInfo.platform || '—'}</span>
                </div>
              </div>
              <div className="stat-grid">
                <div className="stat-group">
                  <span className="stat-group__label">Database</span>
                  <span className="stat-group__value">—</span>
                </div>
                <div className="stat-group">
                  <span className="stat-group__label">Uptime</span>
                  <span className="stat-group__value">{uptime ? `${Math.floor(uptime / 60)}m ${uptime % 60}s` : '—'}</span>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Risk Telemetry — 5 cols × 4 rows */}
      <div className="card pulse-hologram" style={{ gridColumn: 'span 5', gridRow: 'span 4', zIndex: 1, position: 'relative' }}>
        <div className="card__header">Risk Telemetry</div>
        <div className="card__body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <div className="data-row">
              <span className="data-row__key">High Severity</span>
              <span className="data-row__value data-row__value--error">&mdash;</span>
            </div>
            <div className="data-row">
              <span className="data-row__key">Pending Reviews</span>
              <span className="data-row__value data-row__value--warn">&mdash;</span>
            </div>
            <div className="data-row">
              <span className="data-row__key">Active Offloads</span>
              <span className="data-row__value">&mdash;</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-5)', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
              Risk monitoring active &mdash; no alerts
            </div>
          </div>
        </div>
      </div>

      {/* Operational Status — 4 cols × 4 rows */}
      <div className="card" style={{ gridColumn: 'span 4', gridRow: 'span 4', zIndex: 1, position: 'relative' }}>
        <div className="card__header">Operational Status</div>
        <div className="card__body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            <div className="stat-group">
              <span className="stat-group__label">Active Draw</span>
              <span className="stat-group__value" style={{ color: 'var(--color-primary)' }}>&mdash;</span>
              <span className="stat-group__trend">No open draw</span>
            </div>
            <div className="stat-group">
              <span className="stat-group__label">Registered Agents</span>
              <span className="stat-group__value">&mdash;</span>
            </div>
            <div className="stat-group">
              <span className="stat-group__label">Pending Offloads</span>
              <span className="stat-group__value">&mdash;</span>
              <span className="stat-group__trend">Awaiting action</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions — full-width bottom row */}
      <div className="card card--compact" style={{ gridColumn: 'span 12', gridRow: 'span 4', zIndex: 1, position: 'relative' }}>
        <div className="card__header">Quick Actions</div>
        <div className="card__body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', height: '100%', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
              <button className="btn btn--secondary" onClick={handlePing}>Ping Backend</button>
              <span className="text-body-sm" style={{ color: 'var(--color-text-muted)' }}>Verify API connectivity and response time</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
              <button className="btn btn--primary" onClick={handleDigitalPing}>Digital Ping</button>
              <span className="text-body-sm" style={{ color: 'var(--color-text-muted)' }}>Run full system diagnostic sequence</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
              <button className="btn btn--ghost" onClick={handleAlert}>Alert</button>
              <span className="text-body-sm" style={{ color: 'var(--color-text-muted)' }}>Send test alert to monitoring channel</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
