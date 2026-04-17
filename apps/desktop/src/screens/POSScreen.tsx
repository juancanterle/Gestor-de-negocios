import { useState, useEffect, useRef, useCallback } from 'react'
import { Trash2, Plus, Minus, ShoppingCart, Search, CheckCircle } from 'lucide-react'
import { T, overlayStyle } from '../theme'
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

  const total  = cart.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const change = payMethod === 'CASH' ? (parseFloat(amountPaid) || 0) - total : 0

  useEffect(() => {
    window.api.cashRegister.getCurrent().then(r => {
      if (r) setRegister(r)
      else setNoRegister(true)
    })
  }, [])

  useEffect(() => {
    if (step === 'cart') scanRef.current?.focus()
    if (step === 'checkout') setTimeout(() => paidRef.current?.focus(), 100)
  }, [step, cart])

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
    const p = await window.api.products.getByBarcode(val)
    if (p) {
      addProduct(p)
      ;(e.target as HTMLInputElement).value = ''
    } else {
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

  const confirmSale = async () => {
    if (!register || cart.length === 0) return
    if (payMethod === 'CASH' && parseFloat(amountPaid) < total) return
    const sale = await window.api.sales.create({
      user_id: user.id, cash_register_id: register.id,
      items: cart, subtotal: total, total, payment_method: payMethod,
      amount_paid: payMethod === 'CASH' ? parseFloat(amountPaid) : undefined,
      change_given: payMethod === 'CASH' ? change : undefined,
    })
    setLastTicket(sale.ticket_number)
    setCart([]); setAmountPaid(''); setPayMethod('CASH'); setStep('done')
  }

  // ── Sin caja ──
  if (noRegister) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, background: T.bg }}>
      <div style={{ fontSize: 48 }}>🔒</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: T.warning }}>No hay caja abierta</div>
      <div style={{ color: T.sub, fontSize: 14 }}>Abrí la caja desde el módulo Caja antes de vender.</div>
    </div>
  )

  // ── Venta confirmada ──
  if (step === 'done') return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 24, background: T.bg }}>
      <div style={{
        width: 100, height: 100, borderRadius: '50%',
        background: `${T.cash}20`,
        border: `3px solid ${T.cash}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <CheckCircle size={52} color={T.cash} strokeWidth={2} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: T.text }}>¡Venta confirmada!</div>
        <div style={{ fontSize: 16, color: T.sub, marginTop: 6 }}>Ticket N° <strong style={{ color: T.primary }}>{lastTicket}</strong></div>
      </div>
      <button
        onClick={() => setStep('cart')}
        style={{
          padding: '16px 48px', borderRadius: T.r, border: 'none',
          background: T.primary, color: '#fff', fontSize: 16, fontWeight: 700,
          cursor: 'pointer', boxShadow: `0 4px 20px ${T.primary}50`,
        }}
      >
        Nueva venta
      </button>
    </div>
  )

  // ── Checkout ──
  if (step === 'checkout') return (
    <div style={{ ...overlayStyle, position: 'relative', flex: 1, background: T.bg }}>
      <div style={{
        background: T.card, border: `1px solid ${T.border}`,
        borderRadius: T.rXl, padding: 36, width: 460,
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: T.text, marginBottom: 28 }}>Confirmar cobro</div>

        {/* Total */}
        <div style={{
          background: T.bg, borderRadius: T.r, padding: '16px 20px', marginBottom: 28,
          border: `1px solid ${T.border}`, textAlign: 'center',
        }}>
          <div style={{ fontSize: 13, color: T.sub, marginBottom: 4 }}>
            {cart.length} producto{cart.length !== 1 ? 's' : ''} · {cart.reduce((s, i) => s + i.quantity, 0)} unidades
          </div>
          <div style={{ fontSize: 52, fontWeight: 900, color: T.primary, lineHeight: 1.1, letterSpacing: '-1px' }}>
            {fmt(total)}
          </div>
        </div>

        {/* Forma de pago */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.sub, marginBottom: 10, letterSpacing: '0.06em' }}>FORMA DE PAGO</div>
          <div style={{ display: 'flex', gap: 10 }}>
            {(['CASH', 'TRANSFER'] as const).map(m => (
              <button key={m} onClick={() => { setPayMethod(m); setAmountPaid('') }} style={{
                flex: 1, padding: '14px 0', borderRadius: T.r,
                border: `2px solid ${payMethod === m ? (m === 'CASH' ? T.cash : T.transfer) : T.border}`,
                background: payMethod === m ? (m === 'CASH' ? T.cashBg : T.transferBg) : 'transparent',
                color: payMethod === m ? (m === 'CASH' ? T.cash : T.transfer) : T.sub,
                fontSize: 15, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
              }}>
                {m === 'CASH' ? '💵 Efectivo' : '📲 Transferencia'}
              </button>
            ))}
          </div>
        </div>

        {/* Monto recibido */}
        {payMethod === 'CASH' && (
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.sub, marginBottom: 10, letterSpacing: '0.06em' }}>MONTO RECIBIDO</div>
            <input
              ref={paidRef}
              type="number"
              value={amountPaid}
              onChange={e => setAmountPaid(e.target.value)}
              placeholder="0"
              style={{
                width: '100%', padding: '14px 16px', borderRadius: T.r,
                border: `2px solid ${amountPaid && parseFloat(amountPaid) >= total ? T.cash : T.border}`,
                background: T.input, color: T.text, fontSize: 32, fontWeight: 800,
                textAlign: 'center', outline: 'none', transition: 'border-color 0.15s',
              }}
            />
            {parseFloat(amountPaid) >= total && (
              <div style={{
                marginTop: 12, padding: '14px 18px', borderRadius: T.r,
                background: T.cashBg, border: `1px solid ${T.cash}55`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ color: T.cash, fontWeight: 600, fontSize: 15 }}>Vuelto</span>
                <span style={{ color: T.cash, fontWeight: 900, fontSize: 28 }}>{fmt(change)}</span>
              </div>
            )}
          </div>
        )}

        {payMethod === 'TRANSFER' && (
          <div style={{ marginBottom: 22, padding: '14px 18px', borderRadius: T.r, background: T.transferBg, border: `1px solid ${T.transfer}55`, textAlign: 'center' }}>
            <div style={{ color: T.transfer, fontSize: 14, fontWeight: 600 }}>📲 Confirmá la transferencia antes de cobrar</div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => setStep('cart')} style={{
            flex: 1, padding: '14px 0', borderRadius: T.r,
            border: `1.5px solid ${T.border}`, background: 'transparent',
            color: T.sub, fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>
            ← Volver
          </button>
          <button
            onClick={confirmSale}
            disabled={payMethod === 'CASH' && (parseFloat(amountPaid) || 0) < total}
            style={{
              flex: 2, padding: '14px 0', borderRadius: T.r, border: 'none',
              background: payMethod === 'TRANSFER' || (parseFloat(amountPaid) || 0) >= total
                ? `linear-gradient(135deg, ${T.cash}, #16a34a)`
                : T.border,
              color: '#fff', fontSize: 16, fontWeight: 800, cursor: 'pointer',
              boxShadow: payMethod === 'TRANSFER' || (parseFloat(amountPaid) || 0) >= total
                ? `0 4px 20px ${T.cash}50` : 'none',
              transition: 'all 0.15s',
            }}
          >
            Confirmar cobro
          </button>
        </div>
      </div>
    </div>
  )

  // ── Carrito ──
  return (
    <div style={{ flex: 1, display: 'flex', height: '100%', overflow: 'hidden', background: T.bg }}>

      {/* Panel izquierdo — scanner + carrito */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${T.border}`, overflow: 'hidden' }}>

        {/* Scanner */}
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${T.border}`, background: T.surface }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                ref={scanRef}
                onKeyDown={handleScan}
                placeholder="Escaneá un código de barras o presioná el botón de búsqueda →"
                style={{
                  width: '100%', padding: '12px 14px 12px 44px',
                  borderRadius: T.r, border: `1.5px solid ${T.border}`,
                  background: T.input, color: T.text, fontSize: 14,
                  outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color 0.15s',
                }}
              />
              <span style={{
                position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                fontSize: 18,
              }}>
                📷
              </span>
            </div>
            <button
              onClick={() => { setShowSearch(s => !s); setTimeout(() => searchRef.current?.focus(), 50) }}
              style={{
                padding: '12px 16px', borderRadius: T.r,
                border: `1.5px solid ${showSearch ? T.primary : T.border}`,
                background: showSearch ? `${T.primary}18` : T.card,
                color: showSearch ? T.primary : T.sub,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13,
              }}
            >
              <Search size={16} /> Buscar
            </button>
          </div>

          {/* Búsqueda por nombre */}
          {showSearch && (
            <div style={{ marginTop: 10, position: 'relative' }}>
              <input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscá por nombre del producto..."
                style={{
                  width: '100%', padding: '10px 14px',
                  borderRadius: T.r, border: `1.5px solid ${T.primary}`,
                  background: T.input, color: T.text, fontSize: 14,
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
              {results.length > 0 && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 10,
                  background: T.card, border: `1.5px solid ${T.border}`, borderRadius: T.rLg,
                  boxShadow: '0 12px 32px rgba(0,0,0,0.5)', overflow: 'hidden',
                }}>
                  {results.map(p => (
                    <button key={p.id} onClick={() => addProduct(p)} style={{
                      width: '100%', padding: '12px 16px',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      border: 'none', background: 'transparent', color: T.text,
                      cursor: 'pointer', borderBottom: `1px solid ${T.border}`,
                      fontSize: 14, textAlign: 'left',
                    }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        {p.barcode && <div style={{ color: T.sub, fontSize: 11, marginTop: 2 }}>{p.barcode}</div>}
                      </div>
                      <div style={{
                        color: T.primary, fontWeight: 800, fontSize: 16,
                        background: `${T.primary}15`, padding: '4px 10px', borderRadius: 8,
                      }}>
                        {fmt(p.use_manual && p.price_manual != null ? p.price_manual : p.price_auto)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Carrito */}
        <div style={{ flex: 1, overflowY: 'auto', background: T.bg }}>
          {cart.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', height: '100%', gap: 14, color: T.faint,
            }}>
              <ShoppingCart size={56} strokeWidth={1} />
              <div style={{ fontSize: 15, color: T.sub }}>Escaneá un producto para empezar</div>
              <div style={{ fontSize: 12, color: T.faint }}>O usá el botón "Buscar" para buscar por nombre</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: T.surface }}>
                <tr style={{ color: T.sub, fontSize: 11, fontWeight: 600, letterSpacing: '0.05em' }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600 }}>PRODUCTO</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 600 }}>CANT.</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600 }}>PRECIO</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600 }}>SUBTOTAL</th>
                  <th style={{ width: 40 }} />
                </tr>
              </thead>
              <tbody>
                {cart.map((item, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.border}`, background: i % 2 === 0 ? 'transparent' : `${T.surface}80` }}>
                    <td style={{ padding: '13px 16px' }}>
                      <div style={{ color: T.text, fontSize: 15, fontWeight: 600 }}>{item.product_name}</div>
                      {item.barcode && <div style={{ color: T.faint, fontSize: 11, marginTop: 2 }}>{item.barcode}</div>}
                    </td>
                    <td style={{ padding: '13px 8px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: T.card, borderRadius: 10, padding: '4px 6px', border: `1px solid ${T.border}` }}>
                        <button onClick={() => updateQty(i, -1)} style={qtyBtn}><Minus size={13} /></button>
                        <span style={{ color: T.text, fontWeight: 800, fontSize: 17, minWidth: 28, textAlign: 'center' }}>{item.quantity}</span>
                        <button onClick={() => updateQty(i, +1)} style={qtyBtn}><Plus size={13} /></button>
                      </div>
                    </td>
                    <td style={{ padding: '13px 8px', textAlign: 'right', color: T.sub, fontSize: 14 }}>
                      {fmt(item.unit_price)}
                    </td>
                    <td style={{ padding: '13px 16px', textAlign: 'right', color: T.text, fontWeight: 700, fontSize: 15 }}>
                      {fmt(item.quantity * item.unit_price)}
                    </td>
                    <td style={{ padding: '13px 8px', textAlign: 'center' }}>
                      <button onClick={() => setCart(p => p.filter((_, idx) => idx !== i))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.faint, padding: 4, borderRadius: 6, transition: 'color 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.color = T.danger)}
                        onMouseLeave={e => (e.currentTarget.style.color = T.faint)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Panel derecho — resumen + cobrar */}
      <div style={{ width: 300, display: 'flex', flexDirection: 'column', background: T.surface, borderLeft: `1px solid ${T.border}` }}>

        {/* Forma de pago */}
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
              }}>
                {m === 'CASH' ? '💵 Efectivo' : '📲 Transfer.'}
              </button>
            ))}
          </div>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Resumen */}
        <div style={{ padding: '0 16px' }}>
          <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, color: T.sub, fontSize: 13 }}>
              <span>Artículos</span>
              <span>{cart.reduce((s, i) => s + i.quantity, 0)} unidades</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <span style={{ fontSize: 13, color: T.sub, fontWeight: 600 }}>TOTAL</span>
              <span style={{
                fontSize: cart.length > 0 ? 44 : 36,
                fontWeight: 900,
                color: cart.length > 0 ? T.text : T.faint,
                lineHeight: 1,
                letterSpacing: '-1px',
              }}>
                {fmt(total)}
              </span>
            </div>
          </div>
        </div>

        {/* Botones */}
        <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={() => setStep('checkout')}
            disabled={cart.length === 0}
            style={{
              padding: '18px 0', borderRadius: T.r, border: 'none',
              fontSize: 18, fontWeight: 800,
              background: cart.length > 0
                ? `linear-gradient(135deg, ${T.cash}, #16a34a)`
                : T.border,
              color: cart.length > 0 ? '#fff' : T.faint,
              cursor: cart.length > 0 ? 'pointer' : 'default',
              boxShadow: cart.length > 0 ? `0 4px 20px ${T.cash}50` : 'none',
              transition: 'all 0.15s',
              letterSpacing: '-0.3px',
            }}
          >
            {cart.length > 0 ? `💰 Cobrar ${fmt(total)}` : 'Cobrar'}
          </button>

          {cart.length > 0 && (
            <button
              onClick={() => setCart([])}
              style={{
                padding: '10px 0', borderRadius: T.r,
                border: `1.5px solid ${T.border}`,
                background: 'transparent', color: T.sub,
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Limpiar carrito
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const qtyBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 8,
  border: `1px solid ${T.border}`,
  background: T.surface, color: T.text,
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
}
