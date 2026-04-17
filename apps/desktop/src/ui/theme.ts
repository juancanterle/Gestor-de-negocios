import type { CSSProperties } from 'react'

export const color = {
  bgGradient:  'radial-gradient(ellipse at 30% 0%, #171c2a 0%, #0b0f17 55%, #080b12 100%)',
  bgSolid:     '#0b0f17',

  surface:     'rgba(255,255,255,0.04)',
  surfaceHi:   'rgba(255,255,255,0.06)',
  surfaceHover:'rgba(255,255,255,0.07)',
  border:      'rgba(255,255,255,0.06)',
  borderHi:    'rgba(255,255,255,0.10)',

  text:        '#f5f7fa',
  textSoft:    '#e2e8f0',
  muted:       '#8b95a9',
  mutedDeep:   '#64748b',

  accent:      '#38bdf8',
  accentSoft:  'rgba(56,189,248,0.14)',
  accentRing:  'rgba(56,189,248,0.35)',
  brandGrad:   'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #3b82f6 100%)',

  success:     '#22c55e',
  successSoft: 'rgba(34,197,94,0.14)',
  warning:     '#f59e0b',
  warningSoft: 'rgba(245,158,11,0.14)',
  danger:      '#ef4444',
  dangerSoft:  'rgba(239,68,68,0.14)',
} as const

export const radius = { sm: 8, md: 10, lg: 14, xl: 18, pill: 999 } as const

export const shadow = {
  card:   '0 6px 24px rgba(0,0,0,0.25)',
  raised: '0 14px 36px rgba(0,0,0,0.35)',
  pop:    '0 20px 60px rgba(0,0,0,0.5)',
  glow:   '0 0 24px rgba(56,189,248,0.35)',
} as const

export const font = {
  base:  'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  mono:  'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
} as const

export const pad = { xs: 8, sm: 12, md: 16, lg: 20, xl: 28 } as const

export const ring = (c: string = color.accentRing): CSSProperties => ({
  boxShadow: `0 0 0 3px ${c}`,
})

export const hairline: CSSProperties = {
  border: `1px solid ${color.border}`,
}

export const glass: CSSProperties = {
  background: color.surface,
  border: `1px solid ${color.border}`,
  borderRadius: radius.lg,
}
