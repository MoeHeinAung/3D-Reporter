import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { api } from './api/bridge'
import Navbar from './components/Navbar'

const GRID_CELLS = 12 * 8

export default function App() {
  const [uptime, setUptime] = useState(0)
  const [theme, setTheme] = useState('dark')

  useEffect(() => {
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
      <Navbar uptime={formatUptime(uptime)} onToggleTheme={toggleTheme} />

      <main className="main-content" style={{ position: 'relative' }}>
        <div className="grid-overlay">
          {Array.from({ length: GRID_CELLS }, (_, i) => (
            <div key={i} className="grid-overlay__cell" />
          ))}
        </div>

        <Outlet />
      </main>
    </div>
  )
}
