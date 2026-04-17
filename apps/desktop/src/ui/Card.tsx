import { forwardRef } from 'react'
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'
import { color, radius, shadow } from './theme'

interface Props extends HTMLAttributes<HTMLDivElement> {
  padding?: number | string
  hoverable?: boolean
  elevated?: boolean
  children?: ReactNode
}

const Card = forwardRef<HTMLDivElement, Props>(function Card({
  padding = 20, hoverable, elevated, style, children, ...rest
}, ref) {
  const base: CSSProperties = {
    background: color.surface,
    border: `1px solid ${color.border}`,
    borderRadius: radius.lg,
    padding,
    boxShadow: elevated ? shadow.raised : shadow.card,
    transition: 'border-color 0.15s ease, background 0.15s ease, transform 0.15s ease',
  }
  return (
    <div
      ref={ref}
      {...rest}
      style={{ ...base, ...style }}
      onMouseEnter={e => {
        if (hoverable) {
          e.currentTarget.style.borderColor = color.borderHi
          e.currentTarget.style.background = color.surfaceHi
        }
        rest.onMouseEnter?.(e)
      }}
      onMouseLeave={e => {
        if (hoverable) {
          e.currentTarget.style.borderColor = color.border
          e.currentTarget.style.background = color.surface
        }
        rest.onMouseLeave?.(e)
      }}
    >
      {children}
    </div>
  )
})

export default Card

export function CardTitle({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{
      fontSize: 11, letterSpacing: 1.3,
      color: color.mutedDeep, fontWeight: 700,
      textTransform: 'uppercase',
      marginBottom: 10,
      ...style,
    }}>
      {children}
    </div>
  )
}
