import { T } from '../theme'

interface Props {
  variant?: 'line' | 'box' | 'circle'
  width?: number | string
  height?: number | string
}

const DEFAULT_HEIGHT = { line: 16, box: 80, circle: 40 }

export default function Skeleton({ variant = 'line', width = '100%', height }: Props) {
  const h = height ?? DEFAULT_HEIGHT[variant]
  const radius = variant === 'circle' ? '50%' : T.r
  const w = typeof width === 'number' ? `${width}px` : width
  const hStr = typeof h === 'number' ? `${h}px` : h

  return (
    <div
      aria-hidden="true"
      style={{
        width: w, height: hStr, borderRadius: radius,
        background: T.surface,
        backgroundImage: `linear-gradient(90deg, ${T.surface} 0%, ${T.hover} 50%, ${T.surface} 100%)`,
        backgroundSize: '200% 100%',
        animation: 'skeleton-shimmer 1.4s ease infinite',
      }}
    />
  )
}
