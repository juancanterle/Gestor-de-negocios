import { useState, useEffect } from 'react'
import { ArrowUpCircle, ArrowDownCircle, Lock, Unlock, Banknote, Smartphone } from 'lucide-react'
import { T, labelStyle } from '../theme'
import { inp } from '../styles/inputs'
import { useToast } from '../hooks/useToast'
import { unwrap } from '../lib/api'
import type { User, CashRegister, CashMovement } from '../types/api'

const fmt = (n: number) =>
  n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 })

const typeLabel: Record<string, string> = {
  OPENING: 'Apertura', SALE_CASH: 'Venta efectivo', SALE_TRANSFER: 'Transferencia',
  MANUAL_IN: 'Ingreso manual', MANUAL_OUT: 'Egreso manual', CLOSING: 'Cierre',
}
const typeColor: Record<string, string> = {
  OPENING: T.sub, SALE_CASH: T.cash, SALE_TRANSFER: T.transfer,
  MANUAL_IN: T.cash, MANUAL_OUT: T.danger, CLOSING: T.sub,
}

export default function CashRegisterScreen({ user }: { user: User }) {
  const [register, setRegister]     = useState<CashRegister | null>(null)
  const [movements, setMovements]   = useState<CashMovement[]>([])
  const [openingAmt, setOpeningAmt] = useState('')
  const [view, setView]             = useState<'current' | 'close' | 'movement'>('current')
  const [closeAmt, setCloseAmt]     = useState('')
  const [closeNotes, setCloseNotes] = useState('')
  const [movType, setMovType]       = useState<'MANUAL_IN' | 'MANUAL_OUT'>('MANUAL_IN')
  const [movAmt, setMovAmt]         = useState('')
  const [movDesc, setMovDesc]       = useState('')
  const [openError, setOpenError]   = useState('')
  const toast = useToast()

  const load = async () => {
    try {
      const r = unwrap(await window.api.cashRegister.getCurrent())
      setRegister(r ?? null)
      if (r) setMovements(unwrap(await window.api.cashRegister.getMovements(r.id)))
    } catch {
      setRegister(null)
    }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load legítimo
  useEffect(() => { void load() }, [])

  const handleOpen = async () => {
    const amount = parseFloat(openingAmt) || 0
    if (amount < 0) {
      setOpenError('El monto de apertura no puede ser negativo')
      return
    }
    setOpenError('')
    try {
      const r = await window.api.cashRegister.open({ user_id: user.id, opening_amount: amount })
      if (!r.ok) { toast.error(r.error); return }
      setOpeningAmt('')
      load()
    } catch {
      toast.error('No se pudo abrir la caja')
    }
  }

  const handleClose = async () => {
    if (!register) return
    try {
      await window.api.cashRegister.close({
        id: register.id,
        closing_amount: parseFloat(closeAmt) || 0,
        notes: closeNotes,
        user_id: user.id,
      })
      setView('current')
      toast.success('Caja cerrada correctamente')
      load()
    } catch {
      toast.error('No se pudo cerrar la caja')
    }
  }

  const handleMovement = async () => {
    if (!register || !movAmt) return
    try {
      const res = await window.api.cashRegister.addMovement({
        cash_register_id: register.id,
        type: movType,
        amount: parseFloat(movAmt),
        description: movDesc || undefined,
        user_id: user.id,
      })
      if (!res.ok) { toast.error(res.error); return }
      // Optimistic update — usamos la respuesta del IPC en vez de re-fetchear
      setMovements(prev => [...prev, res.data])
      setMovAmt(''); setMovDesc(''); setView('current')
      toast.success('Movimiento registrado')
    } catch {
      toast.error('No se pudo registrar el movimiento')
    }
  }

  const salesCash     = movements.filter(m => m.type === 'SALE_CASH').reduce((s, m) => s + m.amount, 0)
  const salesTransfer = movements.filter(m => m.type === 'SALE_TRANSFER').reduce((s, m) => s + m.amount, 0)
  const manualIn      = movements.filter(m => m.type === 'MANUAL_IN').reduce((s, m) => s + m.amount, 0)
  const manualOut     = movements.filter(m => m.type === 'MANUAL_OUT').reduce((s, m) => s + m.amount, 0)
  const theoretical   = (register?.opening_amount || 0) + salesCash + manualIn - manualOut

  const totalsRows: { label: string; value: number; color: string; icon: React.ReactNode }[] = [
    { label: 'Apertura',          value: register?.opening_amount ?? 0, color: T.sub,      icon: <Unlock size={14} aria-hidden="true" /> },
    { label: 'Ventas efectivo',   value: salesCash,                     color: T.cash,     icon: <Banknote size={14} aria-hidden="true" /> },
    { label: 'Transferencias',    value: salesTransfer,                 color: T.transfer, icon: <Smartphone size={14} aria-hidden="true" /> },
    { label: 'Ingresos manuales', value: manualIn,                      color: T.cash,     icon: <ArrowUpCircle size={14} aria-hidden="true" /> },
    { label: 'Egresos manuales',  value: -manualOut,                    color: T.danger,   icon: <ArrowDownCircle size={14} aria-hidden="true" /> },
  ]

  // ── Abrir caja ──
  if (!register) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg }}>
      <div style={{
        background: T.card, border: `1px solid ${T.border}`, borderRadius: T.rXl,
        padding: '44px 48px', width: 420, textAlign: 'center',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', margin: '0 auto 20px', background: `${T.primary}18`, border: `2px solid ${T.primary}55`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Unlock size={34} color={T.primary} />
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: T.text, marginBottom: 8 }}>Abrir caja</div>
        <div style={{ color: T.sub, fontSize: 14, marginBottom: 28 }}>Ingresá el monto inicial en efectivo</div>
        <label htmlFor="cash-opening" style={{ ...labelStyle, textAlign: 'left', display: 'block', marginBottom: 8 }}>
          Monto inicial
        </label>
        <input
          id="cash-opening"
          type="number"
          value={openingAmt}
          onChange={e => { setOpeningAmt(e.target.value); setOpenError('') }}
          onKeyDown={e => e.key === 'Enter' && handleOpen()}
          placeholder="$ 0"
          min={0}
          autoFocus
          style={{ ...inp, fontSize: 32, fontWeight: 800, textAlign: 'center', marginBottom: openError ? 8 : 20, padding: '16px 14px' }}
        />
        {openError && (
          <div style={{ color: T.danger, fontSize: 13, marginBottom: 16, textAlign: 'left' }}>{openError}</div>
        )}
        <button onClick={handleOpen} style={{
          width: '100%', padding: '15px 0', borderRadius: T.r, border: 'none',
          background: T.gradPrimary, color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer',
          boxShadow: T.shadowPrimary,
        }}>
          Abrir caja
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ flex: 1, display: 'flex', height: '100%', overflow: 'hidden', background: T.bg }}>

      {/* Panel izquierdo — resumen */}
      <div style={{ width: 290, borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', background: T.surface }}>

        <div style={{ padding: '18px 20px', borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: T.cash, display: 'inline-block', boxShadow: `0 0 8px ${T.cash}` }} aria-hidden="true" />
            <span style={{ color: T.cash, fontSize: 13, fontWeight: 700, letterSpacing: '0.05em' }}>CAJA ABIERTA</span>
          </div>
          <div style={{ fontSize: 11, color: T.sub }}>
            Abierta a las {new Date(register.opened_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {totalsRows.map(({ label, value, color, icon }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: `1px solid ${T.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color }}>
                {icon}
                <span style={{ color: T.sub, fontSize: 13 }}>{label}</span>
              </div>
              <span style={{ color, fontWeight: 700, fontSize: 14 }}>{fmt(Math.abs(value))}</span>
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', marginTop: 4 }}>
            <span style={{ color: T.text, fontWeight: 700, fontSize: 14 }}>Total en caja</span>
            <span style={{ color: T.primary, fontWeight: 900, fontSize: 26, letterSpacing: '-0.5px' }}>
              {fmt(theoretical)}
            </span>
          </div>
        </div>

        <div style={{ padding: '14px 16px', borderTop: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={() => setView('movement')} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '12px 0', borderRadius: T.r,
            border: `1.5px solid ${T.border}`, background: 'transparent',
            color: T.text, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            <ArrowUpCircle size={17} color={T.cash} aria-hidden="true" /> Registrar movimiento
          </button>
          <button onClick={() => { setCloseAmt(''); setView('close') }} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '12px 0', borderRadius: T.r, border: 'none',
            background: T.danger, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>
            <Lock size={15} aria-hidden="true" /> Cerrar caja
          </button>
        </div>
      </div>

      {/* Panel derecho */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {view === 'current' && (
          <>
            <div style={{ padding: '16px 24px', borderBottom: `1px solid ${T.border}`, background: T.surface }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Movimientos del turno</div>
              <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>{movements.length} movimiento{movements.length !== 1 ? 's' : ''}</div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
                <thead style={{ background: T.surface, position: 'sticky', top: 0 }}>
                  <tr style={{ color: T.sub, fontSize: 11, fontWeight: 600, letterSpacing: '0.05em' }}>
                    <th scope="col" style={{ padding: '10px 24px', textAlign: 'left' }}>HORA</th>
                    <th scope="col" style={{ padding: '10px 8px', textAlign: 'left' }}>TIPO</th>
                    <th scope="col" style={{ padding: '10px 8px', textAlign: 'left' }}>DESCRIPCIÓN</th>
                    <th scope="col" style={{ padding: '10px 24px', textAlign: 'right' }}>MONTO</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map(m => (
                    <tr key={m.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                      <td style={{ padding: '11px 24px', color: T.sub, fontSize: 13 }}>
                        {new Date(m.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '11px 8px' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: typeColor[m.type] || T.sub, background: `${typeColor[m.type] || T.sub}18`, padding: '3px 8px', borderRadius: 20 }}>
                          {typeLabel[m.type] || m.type}
                        </span>
                      </td>
                      <td style={{ padding: '11px 8px', color: T.sub, fontSize: 13 }}>{m.description || '—'}</td>
                      <td style={{ padding: '11px 24px', textAlign: 'right', fontWeight: 700, fontSize: 14, color: m.type === 'MANUAL_OUT' ? T.danger : T.cash }}>
                        {m.type === 'MANUAL_OUT' ? '-' : '+'}{fmt(m.amount)}
                      </td>
                    </tr>
                  ))}
                  {movements.length === 0 && (
                    <tr><td colSpan={4} style={{ padding: 48, textAlign: 'center', color: T.sub, fontSize: 14 }}>Sin movimientos aún</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {view === 'movement' && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: T.rXl, padding: 32, width: `min(420px, calc(100vw - 32px))` }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: T.text, marginBottom: 24 }}>Registrar movimiento</div>

              <div style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
                {(['MANUAL_IN', 'MANUAL_OUT'] as const).map(t => (
                  <button key={t} onClick={() => setMovType(t)} style={{
                    flex: 1, padding: '13px 0', borderRadius: T.r, fontWeight: 700, fontSize: 14,
                    border: `2px solid ${movType === t ? (t === 'MANUAL_IN' ? T.cash : T.danger) : T.border}`,
                    background: movType === t ? (t === 'MANUAL_IN' ? T.cashBg : T.dangerBg) : 'transparent',
                    color: movType === t ? (t === 'MANUAL_IN' ? T.cash : T.danger) : T.sub,
                    cursor: 'pointer', transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}>
                    {t === 'MANUAL_IN'
                      ? <><ArrowUpCircle size={17} aria-hidden="true" /> Ingreso</>
                      : <><ArrowDownCircle size={17} aria-hidden="true" /> Egreso</>}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label htmlFor="mov-amount" style={labelStyle}>Monto *</label>
                  <input
                    id="mov-amount"
                    type="number"
                    value={movAmt}
                    onChange={e => setMovAmt(e.target.value)}
                    style={{ ...inp, fontSize: 24, fontWeight: 700, textAlign: 'center', padding: '14px' }}
                    placeholder="$ 0"
                    autoFocus
                    min={0}
                  />
                </div>
                <div>
                  <label htmlFor="mov-desc" style={labelStyle}>Descripción</label>
                  <input
                    id="mov-desc"
                    value={movDesc}
                    onChange={e => setMovDesc(e.target.value)}
                    style={inp}
                    placeholder="Ej: Pago de proveedor, retiro..."
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                <button onClick={() => setView('current')} style={{
                  flex: 1, padding: '12px 0', borderRadius: T.r,
                  border: `1.5px solid ${T.border}`, background: 'transparent',
                  color: T.sub, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}>Cancelar</button>
                <button onClick={handleMovement} disabled={!movAmt} style={{
                  flex: 2, padding: '12px 0', borderRadius: T.r, border: 'none',
                  background: movAmt ? T.primary : T.border,
                  color: '#fff', fontSize: 14, fontWeight: 700,
                  cursor: movAmt ? 'pointer' : 'default',
                  boxShadow: movAmt ? T.shadowPrimary : 'none',
                }}>Registrar</button>
              </div>
            </div>
          </div>
        )}

        {view === 'close' && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: T.rXl, padding: 32, width: `min(460px, calc(100vw - 32px))` }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: T.text, marginBottom: 6 }}>Cierre de caja</div>
              <div style={{ color: T.sub, fontSize: 13, marginBottom: 24 }}>Contá el efectivo físico e ingresá el total.</div>

              <div style={{ background: T.bg, borderRadius: T.r, padding: '14px 18px', marginBottom: 22, border: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: T.sub, fontSize: 13 }}>Monto teórico en caja</span>
                <span style={{ color: T.text, fontWeight: 800, fontSize: 20 }}>{fmt(theoretical)}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 22 }}>
                <div>
                  <label htmlFor="close-amount" style={labelStyle}>Dinero contado *</label>
                  <input
                    id="close-amount"
                    type="number"
                    value={closeAmt}
                    onChange={e => setCloseAmt(e.target.value)}
                    style={{ ...inp, fontSize: 28, fontWeight: 800, textAlign: 'center', padding: '15px' }}
                    placeholder="$ 0"
                    autoFocus
                    min={0}
                  />
                </div>

                {closeAmt && (() => {
                  const diff = parseFloat(closeAmt) - theoretical
                  const color = diff === 0 ? T.cash : Math.abs(diff) < 100 ? T.warning : T.danger
                  return (
                    <div style={{ padding: '13px 18px', borderRadius: T.r, background: `${color}15`, border: `1px solid ${color}55`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 14, color: T.sub }}>Diferencia</span>
                      <span style={{ fontWeight: 800, color, fontSize: 22 }}>{diff >= 0 ? '+' : ''}{fmt(diff)}</span>
                    </div>
                  )
                })()}

                <div>
                  <label htmlFor="close-notes" style={labelStyle}>Observaciones</label>
                  <input
                    id="close-notes"
                    value={closeNotes}
                    onChange={e => setCloseNotes(e.target.value)}
                    style={inp}
                    placeholder="Opcional"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setView('current')} style={{
                  flex: 1, padding: '13px 0', borderRadius: T.r,
                  border: `1.5px solid ${T.border}`, background: 'transparent',
                  color: T.sub, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}>Cancelar</button>
                <button onClick={handleClose} disabled={!closeAmt} style={{
                  flex: 2, padding: '13px 0', borderRadius: T.r, border: 'none',
                  background: closeAmt ? T.danger : T.border,
                  color: '#fff', fontSize: 14, fontWeight: 700,
                  cursor: closeAmt ? 'pointer' : 'default',
                }}>Confirmar cierre</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
