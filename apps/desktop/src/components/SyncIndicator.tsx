import { useState } from 'react'
import { Check, RefreshCw, WifiOff, AlertCircle, CloudUpload } from 'lucide-react'
import { T } from '../theme'
import { useSyncStatus } from '../hooks/useSyncStatus'
import SyncDetailsModal from './SyncDetailsModal'

interface Props { collapsed: boolean }

interface Visual {
  Icon: typeof Check
  color: string
  label: string
  spin?: boolean
}

export default function SyncIndicator({ collapsed }: Props) {
  const { status, loading, triggerManualSync } = useSyncStatus()
  const [open, setOpen] = useState(false)

  if (loading || !status) return null

  const visual: Visual = (() => {
    if (status.processing)
      return { Icon: RefreshCw, color: T.primary, label: 'Sincronizando…', spin: true }
    if (status.failed > 0)
      return { Icon: AlertCircle, color: T.danger, label: `${status.failed} fallido${status.failed !== 1 ? 's' : ''}` }
    if (!status.online)
      return {
        Icon: WifiOff,
        color: T.warning,
        label: status.pending > 0 ? `Offline · ${status.pending} pend.` : 'Offline',
      }
    if (status.pending > 0)
      return { Icon: CloudUpload, color: T.warning, label: `${status.pending} pendiente${status.pending !== 1 ? 's' : ''}` }
    return { Icon: Check, color: T.cash, label: 'Sincronizado' }
  })()

  const { Icon, color, label, spin } = visual

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={`Estado de sincronización: ${label}`}
        title={label}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: collapsed ? 0 : 8,
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: '6px 8px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color,
          fontSize: 11,
          fontWeight: 600,
          borderRadius: 4,
          minHeight: 28,
        }}
      >
        <Icon
          size={13}
          aria-hidden="true"
          style={spin ? { animation: 'spin 1s linear infinite' } : undefined}
        />
        {!collapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>}
      </button>
      <SyncDetailsModal
        open={open}
        status={status}
        onClose={() => setOpen(false)}
        onManualSync={triggerManualSync}
      />
    </>
  )
}
