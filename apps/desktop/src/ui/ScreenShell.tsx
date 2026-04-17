import { useRef } from 'react'
import type { ReactNode } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { color } from './theme'

interface Props {
  children: ReactNode
  padding?: number
}

export default function ScreenShell({ children, padding = 28 }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const kids = ref.current?.querySelectorAll('[data-enter]')
    if (!kids || kids.length === 0) return
    gsap.from(kids, {
      y: 14, opacity: 0, duration: 0.45,
      stagger: 0.06, ease: 'power3.out',
    })
  }, { scope: ref })

  return (
    <div
      ref={ref}
      style={{
        padding, height: '100%',
        background: 'transparent',
        color: color.text,
      }}
    >
      {children}
    </div>
  )
}
