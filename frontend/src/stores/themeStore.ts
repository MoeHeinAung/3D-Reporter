import { create } from 'zustand'
import { api } from '@/api/bridge'

type Theme = 'dark' | 'light'

interface ThemeState {
  theme: Theme
  loading: boolean
  initTheme: () => Promise<void>
  toggleTheme: () => Promise<void>
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'dark',
  loading: true,

  initTheme: async () => {
    try {
      const pref = await api.get_theme_preference()
      const theme = pref === 'light' ? 'light' : 'dark'
      document.documentElement.setAttribute('data-theme', theme)
      set({ theme, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  toggleTheme: async () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    set({ theme: next })
    try {
      await api.set_theme_preference(next)
    } catch {
      // Revert on failure
      const prev = next === 'dark' ? 'light' : 'dark'
      document.documentElement.setAttribute('data-theme', prev)
      set({ theme: prev })
    }
  },
}))
