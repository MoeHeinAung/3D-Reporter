import { useEffect } from 'react'
import { useSystemStore } from '@/stores/systemStore'

export function useSystemInfo() {
  const systemInfo = useSystemStore((s) => s.systemInfo)
  const loading = useSystemStore((s) => s.loading)
  const error = useSystemStore((s) => s.error)
  const fetch = useSystemStore((s) => s.fetchSystemInfo)

  useEffect(() => {
    if (!systemInfo && loading) {
      fetch()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { data: systemInfo, loading, error }
}
