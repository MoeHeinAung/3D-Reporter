import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.tsx'
import Dashboard from './pages/Dashboard.tsx'
import Draws from './pages/Draws.tsx'
import Partners from './pages/Partners.tsx'
import Report from './pages/Report.tsx'
import Sales from './pages/Sales.tsx'
import Risk from './pages/Risk.tsx'
import Settings from './pages/Settings.tsx'
import './styles/main.scss'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<App />}>
          <Route index element={<Dashboard />} />
          <Route path="draws" element={<Draws />} />
          <Route path="partners" element={<Partners />} />
          <Route path="report" element={<Report />} />
          <Route path="sales" element={<Sales />} />
          <Route path="risk" element={<Risk />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
