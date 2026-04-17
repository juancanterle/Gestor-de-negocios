import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'
import { color, radius } from './theme'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
type Size = 'sm' | 'md' | 'lg'

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'style'> {
  variant?: Variant
  size?: Size
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  full?: boolean
  loading?: boolean
  style?: CSSProperties
}

const SIZES: Record<Size, CSSProperties> = {
  sm: { padding: '8px 12px',  fontSize: 13, borderRadius: radius.md, gap: 6 },
  md: { padding: '10px 16px', fontSize: 14, borderRadius: radius.md, gap: 8 },
  lg: { padding: '14px 22px', fontSize: 15, borderRadius: radius.lg, gap: 10 },
}

const VARIANTS: Record<Variant, CSSProperties> = {
  primary: {
    background: color.brandGrad,
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 8px 22px rgba(79,70,229,0.35)',
  },
  secondary: {
    background: color.surface,
    color: color.text,
    border: `1px solid ${color.border}`,
  },
  ghost: {
    background: 'transparent',
    color: color.muted,
    border: '1px solid transparent',
  },
  danger: {
    background: color.dangerSoft,
    color: color.danger,
    border: '1px solid rgba(239,68,68,0.28)',
  },
  success: {
    background: color.successSoft,
    color: color.success,
    border: '1px solid rgba(34,197,94,0.28)',
  },
}

const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  {
    variant = 'secondary', size = 'md',
    leftIcon, rightIcon, full, loading, disabled,
    style, children, ...rest
  },
  ref,
) {
  const base: CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 600, cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
    transition: 'transform 0.12s ease, filter 0.15s ease, background 0.15s ease, border-color 0.15s',
    opacity: (disabled || loading) ? 0.55 : 1,
    width: full ? '100%' : undefined,
    fontFamily: 'inherit',
    userSelect: 'none',
    whiteSpace: 'nowrap',
  }

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      {...rest}
      style={{ ...base, ...SIZES[size], ...VARIANTS[variant], ...style }}
      onMouseDown={(e) => {
        if (!disabled && !loading) e.currentTarget.style.transform = 'translateY(1px)'
        rest.onMouseDown?.(e)
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = ''
        rest.onMouseUp?.(e)
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = ''
        rest.onMouseLeave?.(e)
      }}
    >
      {leftIcon}
      {loading ? 'Cargando…' : children}
      {rightIcon}
    </button>
  )
})

export default Button
