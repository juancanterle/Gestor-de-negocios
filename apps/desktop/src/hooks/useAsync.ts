import { useState, useCallback } from 'react'
import { useToast } from './useToast'

interface AsyncState<T> {
  loading: boolean
  error:   string | null
  data:    T | null
}

export function useAsync<T = unknown>() {
  const [state, setState] = useState<AsyncState<T>>({ loading: false, error: null, data: null })
  const { error: showError } = useToast()

  const run = useCallback(async (
    fn: () => Promise<T>,
    opts?: { silent?: boolean },
  ): Promise<T | null> => {
    setState(s => ({ ...s, loading: true, error: null }))
    try {
      const data = await fn()
      setState({ loading: false, error: null, data })
      return data
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error inesperado'
      setState(s => ({ ...s, loading: false, error: msg }))
      if (!opts?.silent) showError(msg)
      return null
    }
  }, [showError])

  const reset = useCallback(() => setState({ loading: false, error: null, data: null }), [])

  return { ...state, run, reset }
}
