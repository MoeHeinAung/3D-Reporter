import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useTheme } from './hooks/useTheme'
import Navbar from './components/Navbar'

const GRID_CELLS = 12 * 8

export default function App() {
  const { initTheme } = useTheme()

  useEffect(() => {
    initTheme().then(() => {
      document.documentElement.classList.add('theme-ready')
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="page-layout">
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
