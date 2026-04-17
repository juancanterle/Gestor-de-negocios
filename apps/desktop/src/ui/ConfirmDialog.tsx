import type { ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import Modal from './Modal'
import Button from './Button'
import { color, radius } from './theme'

interface Props {
  open: boolean
  title: string
  message: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'warning' | 'primary'
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export default function ConfirmDialog({
  open, title, message,
  confirmLabel = 'Confirmar', cancelLabel = 'Cancelar',
  tone = 'danger',
  onConfirm, onCancel, loading,
}: Props) {
  const iconColor = tone === 'danger' ? color.danger : tone === 'warning' ? color.warning : color.accent
  const iconBg    = tone === 'danger' ? color.dangerSoft : tone === 'warning' ? color.warningSoft : color.accentSoft

  return (
    <Modal
      open={open}
      onClose={onCancel}
      width={420}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={loading}>{cancelLabel}</Button>
          <Button
            variant={tone === 'primary' ? 'primary' : tone === 'warning' ? 'primary' : 'danger'}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{
          width: 44, height: 44,
          borderRadius: radius.lg,
          background: iconBg, color: iconColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <AlertTriangle size={22} />
        </div>
        <div>
          <div style={{ fontSize: 16, color: color.text, fontWeight: 700, marginBottom: 6 }}>{title}</div>
          <div style={{ fontSize: 13, color: color.muted, lineHeight: 1.55 }}>{message}</div>
        </div>
      </div>
    </Modal>
  )
}
