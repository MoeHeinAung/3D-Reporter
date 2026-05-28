import { useEffect, useState } from 'react'
import { api, type SystemInfo } from './api/bridge'

const GRID_CELLS = 12 * 8

function App() {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const [uptime, setUptime] = useState(0)
  const [theme, setTheme] = useState('dark')

  useEffect(() => {
    api.get_system_info().then(setSystemInfo)
    api.get_theme_preference().then((t) => {
      setTheme(t)
      document.documentElement.setAttribute('data-theme', t)
      document.documentElement.classList.add('theme-ready')
    })
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      api.get_uptime_seconds().then(setUptime)
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    api.set_theme_preference(next)
  }

  const formatUptime = (s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = Math.floor(s % 60)
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="page-layout">
      {/* Navbar — 48px, frosted glass, subtle bottom border */}
      <nav className="navbar">
        {/* Left nav links */}
        <div className="navbar__left">
          <div className="navbar__nav">
            <a className="navbar__link navbar__link--active" href="#">
              Dashboard
            </a>
            <a className="navbar__link" href="#">
              Telemetry
            </a>
          </div>
        </div>

        {/* Center trapezoid logo — overflows the 48px bar */}
        <div className="navbar__trapezoid">
          <span className="navbar__trapezoid-text">3D Reporter</span>
        </div>

        {/* Right section: nav link + clock + status + theme */}
        <div className="navbar__right">
          <a className="navbar__link" href="#">
            Archive
          </a>
          <span className="navbar__clock">{formatUptime(uptime)}</span>
          <span className="navbar__status" />
          <button className="theme-toggle" onClick={toggleTheme} type="button">
            <span className="theme-toggle__icon" />
          </button>
        </div>
      </nav>

      {/* Main 12×8 Grid */}
      <main className="main-content" style={{ position: 'relative' }}>
        {/* Grid overlay — subtle 12×8 cell borders behind cards */}
        <div className="grid-overlay">
          {Array.from({ length: GRID_CELLS }, (_, i) => (
            <div key={i} className="grid-overlay__cell" />
          ))}
        </div>

        {/* System Info — 3 cols × 4 rows */}
        <div className="card" style={{ gridColumn: 'span 3', gridRow: 'span 4', zIndex: 1, position: 'relative' }}>
          <div className="card__header">System</div>
          <div className="card__body">
            {systemInfo ? (
              <dl style={{ display: 'grid', gap: '0.5rem' }}>
                {Object.entries(systemInfo).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <dt className="text-muted label-sm">{k}</dt>
                    <dd className="telemetry telemetry-sm">{v}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <div className="scanline" style={{ height: 100 }} />
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
      </main>
    </div>
  )
}

export default App
