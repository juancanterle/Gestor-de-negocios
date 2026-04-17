import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import gsap from 'gsap'
import Card from './Card'
import { color } from './theme'

interface Props {
  label: string
  value: number
  prefix?: string
  format?: (n: number) => string
  sub?: ReactNode
  accent?: string
  animate?: boolean
}

export default function KPI({
  label, value, prefix, format, sub,
  accent = color.accent, animate = true,
}: Props) {
  const numRef = useRef<HTMLDivElement>(null)
  const prev = useRef<number>(0)

  useEffect(() => {
    if (!animate || !numRef.current) return
    const obj = { n: prev.current }
    const tween = gsap.to(obj, {
      n: value, duration: 0.9, ease: 'power3.out',
      onUpdate: () => {
        if (!numRef.current) return
        numRef.current.textContent = (prefix || '') + (format ? format(obj.n) : Math.round(obj.n).toString())
      },
    })
    prev.current = value
    return () => { tween.kill() }
  }, [value, animate, format, prefix])

  return (
    <Card padding={18} hoverable>
      <div style={{
        fontSize: 10, letterSpacing: 1.4, fontWeight: 700,
        color: color.mutedDeep, textTransform: 'uppercase', marginBottom: 10,
      }}>
        {label}
      </div>
      <div
        ref={numRef}
        style={{
          fontSize: 26, fontWeight: 800, letterSpacing: -0.5,
          color: accent, lineHeight: 1.1,
        }}
      >
        {(prefix || '') + (format ? format(value) : value)}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: color.muted, marginTop: 6 }}>{sub}</div>
      )}
    </Card>
  )
}
