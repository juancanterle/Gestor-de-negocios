import { useState, useCallback } from 'react'
import Modal from './Modal'
import { T } from '../theme'
import { ConfirmContext, type ConfirmOptions } from './confirm-context'

interface DialogState {
  open:    boolean
  opts:    ConfirmOptions
  resolve: (v: boolean) => void
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DialogState>({
    open: false, opts: { title: '', message: '' }, resolve: () => {},
  })

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> =>
    new Promise(resolve => setState({ open: true, opts, resolve })),
  [])

  const close = (value: boolean) => {
    state.resolve(value)
    setState(s => ({ ...s, open: false }))
  }

  const actionBg = state.opts.variant === 'danger' ? T.danger : T.primaryD

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal open={state.open} onClose={() => close(false)} title={state.opts.title} width={420}>
        <div style={{ color: T.sub, fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
          {state.opts.message}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={() => close(false)}
            style={{
              padding: '10px 18px', borderRadius: T.r,
              border: `1.5px solid ${T.border}`, background: 'transparent',
              color: T.sub, fontSize: 13, cursor: 'pointer',
            }}
          >
            {state.opts.cancelLabel ?? 'Cancelar'}
          </button>
          <button
            onClick={() => close(true)}
            style={{
              padding: '10px 18px', borderRadius: T.r, border: 'none',
              background: actionBg, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {state.opts.confirmLabel ?? 'Confirmar'}
          </button>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  )
}
