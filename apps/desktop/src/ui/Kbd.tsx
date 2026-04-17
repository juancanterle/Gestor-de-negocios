import type { CSSProperties, ReactNode } from 'react'
import { color, font, radius } from './theme'

interface Props {
  children: ReactNode
  tone?: 'default' | 'inverted'
  style?: CSSProperties
}

export default function Kbd({ children, tone = 'default', style }: Props) {
  const isInverted = tone === 'inverted'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      fontFamily: font.mono, fontSize: 10,
      padding: '2px 6px',
      borderRadius: radius.sm,
      background: isInverted ? 'rgba(255,255,255,0.18)' : 'transparent',
      border: isInverted ? 'none' : `1px solid ${color.border}`,
      color: isInverted ? '#fff' : color.mutedDeep,
      fontWeight: 600,
      letterSpacing: 0.2,
      lineHeight: 1.4,
      ...style,
    }}>
      {children}
    </span>
  )
}
