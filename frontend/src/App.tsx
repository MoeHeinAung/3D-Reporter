import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useTheme } from './hooks/useTheme'
import Navbar from './components/Navbar'
import { api } from './api/bridge'

const GRID_CELLS = 12 * 8

export default function App() {
  const { initTheme } = useTheme()
  const [apiMode, setApiMode] = useState<string | null>(null)

  useEffect(() => {
    initTheme().then(() => {
      document.documentElement.classList.add('theme-ready')
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    api.api_mode().then(setApiMode)
  }, [])

  return (
    <div className="page-layout">
      {apiMode === 'mock' && (
        <div className="mock-banner">
          MOCK MODE — Data is in-memory only. Run <code>python main.py</code> for real database.
        </div>
      )}
      <Navbar />

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
