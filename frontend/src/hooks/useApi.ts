import { useCallback, useEffect, useState } from 'react'

interface UseApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

/**
 * Generic hook for async API calls with loading and error states.
 */
export function useApi<T>(apiCall: () => Promise<T>) {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: true,
    error: null,
  })

  const execute = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = await apiCall()
      setState({ data, loading: false, error: null })
    } catch (e) {
      setState({ data: null, loading: false, error: String(e) })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setState((s) => ({ ...s, loading: true, error: null }))
      try {
        const data = await apiCall()
        if (!cancelled) setState({ data, loading: false, error: null })
      } catch (e) {
        if (!cancelled) setState({ data: null, loading: false, error: String(e) })
      }
    }
    run()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { ...state, refetch: execute }
}
