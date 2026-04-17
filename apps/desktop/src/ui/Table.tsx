import type { CSSProperties, ReactNode, ThHTMLAttributes, TdHTMLAttributes } from 'react'
import { color, radius } from './theme'

interface TableProps {
  children: ReactNode
  style?: CSSProperties
}

export default function Table({ children, style }: TableProps) {
  return (
    <div style={{
      border: `1px solid ${color.border}`,
      borderRadius: radius.lg,
      overflow: 'hidden',
      background: color.surface,
      ...style,
    }}>
      <table style={{
        width: '100%', borderCollapse: 'collapse', fontSize: 14,
        color: color.text,
      }}>
        {children}
      </table>
    </div>
  )
}

export function Th({ children, style, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      {...rest}
      style={{
        padding: '12px 14px', textAlign: 'left', fontWeight: 700,
        fontSize: 10, letterSpacing: 1.3, textTransform: 'uppercase',
        color: color.mutedDeep,
        background: 'rgba(255,255,255,0.02)',
        borderBottom: `1px solid ${color.border}`,
        ...style,
      }}
    >
      {children}
    </th>
  )
}

export function Td({ children, style, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      {...rest}
      style={{
        padding: '12px 14px',
        borderBottom: `1px solid ${color.border}`,
        fontSize: 13,
        color: color.textSoft,
        ...style,
      }}
    >
      {children}
    </td>
  )
}

export function Tr({ children, style, onClick, hoverable = true }: {
  children: ReactNode
  style?: CSSProperties
  onClick?: () => void
  hoverable?: boolean
}) {
  return (
    <tr
      onClick={onClick}
      onMouseEnter={e => {
        if (hoverable) e.currentTarget.style.background = 'rgba(255,255,255,0.025)'
      }}
      onMouseLeave={e => {
        if (hoverable) e.currentTarget.style.background = 'transparent'
      }}
      style={{
        cursor: onClick ? 'pointer' : undefined,
        transition: 'background 0.12s ease',
        ...style,
      }}
    >
      {children}
    </tr>
  )
}

export function EmptyRow({ cols, children }: { cols: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={cols} style={{
        padding: '40px 14px', textAlign: 'center',
        color: color.muted, fontSize: 13,
      }}>
        {children}
      </td>
    </tr>
  )
}
