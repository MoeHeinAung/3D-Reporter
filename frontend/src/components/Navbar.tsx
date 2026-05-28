import { NavLink } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'
import { useUptime } from '../hooks/useUptime'

export default function Navbar() {
  const { toggleTheme } = useTheme()
  const { formatted: uptime } = useUptime()

  return (
    <nav className="navbar">
      {/* Left section: Draws | Partners | Report */}
      <div className="navbar__left">
        <div className="navbar__nav">
          <NavLink className={({ isActive }) => `navbar__link${isActive ? ' navbar__link--active' : ''}`} to="/draws">
            Draws
          </NavLink>
          <NavLink className={({ isActive }) => `navbar__link${isActive ? ' navbar__link--active' : ''}`} to="/partners">
            Partners
          </NavLink>
          <NavLink className={({ isActive }) => `navbar__link${isActive ? ' navbar__link--active' : ''}`} to="/report">
            Report
          </NavLink>
        </div>
      </div>

      {/* Center trapezoid: Dashboard (primary entry point) */}
      <div className="navbar__trapezoid">
        <NavLink className="navbar__trapezoid-text" to="/" end>
          3D Reporter
        </NavLink>
      </div>

      {/* Right section: Sales | Risk | Settings | clock | status | theme */}
      <div className="navbar__right">
        <NavLink className={({ isActive }) => `navbar__link${isActive ? ' navbar__link--active' : ''}`} to="/sales">
          Sales
        </NavLink>
        <NavLink className={({ isActive }) => `navbar__link${isActive ? ' navbar__link--active' : ''}`} to="/risk">
          Risk
        </NavLink>
        <NavLink className={({ isActive }) => `navbar__link${isActive ? ' navbar__link--active' : ''}`} to="/settings">
          Settings
        </NavLink>
        <span className="navbar__clock">{uptime}</span>
        <span className="navbar__status" />
        <button className="theme-toggle" onClick={toggleTheme} type="button">
          <span className="theme-toggle__icon" />
        </button>
      </div>
    </nav>
  )
}
