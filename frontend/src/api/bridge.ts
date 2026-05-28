/**
 * API Bridge — TypeScript wrapper around the pywebview Python backend.
 *
 * In the desktop app, `window.pywebview.api` exposes the Python API class.
 * This module provides typed access and a mock fallback for browser dev.
 */

// ---------------------------------------------------------------------------
// Shared types matching backend/api.py return values
// ---------------------------------------------------------------------------

export interface SystemInfo {
  platform: string
  platformRelease: string
  arch: string
  pythonVersion: string
  hostname: string
}

export interface RiskCategory {
  label: string
  value: number
  threshold: number
}

export interface RiskTelemetry {
  categories: RiskCategory[]
  overall: number
  updatedAt: string
}

// ---------------------------------------------------------------------------
// pywebview JS API type
// ---------------------------------------------------------------------------

interface PywebviewAPI {
  get_system_info(): Promise<SystemInfo>
  get_uptime_seconds(): Promise<number>
  get_server_time(): Promise<string>
  read_json(filename: string): Promise<Record<string, unknown> | null>
  write_json(filename: string, data: Record<string, unknown>): Promise<boolean>
  get_risk_telemetry(): Promise<RiskTelemetry>
  get_theme_preference(): Promise<string>
  set_theme_preference(theme: string): Promise<boolean>
  echo(message: string): Promise<string>
  ping(): Promise<string>
}

// ---------------------------------------------------------------------------
// Resolve the API — real pywebview or mock
// ---------------------------------------------------------------------------

function getAPI(): PywebviewAPI {
  const w = window as unknown as { pywebview?: { api: PywebviewAPI } }

  if (w.pywebview?.api) {
    return w.pywebview.api
  }

  // Mock backend for browser-based development
  return {
    async get_system_info() {
      return {
        platform: 'browser',
        platformRelease: 'dev',
        arch: 'web',
        pythonVersion: 'mock',
        hostname: 'localhost',
      }
    },
    async get_uptime_seconds() {
      return 0
    },
    async get_server_time() {
      return new Date().toISOString()
    },
    async read_json() {
      return null
    },
    async write_json() {
      return true
    },
    async get_risk_telemetry() {
      return {
        categories: [
          { label: 'Network', value: 0.32, threshold: 0.7 },
          { label: 'Storage', value: 0.55, threshold: 0.8 },
          { label: 'Compute', value: 0.18, threshold: 0.6 },
          { label: 'Memory', value: 0.72, threshold: 0.75 },
          { label: 'IO', value: 0.44, threshold: 0.65 },
          { label: 'Security', value: 0.08, threshold: 0.5 },
        ],
        overall: 0.38,
        updatedAt: new Date().toISOString(),
      }
    },
    async get_theme_preference() {
      return 'dark'
    },
    async set_theme_preference() {
      return true
    },
    async echo(message: string) {
      return `[mock-backend] ${message}`
    },
    async ping() {
      return 'pong'
    },
  }
}

export const api = getAPI()
