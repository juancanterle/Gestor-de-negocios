import { RefreshCw } from 'lucide-react'
import Modal from './Modal'
import { T } from '../theme'
import type { SyncStatus, SyncResult } from '../types/api'

interface Props {
  open: boolean
  status: SyncStatus
  onClose: () => void
  onManualSync: () => Promise<SyncResult | null>
}

const fmtDate = (d: string | null) => {
  if (!d) return 'Nunca'
  const date = new Date(d)
  return date.toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function Row({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 0', borderBottom: `1px solid ${T.border}`,
    }}>
      <span style={{ color: T.sub, fontSize: 13 }}>{label}</span>
      <span style={{ color, fontWeight: 600, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  )
}

export default function SyncDetailsModal({ open, status, onClose, onManualSync }: Props) {
  const canSync = status.online && !status.processing

  return (
    <Modal open={open} onClose={onClose} title="Estado de sincronización" width={460}>
      <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 20 }}>
        <Row
          label="Conexión"
          value={status.online ? 'Online' : 'Offline'}
          color={status.online ? T.cash : T.warning}
        />
        <Row
          label="Estado"
          value={status.processing ? 'Sincronizando…' : 'Inactivo'}
          color={status.processing ? T.primary : T.sub}
        />
        <Row
          label="Pendientes"
          value={String(status.pending)}
          color={status.pending > 0 ? T.warning : T.sub}
        />
        <Row
          label="Fallidos"
          value={String(status.failed)}
          color={status.failed > 0 ? T.danger : T.sub}
        />
        <Row
          label="Última sincronización"
          value={fmtDate(status.lastSync)}
          color={T.sub}
        />
      </div>

      {status.lastError && (
        <div role="alert" style={{
          padding: '10px 14px',
          background: T.dangerBg,
          border: `1px solid ${T.danger}55`,
          borderRadius: T.r,
          marginBottom: 20,
          fontSize: 12,
          color: T.danger,
          lineHeight: 1.5,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Último error</div>
          <div>{status.lastError}</div>
        </div>
      )}

      <div style={{
        marginBottom: 20, padding: '10px 14px',
        background: `${T.primary}14`, border: `1px solid ${T.primary}30`,
        borderRadius: T.r, fontSize: 12, color: T.sub, lineHeight: 1.5,
      }}>
        Las ventas se registran localmente al instante, incluso sin internet. Cuando
        se recupera la conexión se suben automáticamente al panel.
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button
          onClick={onClose}
          style={{
            padding: '10px 18px', borderRadius: T.r,
            border: `1.5px solid ${T.border}`, background: 'transparent',
            color: T.sub, fontSize: 13, cursor: 'pointer',
          }}
        >
          Cerrar
        </button>
        <button
          onClick={async () => { await onManualSync() }}
          disabled={!canSync}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 18px', borderRadius: T.r, border: 'none',
            background: canSync ? T.primaryD : T.border,
            color: canSync ? '#fff' : T.faint,
            fontSize: 13, fontWeight: 600,
            cursor: canSync ? 'pointer' : 'not-allowed',
          }}
        >
          <RefreshCw
            size={14}
            aria-hidden="true"
            style={status.processing ? { animation: 'spin 1s linear infinite' } : undefined}
          />
          Sincronizar ahora
        </button>
      </div>
    </Modal>
  )
}
