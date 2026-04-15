import { useState, useEffect, useRef, useCallback } from 'react'
import { Trash2, Plus, Minus, ShoppingCart, Search, CheckCircle, Printer } from 'lucide-react'
import type { User, Product, CartItem } from '../types/api'

interface Props {
  user: User
}

const $ = {
  bg:      '#0f1117',
  surface: '#1a1d27',
  border:  '#2a2d3a',
  text:    '#e2e8f0',
  muted:   '#64748b',
  primary: '#6366f1',
  success: '#22c55e',
  warning: '#f59e0b',
  danger:  '#ef4444',
}

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
  const scanRef  = useRef<HTMLInputElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const total    = cart.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const change   = payMethod === 'CASH' ? (parseFloat(amountPaid) || 0) - total : 0

  // Cargar caja actual
  useEffect(() => {
    window.api.cashRegister.getCurrent().then(r => {
      if (r) setRegister(r)
      else setNoRegister(true)
    })
  }, [])

  // Foco automático en input de escáner
  useEffect(() => {
    if (step === 'cart') scanRef.current?.focus()
  }, [step, cart])

  // Búsqueda de productos
  useEffect(() => {
    if (!search.trim()) { setResults([]); return }
    const t = setTimeout(async () => {
      const r = await window.api.products.list({ search: search.trim() })
      setResults(r.slice(0, 8))
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
        product_id: p.id,
        product_name: p.name,
        barcode: p.barcode,
        quantity: 1,
        unit_price: effectivePrice(p),
        unit_cost: p.cost,
      }]
    })
    setSearch('')
    setResults([])
    setShowSearch(false)
    setTimeout(() => scanRef.current?.focus(), 50)
  }, [])

  const handleScan = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    const val = (e.target as HTMLInputElement).value.trim()
    if (!val) return
    const p = await window.api.products.getByBarcode(val)
    if (p) {
      addProduct(p)
      ;(e.target as HTMLInputElement).value = ''
    } else {
      // Código no encontrado — feedback visual
      ;(e.target as HTMLInputElement).select()
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

  const removeItem = (idx: number) => setCart(prev => prev.filter((_, i) => i !== idx))

  const confirmSale = async () => {
    if (!register || cart.length === 0) return
    if (payMethod === 'CASH' && parseFloat(amountPaid) < total) return

    const sale = await window.api.sales.create({
      user_id: user.id,
      cash_register_id: register.id,
      items: cart,
      subtotal: total,
      total,
      payment_method: payMethod,
      amount_paid: payMethod === 'CASH' ? parseFloat(amountPaid) : undefined,
      change_given: payMethod === 'CASH' ? change : undefined,
    })

    setLastTicket(sale.ticket_number)
    setCart([])
    setAmountPaid('')
    setPayMethod('CASH')
    setStep('done')
  }

  const fmt = (n: number) =>
    n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 })

  // ── PANTALLA: sin caja abierta ──
  if (noRegister) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 18, color: $.warning, fontWeight: 600 }}>No hay caja abierta</div>
        <div style={{ color: $.muted, fontSize: 13 }}>Abrí la caja desde el módulo Caja antes de vender.</div>
      </div>
    )
  }

  // ── PANTALLA: venta confirmada ──
  if (step === 'done') {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
        <CheckCircle size={64} color={$.success} />
        <div style={{ fontSize: 22, fontWeight: 700, color: $.text }}>¡Venta confirmada!</div>
        <div style={{ fontSize: 14, color: $.muted }}>Ticket N° {lastTicket}</div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => setStep('cart')} style={btnStyle($.primary)}>
            Nueva venta
          </button>
          <button onClick={() => {}} style={btnStyle($.muted, true)}>
            <Printer size={16} /> Reimprimir
          </button>
        </div>
      </div>
    )
  }

  // ── PANTALLA: checkout ──
  if (step === 'checkout') {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: $.bg }}>
        <div style={{ background: $.surface, border: `1px solid ${$.border}`, borderRadius: 16, padding: 32, width: 420 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: $.text, marginBottom: 24 }}>Confirmar cobro</div>

          {/* Resumen */}
          <div style={{ background: $.bg, borderRadius: 10, padding: '12px 16px', marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: $.muted, fontSize: 13, marginBottom: 6 }}>
              <span>{cart.length} producto{cart.length !== 1 ? 's' : ''}</span>
              <span>{cart.reduce((s, i) => s + i.quantity, 0)} unidades</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: $.text, fontSize: 22, fontWeight: 700 }}>
              <span>Total</span>
              <span style={{ color: $.primary }}>{fmt(total)}</span>
            </div>
          </div>

          {/* Forma de pago */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: $.muted, marginBottom: 8 }}>FORMA DE PAGO</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['CASH', 'TRANSFER'] as const).map(m => (
                <button key={m} onClick={() => setPayMethod(m)} style={{
                  flex: 1, padding: '10px 0', borderRadius: 10, border: `2px solid ${payMethod === m ? $.primary : $.border}`,
                  background: payMethod === m ? `${$.primary}22` : 'transparent',
                  color: payMethod === m ? $.primary : $.muted,
                  fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}>
                  {m === 'CASH' ? '💵 Efectivo' : '📲 Transferencia'}
                </button>
              ))}
            </div>
          </div>

          {/* Monto recibido (solo efectivo) */}
          {payMethod === 'CASH' && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: $.muted, marginBottom: 8 }}>MONTO RECIBIDO</div>
              <input
                type="number"
                value={amountPaid}
                onChange={e => setAmountPaid(e.target.value)}
                autoFocus
                placeholder="0"
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 10, fontSize: 20, fontWeight: 700,
                  border: `1px solid ${$.border}`, background: $.bg, color: $.text, outline: 'none',
                }}
              />
              {parseFloat(amountPaid) >= total && (
                <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 10, background: `${$.success}22`, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: $.success, fontWeight: 600 }}>Vuelto</span>
                  <span style={{ color: $.success, fontWeight: 700, fontSize: 18 }}>{fmt(change)}</span>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setStep('cart')} style={btnStyle($.muted, true)}>Volver</button>
            <button
              onClick={confirmSale}
              disabled={payMethod === 'CASH' && (parseFloat(amountPaid) || 0) < total}
              style={{ ...btnStyle($.success), flex: 1, fontSize: 16 }}
            >
              Confirmar cobro
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── PANTALLA: carrito ──
  return (
    <div style={{ flex: 1, display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* Panel izquierdo: escáner + carrito */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${$.border}` }}>

        {/* Input de escáner */}
        <div style={{ padding: 16, borderBottom: `1px solid ${$.border}`, display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              ref={scanRef}
              onKeyDown={handleScan}
              placeholder="Escanear código de barras o buscar producto..."
              style={{
                width: '100%', padding: '10px 14px 10px 40px',
                borderRadius: 10, border: `1px solid ${$.border}`,
                background: $.surface, color: $.text, fontSize: 14, outline: 'none',
              }}
            />
            <Search size={16} color={$.muted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          </div>
          <button
            onClick={() => { setShowSearch(s => !s); setTimeout(() => searchRef.current?.focus(), 50) }}
            style={{ ...btnStyle($.primary, true), padding: '10px 14px' }}
            title="Buscar por nombre"
          >
            <Search size={16} />
          </button>
        </div>

        {/* Búsqueda por nombre */}
        {showSearch && (
          <div style={{ padding: '8px 16px', borderBottom: `1px solid ${$.border}`, position: 'relative' }}>
            <input
              ref={searchRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre..."
              style={{
                width: '100%', padding: '8px 12px',
                borderRadius: 8, border: `1px solid ${$.primary}`,
                background: $.surface, color: $.text, fontSize: 14, outline: 'none',
              }}
            />
            {results.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 16, right: 16, zIndex: 10,
                background: $.surface, border: `1px solid ${$.border}`, borderRadius: 10,
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              }}>
                {results.map(p => (
                  <button
                    key={p.id}
                    onClick={() => addProduct(p)}
                    style={{
                      width: '100%', padding: '10px 14px', display: 'flex',
                      justifyContent: 'space-between', alignItems: 'center',
                      border: 'none', background: 'transparent', color: $.text,
                      cursor: 'pointer', borderBottom: `1px solid ${$.border}`, fontSize: 13,
                    }}
                  >
                    <div style={{ textAlign: 'left' }}>
                      <div>{p.name}</div>
                      {p.barcode && <div style={{ color: $.muted, fontSize: 11 }}>{p.barcode}</div>}
                    </div>
                    <div style={{ color: $.primary, fontWeight: 700 }}>{fmt(effectivePrice(p))}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Carrito */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {cart.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: $.muted }}>
              <ShoppingCart size={48} color={$.border} />
              <div style={{ fontSize: 14 }}>Escaneá o buscá un producto para empezar</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: $.muted, fontSize: 11, textAlign: 'left' }}>
                  <th style={{ padding: '4px 8px', fontWeight: 500 }}>PRODUCTO</th>
                  <th style={{ padding: '4px 8px', fontWeight: 500, textAlign: 'center' }}>CANT.</th>
                  <th style={{ padding: '4px 8px', fontWeight: 500, textAlign: 'right' }}>PRECIO</th>
                  <th style={{ padding: '4px 8px', fontWeight: 500, textAlign: 'right' }}>SUBTOTAL</th>
                  <th style={{ width: 32 }} />
                </tr>
              </thead>
              <tbody>
                {cart.map((item, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${$.border}` }}>
                    <td style={{ padding: '10px 8px', color: $.text, fontSize: 14 }}>
                      <div>{item.product_name}</div>
                      {item.barcode && <div style={{ color: $.muted, fontSize: 11 }}>{item.barcode}</div>}
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <button onClick={() => updateQty(i, -1)} style={qtyBtn}><Minus size={12} /></button>
                        <span style={{ color: $.text, fontWeight: 700, minWidth: 24, textAlign: 'center' }}>{item.quantity}</span>
                        <button onClick={() => updateQty(i, +1)} style={qtyBtn}><Plus size={12} /></button>
                      </div>
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', color: $.muted, fontSize: 13 }}>
                      {fmt(item.unit_price)}
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', color: $.text, fontWeight: 600 }}>
                      {fmt(item.quantity * item.unit_price)}
                    </td>
                    <td style={{ padding: '10px 4px', textAlign: 'center' }}>
                      <button onClick={() => removeItem(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: $.danger, padding: 4 }}>
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

      {/* Panel derecho: total y cobro */}
      <div style={{ width: 280, display: 'flex', flexDirection: 'column', padding: 20, gap: 16 }}>
        <div style={{ flex: 1 }} />

        {/* Resumen */}
        <div style={{ background: $.surface, borderRadius: 12, padding: 16, border: `1px solid ${$.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, color: $.muted, fontSize: 13 }}>
            <span>Productos</span>
            <span>{cart.reduce((s, i) => s + i.quantity, 0)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: $.text, fontSize: 28, fontWeight: 800, borderTop: `1px solid ${$.border}`, paddingTop: 12 }}>
            <span style={{ fontSize: 14, alignSelf: 'flex-end', paddingBottom: 4, color: $.muted }}>TOTAL</span>
            <span style={{ color: $.primary }}>{fmt(total)}</span>
          </div>
        </div>

        {/* Botón cobrar */}
        <button
          onClick={() => setStep('checkout')}
          disabled={cart.length === 0}
          style={{
            padding: '16px 0', borderRadius: 12, border: 'none', fontSize: 18, fontWeight: 700,
            background: cart.length > 0 ? $.primary : $.border,
            color: cart.length > 0 ? '#fff' : $.muted,
            cursor: cart.length > 0 ? 'pointer' : 'default',
            transition: 'all 0.15s',
          }}
        >
          Cobrar {cart.length > 0 ? fmt(total) : ''}
        </button>

        {cart.length > 0 && (
          <button
            onClick={() => setCart([])}
            style={{ padding: '10px 0', borderRadius: 10, border: `1px solid ${$.border}`, background: 'transparent', color: $.danger, fontSize: 13, cursor: 'pointer' }}
          >
            Limpiar carrito
          </button>
        )}
      </div>
    </div>
  )
}

const btnStyle = (color: string, outline = false): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  padding: '10px 20px', borderRadius: 10, border: outline ? `1px solid ${color}` : 'none',
  background: outline ? 'transparent' : color,
  color: outline ? color : '#fff',
  fontSize: 14, fontWeight: 600, cursor: 'pointer',
})

const qtyBtn: React.CSSProperties = {
  width: 26, height: 26, borderRadius: 6, border: '1px solid #2a2d3a',
  background: '#1a1d27', color: '#e2e8f0', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
