import { useEffect, useRef } from 'react'
import { useSystemStore } from '@/stores/systemStore'

/**
 * Polls backend uptime every second. Returns a human-readable uptime string.
 */
export function useUptime() {
  const uptime = useSystemStore((s) => s.uptime)
  const fetchUptime = useSystemStore((s) => s.fetchUptime)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetchUptime()
    intervalRef.current = setInterval(fetchUptime, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const hours = Math.floor(uptime / 3600)
  const minutes = Math.floor((uptime % 3600) / 60)
  const seconds = uptime % 60

  const formatted =
    hours > 0
      ? `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`
      : `${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`

  return { uptime, formatted }
}
