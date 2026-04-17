import type { CSSProperties } from 'react'

// Matches kisoko/project/tokens.css — the design system contract.
export const color = {
  // ── Canvas / backgrounds ──
  bg:          '#0f1117',
  bgLower:     '#080b12',
  bgRaised:    '#171c2a',
  bgShell:     'radial-gradient(ellipse at 30% 0%, #171c2a 0%, #0b0f17 55%, #080b12 100%)',
  bgLogin:     'radial-gradient(ellipse at 50% 20%, #2a3345 0%, #1a1f2c 45%, #0f131b 100%)',
  bgSidebar:   'linear-gradient(180deg, #0b0f17 0%, #0d1220 100%)',

  // ── Surfaces ──
  surface:     '#1a1d27',            // cards, modals
  surface2:    '#161c2a',            // dropdowns, popovers
  surfaceSoft: 'rgba(255,255,255,0.04)',
  surfaceGlass:'rgba(255,255,255,0.06)',
  surfaceHover:'rgba(255,255,255,0.07)',

  // ── Borders ──
  border:      '#2a2d3a',            // hairlines
  borderSoft:  'rgba(255,255,255,0.04)',
  borderGlass: 'rgba(255,255,255,0.08)',
  borderHi:    'rgba(255,255,255,0.10)',

  // ── Text ──
  text:        '#e2e8f0',
  textStrong:  '#f5f7fa',
  textSoft:    '#e2e8f0',
  muted:       '#8b95a9',
  mutedDeep:   '#64748b',
  mutedFaint:  '#94a3b8',

  // ── Brand (indigo — primary) ──
  brand:       '#6366f1',
  brand400:    '#818cf8',
  brand600:    '#4f46e5',
  brand700:    '#4338ca',
  brandTint:   'rgba(99,102,241,0.13)',
  brandTintSoft:'rgba(99,102,241,0.06)',
  brandGlow:   'rgba(99,102,241,0.35)',

  // ── Accents ──
  cyan:        '#22d3ee',
  sky:         '#38bdf8',
  skyTint:     'rgba(56,189,248,0.08)',
  skyGlow:     'rgba(56,189,248,0.35)',
  blue:        '#3b82f6',
  violet:      '#7c3aed',

  // ── Status ──
  success:     '#22c55e',
  success600:  '#16a34a',
  successTint: 'rgba(34,197,94,0.10)',
  successBorder:'rgba(34,197,94,0.30)',

  warning:     '#f59e0b',
  warningTint: 'rgba(245,158,11,0.10)',
  warningBorder:'rgba(245,158,11,0.30)',

  danger:      '#ef4444',
  danger300:   '#fca5a5',
  dangerTint:  'rgba(239,68,68,0.10)',
  dangerBorder:'rgba(239,68,68,0.30)',

  // ── Legacy aliases (para los screens ya escritos) ──
  accent:      '#6366f1',            // ahora es indigo (antes era sky)
  accentSoft:  'rgba(99,102,241,0.13)',
  accentRing:  'rgba(99,102,241,0.35)',
  bgGradient:  'radial-gradient(ellipse at 30% 0%, #171c2a 0%, #0b0f17 55%, #080b12 100%)',
  bgSolid:     '#0b0f17',
  surfaceHi:   'rgba(255,255,255,0.06)',
  brandGrad:   'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #3b82f6 100%)',
  ctaGrad:     'linear-gradient(90deg, #22d3ee 0%, #3b82f6 50%, #4f46e5 100%)',
  activeGrad:  'linear-gradient(90deg, rgba(99,102,241,0.18) 0%, rgba(99,102,241,0.06) 100%)',
  logoGrad:    'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #3b82f6 100%)',

  successSoft: 'rgba(34,197,94,0.10)',
  warningSoft: 'rgba(245,158,11,0.10)',
  dangerSoft:  'rgba(239,68,68,0.10)',
} as const

export const radius = {
  xs: 4, sm: 6, md: 8, lg: 10, xl: 12,
  '2xl': 14, '3xl': 16, '4xl': 24, pill: 999,
} as const

export const shadow = {
  xs:     '0 1px 3px rgba(0,0,0,0.06)',
  sm:     '0 4px 12px rgba(0,0,0,0.12)',
  md:     '0 8px 24px rgba(0,0,0,0.40)',
  lg:     '0 20px 60px rgba(0,0,0,0.50)',
  xl:     '0 30px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.03) inset',
  card:   '0 6px 24px rgba(0,0,0,0.25)',
  raised: '0 14px 36px rgba(0,0,0,0.35)',
  pop:    '0 20px 60px rgba(0,0,0,0.50)',

  glowBrand:   '0 6px 20px rgba(99,102,241,0.35)',
  glowSky:     '0 0 32px rgba(56,189,248,0.35)',
  glowSuccess: '0 0 12px rgba(34,197,94,0.70)',
  glow:        '0 0 24px rgba(99,102,241,0.35)',
} as const

export const font = {
  sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, "JetBrains Mono", monospace',
  base: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
} as const

export const pad = {
  xs: 8, sm: 12, md: 16, lg: 20, xl: 28,
  '0': 0, '1': 2, '2': 4, '3': 6, '4': 8, '5': 10,
  '6': 12, '7': 14, '8': 16, '9': 18, '10': 20,
  '12': 24, '14': 28, '16': 32, '20': 40, '24': 48,
} as const

export const easing = {
  out:     'cubic-bezier(0.16, 1, 0.3, 1)',
  spring:  'cubic-bezier(0.34, 1.56, 0.64, 1)',
  fluid:   'cubic-bezier(0.2, 0.9, 0.3, 1)',
} as const

export const ring = (c: string = color.accentRing): CSSProperties => ({
  boxShadow: `0 0 0 2px ${c}`,
})

export const hairline: CSSProperties = {
  border: `1px solid ${color.border}`,
}

export const glass: CSSProperties = {
  background: color.surface,
  border: `1px solid ${color.border}`,
  borderRadius: radius.lg,
}

/**
 * Splits a number into {int, cents} for the "hero" money treatment
 * used by the POS total. Argentine format (thousands with dot).
 */
export const splitMoney = (n: number): { int: string; cents: string } => {
  const int = Math.floor(Math.abs(n))
  const c = Math.round((Math.abs(n) - int) * 100).toString().padStart(2, '0')
  return { int: int.toLocaleString('es-AR'), cents: c }
}

/**
 * Formatted money with optional cents. Matches data.js from design.
 */
export const fmtMoney = (n: number, opts?: { cents?: boolean }): string => {
  const int = Math.floor(Math.abs(n))
  const sign = n < 0 ? '-' : ''
  const intStr = int.toLocaleString('es-AR')
  if (opts?.cents) {
    const c = Math.round((Math.abs(n) - int) * 100).toString().padStart(2, '0')
    return `${sign}$${intStr},${c}`
  }
  return `${sign}$${intStr}`
}
