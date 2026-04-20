import { useEffect, useRef, useId } from 'react'
import { X } from 'lucide-react'
import { T, overlayStyle } from '../theme'

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

interface Props {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  width?: number | string
}

export default function Modal({ open, onClose, title, children, width = 580 }: Props) {
  const dialogRef   = useRef<HTMLDivElement>(null)
  const prevFocus   = useRef<HTMLElement | null>(null)
  const titleId     = useId()

  useEffect(() => {
    if (!open) return
    prevFocus.current = document.activeElement as HTMLElement
    const timer = setTimeout(() => {
      dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus()
    }, 0)
    return () => {
      clearTimeout(timer)
      prevFocus.current?.focus()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const trap = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab') return
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []
      )
      if (!focusable.length) return
      const first = focusable[0]
      const last  = focusable[focusable.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus() }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', trap)
    return () => document.removeEventListener('keydown', trap)
  }, [open, onClose])

  if (!open) return null

  const w = typeof width === 'number' ? `${width}px` : width

  return (
    <div
      style={overlayStyle}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: T.rXl,
          padding: 28,
          width: `min(${w}, calc(100vw - 32px))`,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}
      >
        {title && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div id={titleId} style={{ fontSize: 18, fontWeight: 700, color: T.text }}>{title}</div>
            <button
              onClick={onClose}
              aria-label="Cerrar modal"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.sub, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4 }}
            >
              <X size={20} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
