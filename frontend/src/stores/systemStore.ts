import { create } from 'zustand'
import { api } from '@/api/bridge'
import type { SystemInfo } from '@/types'

interface SystemState {
  systemInfo: SystemInfo | null
  uptime: number
  serverTime: string
  loading: boolean
  error: string | null
  fetchSystemInfo: () => Promise<void>
  fetchUptime: () => Promise<void>
  fetchServerTime: () => Promise<void>
}

export const useSystemStore = create<SystemState>((set) => ({
  systemInfo: null,
  uptime: 0,
  serverTime: '',
  loading: true,
  error: null,

  fetchSystemInfo: async () => {
    try {
      const info = await api.get_system_info()
      set({ systemInfo: info, loading: false, error: null })
    } catch (e) {
      set({ error: String(e), loading: false })
    }
  },

  fetchUptime: async () => {
    try {
      const uptime = await api.get_uptime_seconds()
      set({ uptime })
    } catch {
      // Silently ignore uptime polling failures
    }
  },

  fetchServerTime: async () => {
    try {
      const serverTime = await api.get_server_time()
      set({ serverTime })
    } catch {
      // Silently ignore
    }
  },
}))
