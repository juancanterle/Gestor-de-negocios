import { useState, useEffect, useRef, useCallback } from 'react'
import { Trash2, Plus, Minus, ShoppingCart, Search, CheckCircle, ScanLine, Banknote, Smartphone, Lock } from 'lucide-react'
import { T } from '../theme'
import { qtyBtn } from '../styles/inputs'
import { useToast } from '../hooks/useToast'
import { unwrap } from '../lib/api'
import type { User, Product, CartItem } from '../types/api'

interface Props { user: User }

const fmt = (n: number) =>
  n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 })

export default function POSScreen({ user }: Props) {
  const [cart, setCart]             = useState<CartItem[]>([])
  const [search, setSearch]         = useState('')
  const [results, setResults]       = useState<Product[]>([])
  const [register, setRegister]     = useState<{ id: string } | null>(null)
  const [payMethod, setPayMethod]   = useState<'CASH' | 'TRANSFER'>('CASH')
  const [amountPaid, setAmountPaid] = useState('')
  const [step, setStep]             = useState<'cart' | 'checkout' | 'done'>('cart')
  const [lastTicket, setLastTicket] = useState<number | null>(null)
  const [noRegister, setNoRegister] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const scanRef   = useRef<HTMLInputElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const paidRef   = useRef<HTMLInputElement>(null)
  const toast     = useToast()

  const total  = cart.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const change = payMethod === 'CASH' ? (parseFloat(amountPaid) || 0) - total : 0

  useEffect(() => {
    window.api.cashRegister.getCurrent().then(raw => {
      try {
        const r = unwrap(raw)
        if (r) setRegister(r)
        else setNoRegister(true)
      } catch { setNoRegister(true) }
    })
  }, [])

  useEffect(() => {
    if (step === 'cart') scanRef.current?.focus()
    if (step === 'checkout') setTimeout(() => paidRef.current?.focus(), 100)
  }, [step, cart])

  useEffect(() => {
    const q = search.trim()
    const t = setTimeout(async () => {
      if (!q) { setResults([]); return }
      try {
        const r = unwrap(await window.api.products.list({ search: q }))
        setResults(r.slice(0, 8))
      } catch { setResults([]) }
    }, 150)
    return () => clearTimeout(t)
  }, [search])

  const effectivePrice = (p: Product) =>
    p.use_manual && p.price_manual != null ? p.price_manual : p.price_auto

  const addProduct = useCallback((p: Product) => {
    setCart(prev => {
      const idx = prev.findIndex(i => i.product_id === p.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 }
        return next
      }
      return [...prev, {
        product_id: p.id, product_name: p.name, barcode: p.barcode,
        quantity: 1, unit_price: effectivePrice(p), unit_cost: p.cost,
      }]
    })
    setSearch(''); setResults([]); setShowSearch(false)
    setTimeout(() => scanRef.current?.focus(), 50)
  }, [])

  const handleScan = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    const val = (e.target as HTMLInputElement).value.trim()
    if (!val) return
    try {
      const p = unwrap(await window.api.products.getByBarcode(val))
      if (p) {
        addProduct(p)
        ;(e.target as HTMLInputElement).value = ''
      } else {
        ;(e.target as HTMLInputElement).select()
        toast.warning('Producto no encontrado')
      }
    } catch {
      toast.error('No se pudo buscar el producto')
    }
  }

  const updateQty = (idx: number, delta: number) => {
    setCart(prev => {
      const next = [...prev]
      const newQty = next[idx].quantity + delta
      if (newQty <= 0) return next.filter((_, i) => i !== idx)
      next[idx] = { ...next[idx], quantity: newQty }
      return next
    })
  }

  const confirmSale = async () => {
    if (!register || cart.length === 0) return
    if (payMethod === 'CASH' && parseFloat(amountPaid) < total) return
    try {
      const sale = unwrap(await window.api.sales.create({
        user_id: user.id, cash_register_id: register.id,
        items: cart, subtotal: total, total, payment_method: payMethod,
        amount_paid: payMethod === 'CASH' ? parseFloat(amountPaid) : undefined,
        change_given: payMethod === 'CASH' ? change : undefined,
      }))
      setLastTicket(sale.ticket_number)
      setCart([]); setAmountPaid(''); setPayMethod('CASH'); setStep('done')
    } catch {
      toast.error('No se pudo registrar la venta')
    }
  }

  if (noRegister) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14, background: T.bg }}>
      <Lock size={40} strokeWidth={1.5} color={T.sub} aria-hidden="true" />
      <div style={{ fontSize: 18, fontWeight: 600, color: T.text }}>No hay caja abierta</div>
      <div style={{ color: T.sub, fontSize: 13 }}>Abrí la caja desde el módulo Caja antes de vender.</div>
    </div>
  )

  if (step === 'done') return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20, background: T.bg }}>
      <CheckCircle size={56} color={T.cash} strokeWidth={1.75} aria-hidden="true" />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: T.text }}>Venta confirmada</div>
        <div style={{ fontSize: 13, color: T.sub, marginTop: 6 }}>Ticket N° <span style={{ color: T.text, fontWeight: 600, fontFamily: 'ui-monospace, monospace' }}>{lastTicket}</span></div>
      </div>
      <button onClick={() => setStep('cart')} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: T.primary, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
        Nueva venta
      </button>
    </div>
  )

  if (step === 'checkout') {
    const canConfirm = payMethod === 'TRANSFER' || (parseFloat(amountPaid) || 0) >= total
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg }}>
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: T.rLg, padding: 28, width: `min(420px, calc(100vw - 32px))`, boxShadow: '0 8px 24px rgba(0,0,0,0.35)' }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: T.text, marginBottom: 20 }}>Confirmar cobro</div>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, color: T.sub, marginBottom: 4 }}>
              {cart.length} producto{cart.length !== 1 ? 's' : ''} · {cart.reduce((s, i) => s + i.quantity, 0)} unidades
            </div>
            <div style={{ fontSize: 36, fontWeight: 700, color: T.text, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>{fmt(total)}</div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.sub, marginBottom: 8, letterSpacing: '0.04em' }}>FORMA DE PAGO</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['CASH', 'TRANSFER'] as const).map(m => (
                <button key={m} onClick={() => { setPayMethod(m); setAmountPaid('') }} style={{
                  flex: 1, padding: '10px 0', borderRadius: 8,
                  border: `1px solid ${payMethod === m ? (m === 'CASH' ? T.cash : T.transfer) : T.border}`,
                  background: payMethod === m ? (m === 'CASH' ? T.cashBg : T.transferBg) : 'transparent',
                  color: payMethod === m ? (m === 'CASH' ? T.cash : T.transfer) : T.sub,
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  {m === 'CASH' ? <Banknote size={15} aria-hidden="true" /> : <Smartphone size={15} aria-hidden="true" />}
                  {m === 'CASH' ? 'Efectivo' : 'Transferencia'}
                </button>
              ))}
            </div>
          </div>
          {payMethod === 'CASH' && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.sub, marginBottom: 8, letterSpacing: '0.04em' }}>MONTO RECIBIDO</div>
              <input id="pos-paid" name="pos-paid" ref={paidRef} type="number" value={amountPaid} onChange={e => setAmountPaid(e.target.value)}
                placeholder="0" aria-label="Monto recibido"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${T.border}`, background: T.input, color: T.text, fontSize: 22, fontWeight: 600, textAlign: 'center', outline: 'none', fontVariantNumeric: 'tabular-nums', boxSizing: 'border-box' }} />
              {parseFloat(amountPaid) >= total && (
                <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 8, background: T.cashBg, border: `1px solid ${T.cash}40`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: T.cash, fontWeight: 500, fontSize: 13 }}>Vuelto</span>
                  <span style={{ color: T.cash, fontWeight: 600, fontSize: 18, fontVariantNumeric: 'tabular-nums' }}>{fmt(change)}</span>
                </div>
              )}
            </div>
          )}
          {payMethod === 'TRANSFER' && (
            <div style={{ marginBottom: 20, padding: '10px 14px', borderRadius: 8, background: T.transferBg, border: `1px solid ${T.transfer}40` }}>
              <div style={{ color: T.transfer, fontSize: 13 }}>Confirmá la transferencia antes de cobrar.</div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setStep('cart')} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: `1px solid ${T.border}`, background: 'transparent', color: T.sub, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Volver</button>
            <button onClick={confirmSale} disabled={!canConfirm} style={{ flex: 2, padding: '10px 0', borderRadius: 8, border: 'none', background: canConfirm ? T.cash : T.border, color: canConfirm ? '#fff' : T.faint, fontSize: 14, fontWeight: 600, cursor: canConfirm ? 'pointer' : 'not-allowed' }}>
              Confirmar cobro
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', height: '100%', overflow: 'hidden', background: T.bg }}>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${T.border}`, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, background: T.surface }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input id="pos-scan" name="pos-scan" ref={scanRef} onKeyDown={handleScan} placeholder="Escaneá un código de barras" aria-label="Código de barras"
                style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: 8, border: `1px solid ${T.border}`, background: T.input, color: T.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', color: T.sub }} aria-hidden="true">
                <ScanLine size={16} />
              </span>
            </div>
            <button onClick={() => { setShowSearch(s => !s); setTimeout(() => searchRef.current?.focus(), 50) }} style={{
              padding: '9px 12px', borderRadius: 8,
              border: `1px solid ${showSearch ? T.primary : T.border}`,
              background: showSearch ? `${T.primary}14` : 'transparent',
              color: showSearch ? T.text : T.sub,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500, fontSize: 13,
            }}>
              <Search size={14} aria-hidden="true" /> Buscar
            </button>
          </div>
          {showSearch && (
            <div style={{ marginTop: 8, position: 'relative' }}>
              <input id="pos-search" name="pos-search" ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nombre" aria-label="Buscar producto por nombre"
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${T.border}`, background: T.input, color: T.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              {results.length > 0 && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 10, background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, boxShadow: '0 6px 16px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
                  {results.map((p, idx) => (
                    <button key={p.id} onClick={() => addProduct(p)} style={{ width: '100%', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: 'none', background: 'transparent', color: T.text, cursor: 'pointer', borderBottom: idx === results.length - 1 ? 'none' : `1px solid ${T.border}`, fontSize: 13, textAlign: 'left' }}>
                      <div>
                        <div style={{ fontWeight: 500 }}>{p.name}</div>
                        {p.barcode && <div style={{ color: T.sub, fontSize: 11, marginTop: 2, fontFamily: 'ui-monospace, monospace' }}>{p.barcode}</div>}
                      </div>
                      <div style={{ color: T.text, fontWeight: 600, fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>
                        {fmt(p.use_manual && p.price_manual != null ? p.price_manual : p.price_auto)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', background: T.bg }}>
          {cart.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10 }}>
              <ShoppingCart size={40} strokeWidth={1.25} color={T.faint} aria-hidden="true" />
              <div style={{ fontSize: 13, color: T.sub }}>Escaneá un producto para empezar</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: T.sub, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', borderBottom: `1px solid ${T.border}` }}>
                  <th scope="col" style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600 }}>PRODUCTO</th>
                  <th scope="col" style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 600 }}>CANT.</th>
                  <th scope="col" style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600 }}>PRECIO</th>
                  <th scope="col" style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600 }}>SUBTOTAL</th>
                  <th scope="col" aria-label="Acciones" style={{ width: 40 }} />
                </tr>
              </thead>
              <tbody>
                {cart.map((item, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ color: T.text, fontSize: 14, fontWeight: 500 }}>{item.product_name}</div>
                      {item.barcode && <div style={{ color: T.faint, fontSize: 11, marginTop: 2, fontFamily: 'ui-monospace, monospace' }}>{item.barcode}</div>}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: T.surface, borderRadius: 6, padding: 2, border: `1px solid ${T.border}` }}>
                        <button onClick={() => updateQty(i, -1)} style={qtyBtn} aria-label="Reducir cantidad"><Minus size={12} /></button>
                        <span style={{ color: T.text, fontWeight: 600, fontSize: 14, minWidth: 24, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{item.quantity}</span>
                        <button onClick={() => updateQty(i, +1)} style={qtyBtn} aria-label="Aumentar cantidad"><Plus size={12} /></button>
                      </div>
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', color: T.sub, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{fmt(item.unit_price)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: T.text, fontWeight: 600, fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>{fmt(item.quantity * item.unit_price)}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                      <button onClick={() => setCart(p => p.filter((_, idx) => idx !== i))} aria-label={`Quitar ${item.product_name}`}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.faint, padding: 4, borderRadius: 4 }}
                        onMouseEnter={e => (e.currentTarget.style.color = T.danger)}
                        onMouseLeave={e => (e.currentTarget.style.color = T.faint)}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Panel derecho */}
      <div style={{ width: 300, minWidth: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', background: T.surface, borderLeft: `1px solid ${T.border}` }}>
        <div style={{ padding: '16px 16px 0' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.sub, marginBottom: 8, letterSpacing: '0.06em' }}>FORMA DE PAGO</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['CASH', 'TRANSFER'] as const).map(m => (
              <button key={m} onClick={() => setPayMethod(m)} style={{
                flex: 1, padding: '10px 0', borderRadius: T.r, fontWeight: 700, fontSize: 13,
                border: `2px solid ${payMethod === m ? (m === 'CASH' ? T.cash : T.transfer) : T.border}`,
                background: payMethod === m ? (m === 'CASH' ? T.cashBg : T.transferBg) : 'transparent',
                color: payMethod === m ? (m === 'CASH' ? T.cash : T.transfer) : T.sub,
                cursor: 'pointer', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                {m === 'CASH'
                  ? <><Banknote size={14} aria-hidden="true" /> Efectivo</>
                  : <><Smartphone size={14} aria-hidden="true" /> Transfer.</>}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ padding: '0 16px' }}>
          <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, color: T.sub, fontSize: 13 }}>
              <span>Artículos</span>
              <span>{cart.reduce((s, i) => s + i.quantity, 0)} unidades</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <span style={{ fontSize: 13, color: T.sub, fontWeight: 600 }}>TOTAL</span>
              <span style={{ fontSize: cart.length > 0 ? 44 : 36, fontWeight: 900, color: cart.length > 0 ? T.text : T.faint, lineHeight: 1, letterSpacing: '-1px' }}>
                {fmt(total)}
              </span>
            </div>
          </div>
        </div>

        <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={() => setStep('checkout')} disabled={cart.length === 0} style={{
            padding: '18px 0', borderRadius: T.r, border: 'none', fontSize: 17, fontWeight: 800,
            background: cart.length > 0 ? T.gradCash : T.border,
            color: cart.length > 0 ? '#fff' : T.faint,
            cursor: cart.length > 0 ? 'pointer' : 'default',
            boxShadow: cart.length > 0 ? T.shadowCash : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            {cart.length > 0
              ? <><Banknote size={18} aria-hidden="true" /> Cobrar {fmt(total)}</>
              : 'Cobrar'}
          </button>
          {cart.length > 0 && (
            <button onClick={() => setCart([])} style={{ padding: '10px 0', borderRadius: T.r, border: `1.5px solid ${T.border}`, background: 'transparent', color: T.sub, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Limpiar carrito
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
