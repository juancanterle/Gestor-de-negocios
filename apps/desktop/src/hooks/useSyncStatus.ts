import { useState, useEffect, useRef, useCallback } from 'react'
import type { SyncStatus, SyncResult } from '../types/api'
import { useToast } from './useToast'

const POLL_INTERVAL_MS = 10_000

/**
 * Hook de estado de sincronización. Realiza polling a `sync.status()` y escucha
 * eventos `online`/`offline` del navegador. Dispara toasts en las transiciones
 * relevantes (conexión restablecida, sync completo).
 */
export function useSyncStatus() {
  const [status, setStatus]   = useState<SyncStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const prevOnline   = useRef<boolean | null>(null)
  const prevPending  = useRef<number | null>(null)
  const prevFailed   = useRef<number | null>(null)
  const toast = useToast()

  const fetchStatus = useCallback(async () => {
    try {
      const r = await window.api.sync.status()
      if (!r.ok) return
      const s = r.data
      setStatus(s)
      setLoading(false)

      // Transición: offline → online
      if (prevOnline.current === false && s.online) {
        toast.info('Conexión restablecida')
      }

      // Transición: pending > 0 → pending = 0 y no está procesando
      if (
        prevPending.current != null &&
        prevPending.current > 0 &&
        s.pending === 0 &&
        !s.processing
      ) {
        toast.success(`Sincronización completa: ${prevPending.current} items subidos`)
      }

      // Transición: failed > 0 → failed = 0
      if (prevFailed.current != null && prevFailed.current > 0 && s.failed === 0) {
        toast.success('Items fallidos sincronizados')
      }

      prevOnline.current  = s.online
      prevPending.current = s.pending
      prevFailed.current  = s.failed
    } catch {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch legítimo: actualiza estado tras resolver promise
    void fetchStatus()
    const id = window.setInterval(fetchStatus, POLL_INTERVAL_MS)
    const onNet = () => fetchStatus()
    window.addEventListener('online',  onNet)
    window.addEventListener('offline', onNet)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('online',  onNet)
      window.removeEventListener('offline', onNet)
    }
  }, [fetchStatus])

  const triggerManualSync = useCallback(async (): Promise<SyncResult | null> => {
    try {
      const r = await window.api.sync.manual()
      if (!r.ok) {
        toast.error(r.error)
        return null
      }
      // Refrescar estado inmediatamente para reflejar processing=true
      await fetchStatus()
      return r.data
    } catch {
      toast.error('No se pudo iniciar la sincronización')
      return null
    }
  }, [fetchStatus, toast])

  return { status, loading, refresh: fetchStatus, triggerManualSync }
}
