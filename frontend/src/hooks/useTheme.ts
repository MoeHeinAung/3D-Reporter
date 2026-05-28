import { useThemeStore } from '@/stores/themeStore'

export function useTheme() {
  const theme = useThemeStore((s) => s.theme)
  const loading = useThemeStore((s) => s.loading)
  const toggleTheme = useThemeStore((s) => s.toggleTheme)
  const initTheme = useThemeStore((s) => s.initTheme)

  return { theme, loading, initTheme, toggleTheme }
}
