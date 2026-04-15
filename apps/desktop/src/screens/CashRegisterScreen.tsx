import { useState, useEffect } from 'react'
import { ArrowUpCircle, Lock, Unlock } from 'lucide-react'
import type { User, CashRegister, CashMovement } from '../types/api'

const $ = {
  bg: '#0f1117', surface: '#1a1d27', border: '#2a2d3a',
  text: '#e2e8f0', muted: '#64748b', primary: '#6366f1',
  success: '#22c55e', warning: '#f59e0b', danger: '#ef4444',
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

  const load = async () => {
    const r = await window.api.cashRegister.getCurrent()
    setRegister(r)
    if (r) {
      const m = await window.api.cashRegister.getMovements(r.id)
      setMovements(m)
    }
  }

  useEffect(() => { load() }, [])

  const handleOpen = async () => {
    const amt = parseFloat(openingAmt) || 0
    const r = await window.api.cashRegister.open({ user_id: user.id, opening_amount: amt })
    if ('error' in r) { alert(r.error); return }
    setOpeningAmt('')
    load()
  }

  const handleClose = async () => {
    if (!register) return
    const amt = parseFloat(closeAmt) || 0
    await window.api.cashRegister.close({ id: register.id, closing_amount: amt, notes: closeNotes, user_id: user.id })
    setView('current')
    load()
  }

  const handleMovement = async () => {
    if (!register || !movAmt) return
    await window.api.cashRegister.addMovement({
      cash_register_id: register.id,
      type: movType,
      amount: parseFloat(movAmt),
      description: movDesc || undefined,
      user_id: user.id,
    })
    setMovAmt(''); setMovDesc('')
    setView('current')
    load()
  }

  // Calcular totales del turno
  const salesCash    = movements.filter(m => m.type === 'SALE_CASH').reduce((s, m) => s + m.amount, 0)
  const salesTransfer = movements.filter(m => m.type === 'SALE_TRANSFER').reduce((s, m) => s + m.amount, 0)
  const manualIn     = movements.filter(m => m.type === 'MANUAL_IN').reduce((s, m) => s + m.amount, 0)
  const manualOut    = movements.filter(m => m.type === 'MANUAL_OUT').reduce((s, m) => s + m.amount, 0)
  const theoretical  = (register?.opening_amount || 0) + salesCash + manualIn - manualOut

  const fmt = (n: number) => n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 })

  const typeLabel: Record<string, string> = {
    OPENING: 'Apertura', SALE_CASH: 'Venta efectivo', SALE_TRANSFER: 'Venta transferencia',
    MANUAL_IN: 'Ingreso manual', MANUAL_OUT: 'Egreso manual', CLOSING: 'Cierre',
  }
  const typeColor: Record<string, string> = {
    OPENING: $.muted, SALE_CASH: $.success, SALE_TRANSFER: '#38bdf8',
    MANUAL_IN: $.success, MANUAL_OUT: $.danger, CLOSING: $.muted,
  }

  // ── Sin caja abierta ──
  if (!register) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: $.surface, border: `1px solid ${$.border}`, borderRadius: 16, padding: 36, width: 380, textAlign: 'center' }}>
          <Unlock size={40} color={$.primary} style={{ marginBottom: 16 }} />
          <div style={{ fontSize: 18, fontWeight: 700, color: $.text, marginBottom: 8 }}>Abrir caja</div>
          <div style={{ color: $.muted, fontSize: 13, marginBottom: 24 }}>Ingresá el monto inicial en efectivo</div>
          <input type="number" value={openingAmt} onChange={e => setOpeningAmt(e.target.value)}
            placeholder="$ 0"
            style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: `1px solid ${$.border}`, background: $.bg, color: $.text, fontSize: 20, fontWeight: 700, textAlign: 'center', outline: 'none', marginBottom: 16 }} />
          <button onClick={handleOpen}
            style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: $.primary, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            Abrir caja
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* Panel izquierdo: resumen */}
      <div style={{ width: 300, borderRight: `1px solid ${$.border}`, display: 'flex', flexDirection: 'column', padding: 20, gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: $.success }} />
          <span style={{ color: $.success, fontSize: 12, fontWeight: 600 }}>CAJA ABIERTA</span>
        </div>

        {/* Tarjetas de totales */}
        {[
          { label: 'Apertura',          value: register.opening_amount, color: $.muted },
          { label: 'Ventas efectivo',   value: salesCash,               color: $.success },
          { label: 'Transferencias',    value: salesTransfer,           color: '#38bdf8' },
          { label: 'Ingresos manuales', value: manualIn,                color: $.success },
          { label: 'Egresos manuales',  value: manualOut,               color: $.danger },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${$.border}` }}>
            <span style={{ color: $.muted, fontSize: 13 }}>{label}</span>
            <span style={{ color, fontWeight: 600, fontSize: 13 }}>{fmt(value)}</span>
          </div>
        ))}

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: `2px solid ${$.border}`, marginTop: 4 }}>
          <span style={{ color: $.text, fontWeight: 700 }}>Total en caja</span>
          <span style={{ color: $.primary, fontWeight: 800, fontSize: 18 }}>{fmt(theoretical)}</span>
        </div>

        {/* Acciones */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          <button onClick={() => setView('movement')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, border: `1px solid ${$.border}`, background: 'transparent', color: $.text, fontSize: 13, cursor: 'pointer' }}>
            <ArrowUpCircle size={16} color={$.success} /> Registrar movimiento
          </button>
          <button onClick={() => { setCloseAmt(''); setView('close') }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, border: 'none', background: $.danger, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Lock size={16} /> Cerrar caja
          </button>
        </div>
      </div>

      {/* Panel derecho: según vista */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {view === 'current' && (
          <>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${$.border}`, fontSize: 14, fontWeight: 700, color: $.text }}>
              Movimientos del turno
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, background: $.bg }}>
                  <tr style={{ color: $.muted, fontSize: 11, borderBottom: `1px solid ${$.border}`, textAlign: 'left' }}>
                    <th style={th}>HORA</th>
                    <th style={th}>TIPO</th>
                    <th style={th}>DESCRIPCIÓN</th>
                    <th style={{ ...th, textAlign: 'right' }}>MONTO</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map(m => (
                    <tr key={m.id} style={{ borderBottom: `1px solid ${$.border}` }}>
                      <td style={{ padding: '9px 8px', color: $.muted, fontSize: 12 }}>
                        {new Date(m.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '9px 8px' }}>
                        <span style={{ fontSize: 12, color: typeColor[m.type] || $.muted }}>{typeLabel[m.type] || m.type}</span>
                      </td>
                      <td style={{ padding: '9px 8px', color: $.muted, fontSize: 12 }}>{m.description || '—'}</td>
                      <td style={{ padding: '9px 8px', textAlign: 'right', fontWeight: 600, fontSize: 13, color: ['SALE_CASH', 'SALE_TRANSFER', 'MANUAL_IN', 'OPENING'].includes(m.type) ? $.success : $.danger }}>
                        {['MANUAL_OUT'].includes(m.type) ? '-' : ''}{fmt(m.amount)}
                      </td>
                    </tr>
                  ))}
                  {movements.length === 0 && (
                    <tr><td colSpan={4} style={{ padding: 40, textAlign: 'center', color: $.muted, fontSize: 13 }}>Sin movimientos aún</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {view === 'movement' && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: $.surface, border: `1px solid ${$.border}`, borderRadius: 14, padding: 28, width: 380 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: $.text, marginBottom: 20 }}>Registrar movimiento</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {(['MANUAL_IN', 'MANUAL_OUT'] as const).map(t => (
                  <button key={t} onClick={() => setMovType(t)} style={{
                    flex: 1, padding: '9px 0', borderRadius: 10, border: `2px solid ${movType === t ? (t === 'MANUAL_IN' ? $.success : $.danger) : $.border}`,
                    background: movType === t ? (t === 'MANUAL_IN' ? `${$.success}22` : `${$.danger}22`) : 'transparent',
                    color: movType === t ? (t === 'MANUAL_IN' ? $.success : $.danger) : $.muted,
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}>
                    {t === 'MANUAL_IN' ? '⬆ Ingreso' : '⬇ Egreso'}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={lbl}>Monto *</label>
                  <input type="number" value={movAmt} onChange={e => setMovAmt(e.target.value)} style={inp} placeholder="$ 0" autoFocus />
                </div>
                <div>
                  <label style={lbl}>Descripción</label>
                  <input value={movDesc} onChange={e => setMovDesc(e.target.value)} style={inp} placeholder="Ej: Pago de proveedor, retiro..." />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button onClick={() => setView('current')} style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: `1px solid ${$.border}`, background: 'transparent', color: $.muted, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
                <button onClick={handleMovement} disabled={!movAmt}
                  style={{ flex: 2, padding: '9px 0', borderRadius: 8, border: 'none', background: movAmt ? $.primary : $.border, color: '#fff', fontSize: 13, fontWeight: 600, cursor: movAmt ? 'pointer' : 'default' }}>
                  Registrar
                </button>
              </div>
            </div>
          </div>
        )}

        {view === 'close' && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: $.surface, border: `1px solid ${$.border}`, borderRadius: 14, padding: 28, width: 420 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: $.text, marginBottom: 4 }}>Cierre de caja</div>
              <div style={{ color: $.muted, fontSize: 13, marginBottom: 20 }}>Contá el dinero físico e ingresá el total.</div>

              <div style={{ background: $.bg, borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: $.muted, fontSize: 13 }}>Monto teórico en caja</span>
                  <span style={{ color: $.text, fontWeight: 700 }}>{fmt(theoretical)}</span>
                </div>
                <div style={{ fontSize: 11, color: $.muted }}>Apertura + ventas efectivo + ingresos - egresos</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                <div>
                  <label style={lbl}>Dinero contado *</label>
                  <input type="number" value={closeAmt} onChange={e => setCloseAmt(e.target.value)}
                    style={{ ...inp, fontSize: 20, fontWeight: 700, padding: '12px 14px', textAlign: 'center' }}
                    placeholder="$ 0" autoFocus />
                </div>

                {closeAmt && (() => {
                  const diff = parseFloat(closeAmt) - theoretical
                  return (
                    <div style={{ padding: '10px 14px', borderRadius: 10, background: diff === 0 ? `${$.success}22` : `${Math.abs(diff) < 50 ? $.warning : $.danger}22`, display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, color: $.muted }}>Diferencia</span>
                      <span style={{ fontWeight: 700, color: diff === 0 ? $.success : Math.abs(diff) < 50 ? $.warning : $.danger }}>
                        {diff >= 0 ? '+' : ''}{fmt(diff)}
                      </span>
                    </div>
                  )
                })()}

                <div>
                  <label style={lbl}>Observaciones</label>
                  <input value={closeNotes} onChange={e => setCloseNotes(e.target.value)} style={inp} placeholder="Opcional" />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setView('current')} style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: `1px solid ${$.border}`, background: 'transparent', color: $.muted, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
                <button onClick={handleClose} disabled={!closeAmt}
                  style={{ flex: 2, padding: '9px 0', borderRadius: 8, border: 'none', background: closeAmt ? $.danger : $.border, color: '#fff', fontSize: 13, fontWeight: 600, cursor: closeAmt ? 'pointer' : 'default' }}>
                  Confirmar cierre
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const th: React.CSSProperties = { padding: '10px 8px', fontWeight: 500 }
const lbl: React.CSSProperties = { display: 'block', fontSize: 11, color: '#64748b', marginBottom: 5, fontWeight: 500 }
const inp: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #2a2d3a', background: '#0f1117', color: '#e2e8f0', fontSize: 13, outline: 'none' }
