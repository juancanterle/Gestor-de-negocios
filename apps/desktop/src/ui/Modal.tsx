import { useEffect, useRef } from 'react'
import type { ReactNode, CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import gsap from 'gsap'
import { color, radius, shadow } from './theme'

interface Props {
  open: boolean
  onClose: () => void
  title?: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
  width?: number | string
  closeOnBackdrop?: boolean
  closeOnEsc?: boolean
}

export default function Modal({
  open, onClose, title, subtitle, children, footer,
  width = 520,
  closeOnBackdrop = true,
  closeOnEsc = true,
}: Props) {
  const backdropRef = useRef<HTMLDivElement>(null)
  const cardRef     = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    if (!closeOnEsc) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, closeOnEsc, onClose])

  useEffect(() => {
    if (!open) return
    const ctx = gsap.context(() => {
      gsap.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'power2.out' })
      gsap.fromTo(cardRef.current,
        { y: 14, opacity: 0, scale: 0.98 },
        { y: 0, opacity: 1, scale: 1, duration: 0.35, ease: 'power3.out' })
    })
    return () => ctx.revert()
  }, [open])

  if (!open) return null

  const styles: Record<string, CSSProperties> = {
    backdrop: {
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(6,9,16,0.66)',
      backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    },
    card: {
      position: 'relative',
      width, maxWidth: '100%',
      maxHeight: 'calc(100vh - 48px)',
      background: 'linear-gradient(180deg, #151a28 0%, #0f1320 100%)',
      border: `1px solid ${color.borderHi}`,
      borderRadius: radius.xl,
      boxShadow: shadow.pop,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    },
    head: {
      padding: '20px 24px 12px',
      borderBottom: `1px solid ${color.border}`,
    },
    title: { fontSize: 18, color: color.text, fontWeight: 700, letterSpacing: -0.2 },
    subtitle: { fontSize: 13, color: color.muted, marginTop: 4 },
    close: {
      position: 'absolute', top: 14, right: 14,
      width: 32, height: 32, borderRadius: 10,
      border: `1px solid ${color.border}`,
      background: color.surface,
      color: color.muted, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    body: {
      padding: '20px 24px',
      overflowY: 'auto',
      flex: 1,
    },
    footer: {
      padding: '14px 24px',
      borderTop: `1px solid ${color.border}`,
      display: 'flex', justifyContent: 'flex-end', gap: 10,
      background: 'rgba(255,255,255,0.02)',
    },
  }

  const node = (
    <div
      ref={backdropRef}
      style={styles.backdrop}
      onMouseDown={e => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose()
      }}
    >
      <div ref={cardRef} style={styles.card} role="dialog" aria-modal="true">
        <button onClick={onClose} style={styles.close} aria-label="Cerrar">
          <X size={16} />
        </button>
        {(title || subtitle) && (
          <div style={styles.head}>
            {title    && <div style={styles.title}>{title}</div>}
            {subtitle && <div style={styles.subtitle}>{subtitle}</div>}
          </div>
        )}
        <div style={styles.body}>{children}</div>
        {footer && <div style={styles.footer}>{footer}</div>}
      </div>
    </div>
  )

  return createPortal(node, document.body)
}
