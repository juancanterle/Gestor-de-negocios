import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react'
import gsap from 'gsap'
import { color, radius, shadow } from './theme'

type Tone = 'success' | 'warning' | 'danger' | 'info'
interface Toast { id: number; tone: Tone; title: string; sub?: string }

interface Ctx {
  push: (t: Omit<Toast, 'id'>) => void
  success: (title: string, sub?: string) => void
  error:   (title: string, sub?: string) => void
  warn:    (title: string, sub?: string) => void
  info:    (title: string, sub?: string) => void
}

const ToastCtx = createContext<Ctx | null>(null)

export function useToast(): Ctx {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = useCallback((id: number) =>
    setToasts(list => list.filter(t => t.id !== id)), [])

  const push = useCallback((t: Omit<Toast, 'id'>) => {
    const id = nextId++
    setToasts(list => [...list, { id, ...t }])
    setTimeout(() => remove(id), 3600)
  }, [remove])

  const api: Ctx = {
    push,
    success: (title, sub) => push({ tone: 'success', title, sub }),
    error:   (title, sub) => push({ tone: 'danger',  title, sub }),
    warn:    (title, sub) => push({ tone: 'warning', title, sub }),
    info:    (title, sub) => push({ tone: 'info',    title, sub }),
  }

  return (
    <ToastCtx.Provider value={api}>
      {children}
      {createPortal(
        <div style={{
          position: 'fixed', top: 16, right: 16,
          display: 'flex', flexDirection: 'column', gap: 10,
          zIndex: 200, pointerEvents: 'none',
        }}>
          {toasts.map(t => <ToastItem key={t.id} toast={t} onDone={() => remove(t.id)} />)}
        </div>,
        document.body,
      )}
    </ToastCtx.Provider>
  )
}

const TONE_STYLES: Record<Tone, { fg: string; bg: string; ring: string; Icon: React.ComponentType<{ size?: number }> }> = {
  success: { fg: color.success, bg: color.successSoft, ring: 'rgba(34,197,94,0.28)',  Icon: CheckCircle2 },
  warning: { fg: color.warning, bg: color.warningSoft, ring: 'rgba(245,158,11,0.28)', Icon: AlertTriangle },
  danger:  { fg: color.danger,  bg: color.dangerSoft,  ring: 'rgba(239,68,68,0.28)',  Icon: XCircle },
  info:    { fg: color.accent,  bg: color.accentSoft,  ring: 'rgba(56,189,248,0.28)', Icon: Info },
}

function ToastItem({ toast, onDone }: { toast: Toast; onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const t = TONE_STYLES[toast.tone]
  const { Icon } = t

  useEffect(() => {
    if (!ref.current) return
    gsap.fromTo(ref.current,
      { x: 40, opacity: 0, scale: 0.95 },
      { x: 0, opacity: 1, scale: 1, duration: 0.35, ease: 'power3.out' }
    )
    const timer = setTimeout(() => {
      if (!ref.current) return
      gsap.to(ref.current, {
        x: 40, opacity: 0, duration: 0.3, ease: 'power2.in',
        onComplete: onDone,
      })
    }, 3200)
    return () => clearTimeout(timer)
  }, [onDone])

  return (
    <div
      ref={ref}
      style={{
        pointerEvents: 'auto',
        minWidth: 280, maxWidth: 380,
        display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: '12px 14px',
        borderRadius: radius.lg,
        background: 'linear-gradient(180deg, #1a1f2e 0%, #131827 100%)',
        border: `1px solid ${t.ring}`,
        boxShadow: shadow.raised,
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: radius.md,
        background: t.bg, color: t.fg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: color.text, fontWeight: 600 }}>{toast.title}</div>
        {toast.sub && <div style={{ fontSize: 12, color: color.muted, marginTop: 2 }}>{toast.sub}</div>}
      </div>
    </div>
  )
}
