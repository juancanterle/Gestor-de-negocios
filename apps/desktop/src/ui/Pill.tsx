import type { CSSProperties, ReactNode } from 'react'
import { color, radius } from './theme'

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger'

interface Props {
  tone?: Tone
  dot?: boolean
  children: ReactNode
  style?: CSSProperties
}

const TONES: Record<Tone, { bg: string; fg: string; ring: string }> = {
  neutral: { bg: color.surface,     fg: color.muted,   ring: color.border },
  accent:  { bg: color.accentSoft,  fg: color.accent,  ring: 'rgba(56,189,248,0.28)' },
  success: { bg: color.successSoft, fg: color.success, ring: 'rgba(34,197,94,0.28)' },
  warning: { bg: color.warningSoft, fg: color.warning, ring: 'rgba(245,158,11,0.28)' },
  danger:  { bg: color.dangerSoft,  fg: color.danger,  ring: 'rgba(239,68,68,0.28)' },
}

export default function Pill({ tone = 'neutral', dot, children, style }: Props) {
  const t = TONES[tone]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px',
      borderRadius: radius.pill,
      background: t.bg, color: t.fg,
      border: `1px solid ${t.ring}`,
      fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
      textTransform: 'uppercase',
      ...style,
    }}>
      {dot && (
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: t.fg,
          boxShadow: `0 0 8px ${t.fg}`,
        }} />
      )}
      {children}
    </span>
  )
}
