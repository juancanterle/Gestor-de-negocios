import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'
import { T } from '../theme'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

interface Props {
  message: string
  variant: ToastVariant
  onDismiss: () => void
}

const CONFIGS = {
  success: { Icon: CheckCircle, color: T.cash,     border: `${T.cash}44` },
  error:   { Icon: AlertCircle, color: T.danger,   border: `${T.danger}44` },
  warning: { Icon: AlertTriangle, color: T.warning, border: `${T.warning}44` },
  info:    { Icon: Info,         color: T.primary,  border: `${T.primary}44` },
} as const

export default function Toast({ message, variant, onDismiss }: Props) {
  const { Icon, color, border } = CONFIGS[variant]
  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        pointerEvents: 'all',
        display: 'flex', alignItems: 'center', gap: 10,
        background: T.card,
        border: `1px solid ${border}`,
        borderLeft: `4px solid ${color}`,
        borderRadius: T.r,
        padding: '12px 14px',
        minWidth: 280, maxWidth: 400,
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        color: T.text, fontSize: 14,
        animation: 'toast-in 0.18s ease',
      }}
    >
      <Icon size={17} color={color} aria-hidden="true" />
      <span style={{ flex: 1, lineHeight: 1.4 }}>{message}</span>
      <button
        onClick={onDismiss}
        aria-label="Cerrar notificación"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: T.faint, width: 24, height: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 4,
        }}
      >
        <X size={14} />
      </button>
    </div>
  )
}
