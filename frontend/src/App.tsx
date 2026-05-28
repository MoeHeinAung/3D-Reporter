import { useEffect, useState } from 'react'
import { api, type SystemInfo } from './api/bridge'

function App() {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const [uptime, setUptime] = useState(0)
  const [theme, setTheme] = useState('dark')

  useEffect(() => {
    api.get_system_info().then(setSystemInfo)
    api.get_theme_preference().then((t) => {
      setTheme(t)
      document.documentElement.setAttribute('data-theme', t)
      // Mark as ready to enable smooth theme transitions
      document.documentElement.classList.add('theme-ready')
    })
  }, [])

  // Uptime polling
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
    <div className="app-shell">
      {/* Navbar — full width, 1 row */}
      <nav className="navbar grid-navbar">
        <div className="navbar__logo">
          <span className="navbar__logo-text">3DR</span>
        </div>

        <div className="navbar__nav">
          <a className="navbar__link navbar__link--active" href="#">
            Dashboard
          </a>
          <a className="navbar__link" href="#">
            Telemetry
          </a>
          <a className="navbar__link" href="#">
            Archive
          </a>
        </div>

        <div className="navbar__actions">
          <span className="navbar__clock">{formatUptime(uptime)}</span>
          <span className="navbar__status" />
          <button className="theme-toggle" onClick={toggleTheme} type="button">
            <span className="theme-toggle__icon" />
          </button>
        </div>
      </nav>

      {/* Sidebar — 3 cols, 7 rows */}
      <aside className="grid-sidebar">
        <div className="card">
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
      </aside>

      {/* Main — 9 cols, 7 rows (rows 2-8) */}
      <main
        className="grid-main"
        style={{ display: 'grid', gridTemplateRows: 'subgrid', gridRow: 'span 7', gap: 'var(--grid-gap)' }}
      >
        <div className="card pulse-hologram" style={{ gridRow: 'span 3' }}>
          <div className="card__header">Risk Telemetry</div>
          <div className="card__body">
            <div className="text-muted" style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
              Nightingale chart placeholder
            </div>
          </div>
        </div>

        <div className="card" style={{ gridRow: 'span 3' }}>
          <div className="card__header">Operational Status</div>
          <div className="card__body">
            <div className="text-muted" style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
              Status panel placeholder
            </div>
          </div>
        </div>

        <div className="card card--compact" style={{ gridRow: 'span 1' }}>
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