import { useState, useCallback, useRef } from 'react'
import Toast, { type ToastVariant } from './Toast'
import { ToastContext, type ToastContextValue } from './toast-context'

interface ToastItem { id: number; message: string; variant: ToastVariant }

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const counter           = useRef(0)

  const show = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = ++counter.current
    setItems(prev => [...prev, { id, message, variant }])
    setTimeout(() => setItems(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  const ctx: ToastContextValue = {
    toast:   show,
    success: m => show(m, 'success'),
    error:   m => show(m, 'error'),
    warning: m => show(m, 'warning'),
    info:    m => show(m, 'info'),
  }

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          display: 'flex', flexDirection: 'column', gap: 10,
          pointerEvents: 'none',
        }}
      >
        {items.map(t => (
          <Toast
            key={t.id}
            message={t.message}
            variant={t.variant}
            onDismiss={() => setItems(prev => prev.filter(x => x.id !== t.id))}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

