import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Trash2, Plus, Minus, ShoppingCart, Search,
  CheckCircle2, Printer, Banknote, CreditCard, Lock, ArrowLeft,
} from 'lucide-react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import type { User, Product, CartItem } from '../types/api'
import {
  Button, Card, Input, Pill, ScreenShell,
  color, radius, fmt, useToast,
} from '../ui'

interface Props { user: User }

export default function POSScreen({ user }: Props) {
  const toast = useToast()

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
  const rootRef   = useRef<HTMLDivElement>(null)
  const cartRef   = useRef<HTMLDivElement>(null)
  const totalRef  = useRef<HTMLDivElement>(null)

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
  }, [step, cart.length])

  useEffect(() => {
    if (!search.trim()) { setResults([]); return }
    const t = setTimeout(async () => {
      const r = await window.api.products.list({ search: search.trim() })
      setResults(r.slice(0, 8))
    }, 150)
    return () => clearTimeout(t)
  }, [search])

  // Animate total changes
  useGSAP(() => {
    if (!totalRef.current) return
    gsap.fromTo(totalRef.current,
      { scale: 1.08 },
      { scale: 1, duration: 0.35, ease: 'back.out(2.5)' })
  }, { dependencies: [total], scope: rootRef })

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
      toast.warn('Código no encontrado', `Ningún producto con código "${val}"`)
      ;(e.target as HTMLInputElement).select()
    }
  }

  const updateQty = (idx: number, delta: number) =>
    setCart(prev => {
      const next = [...prev]
      const q = next[idx].quantity + delta
      if (q <= 0) return next.filter((_, i) => i !== idx)
      next[idx] = { ...next[idx], quantity: q }
      return next
    })

  const removeItem = (idx: number) =>
    setCart(prev => prev.filter((_, i) => i !== idx))

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
    toast.success('Venta confirmada', `Ticket N° ${sale.ticket_number}`)
  }

  // ── ESTADO: sin caja abierta ──
  if (noRegister) return <NoRegisterState />

  // ── ESTADO: venta confirmada ──
  if (step === 'done') {
    return <DoneState ticket={lastTicket} onNew={() => setStep('cart')} />
  }

  // ── ESTADO: checkout ──
  if (step === 'checkout') {
    return (
      <CheckoutState
        cart={cart}
        total={total}
        change={change}
        payMethod={payMethod}
        amountPaid={amountPaid}
        onSetMethod={setPayMethod}
        onSetAmount={setAmountPaid}
        onBack={() => setStep('cart')}
        onConfirm={confirmSale}
      />
    )
  }

  // ── ESTADO: carrito (default) ──
  return (
    <ScreenShell padding={0}>
      <div ref={rootRef} style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

        {/* Izquierda: escáner + carrito */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div data-enter style={{ padding: '18px 24px 10px', display: 'flex', gap: 10 }}>
            <Input
              ref={scanRef}
              onKeyDown={handleScan}
              placeholder="Escaneá el código o presioná la lupa para buscar…"
              leftIcon={<Search size={18} />}
              style={{ fontSize: 15 }}
            />
            <Button
              variant={showSearch ? 'primary' : 'secondary'}
              onClick={() => {
                setShowSearch(s => !s)
                setTimeout(() => searchRef.current?.focus(), 50)
              }}
              aria-label="Buscar por nombre"
            >
              <Search size={16} />
            </Button>
          </div>

          {showSearch && (
            <div data-enter style={{ padding: '0 24px 10px', position: 'relative' }}>
              <Input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nombre…"
              />
              {results.length > 0 && (
                <Card padding={6} style={{
                  position: 'absolute', top: '100%', left: 24, right: 24,
                  zIndex: 10, marginTop: 6,
                  maxHeight: 340, overflowY: 'auto',
                }}>
                  {results.map(p => (
                    <button
                      key={p.id}
                      onClick={() => addProduct(p)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between', gap: 10,
                        padding: '10px 12px', borderRadius: radius.md,
                        border: 'none', background: 'transparent',
                        color: color.text, cursor: 'pointer', fontFamily: 'inherit',
                        textAlign: 'left',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = color.surfaceHover }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: color.muted, marginTop: 2 }}>
                          {p.barcode || 'sin código'} · stock {p.stock}
                        </div>
                      </div>
                      <div style={{ color: color.accent, fontWeight: 700, fontSize: 14 }}>
                        {fmt(effectivePrice(p))}
                      </div>
                    </button>
                  ))}
                </Card>
              )}
            </div>
          )}

          <div ref={cartRef} data-enter style={{
            flex: 1, overflowY: 'auto',
            padding: '10px 24px 24px',
          }}>
            {cart.length === 0 ? (
              <EmptyCart />
            ) : (
              <CartTable
                cart={cart}
                onQty={updateQty}
                onRemove={removeItem}
              />
            )}
          </div>
        </div>

        {/* Derecha: total + cobrar */}
        <aside data-enter style={{
          width: 320, flexShrink: 0,
          padding: 24,
          display: 'flex', flexDirection: 'column', gap: 16,
          borderLeft: `1px solid ${color.border}`,
          background: 'rgba(255,255,255,0.015)',
        }}>
          <div style={{ flex: 1 }} />

          <Card padding={18}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              color: color.muted, fontSize: 12, marginBottom: 8,
              textTransform: 'uppercase', letterSpacing: 1,
            }}>
              <span>{cart.length} producto{cart.length !== 1 ? 's' : ''}</span>
              <span>{cart.reduce((s, i) => s + i.quantity, 0)} ud.</span>
            </div>
            <div style={{
              borderTop: `1px solid ${color.border}`, paddingTop: 12,
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
            }}>
              <span style={{ fontSize: 12, color: color.muted, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700 }}>Total</span>
              <div ref={totalRef} style={{
                fontSize: 32, fontWeight: 800, color: color.accent,
                letterSpacing: -0.5,
              }}>
                {fmt(total)}
              </div>
            </div>
          </Card>

          <Button
            variant="primary" size="lg"
            full
            disabled={cart.length === 0}
            onClick={() => setStep('checkout')}
            style={{ fontSize: 16, padding: '16px 0' }}
          >
            Cobrar {cart.length > 0 ? fmt(total) : ''}
          </Button>

          {cart.length > 0 && (
            <Button variant="danger" onClick={() => setCart([])} full>
              Limpiar carrito
            </Button>
          )}
        </aside>
      </div>
    </ScreenShell>
  )
}

// ───── sub-componentes ─────

function NoRegisterState() {
  const ref = useRef<HTMLDivElement>(null)
  useGSAP(() => {
    gsap.from(ref.current, { y: 20, opacity: 0, duration: 0.5, ease: 'power3.out' })
  }, { scope: ref })

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <Card ref={ref} padding={32} style={{ maxWidth: 420, textAlign: 'center' }}>
        <div style={{
          width: 56, height: 56, margin: '0 auto 18px',
          borderRadius: radius.lg,
          background: color.warningSoft, color: color.warning,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Lock size={26} />
        </div>
        <div style={{ fontSize: 18, color: color.text, fontWeight: 700, marginBottom: 6 }}>
          No hay caja abierta
        </div>
        <div style={{ fontSize: 13, color: color.muted, lineHeight: 1.55 }}>
          Abrí la caja desde el módulo <b style={{ color: color.accent }}>Caja</b> antes de empezar a vender.
        </div>
      </Card>
    </div>
  )
}

function DoneState({ ticket, onNew }: { ticket: number | null; onNew: () => void }) {
  const ref   = useRef<HTMLDivElement>(null)
  const iconRef = useRef<HTMLDivElement>(null)
  useGSAP(() => {
    const tl = gsap.timeline()
    tl.from(iconRef.current, { scale: 0.4, rotate: -20, opacity: 0, duration: 0.55, ease: 'back.out(2.6)' })
      .from(ref.current!.querySelectorAll('[data-line]'), {
        y: 12, opacity: 0, duration: 0.35, stagger: 0.08, ease: 'power2.out',
      }, '-=0.25')
  }, { scope: ref })

  return (
    <div ref={ref} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', gap: 18,
    }}>
      <div ref={iconRef} style={{
        width: 96, height: 96, borderRadius: 28,
        background: color.successSoft, color: color.success,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 60px rgba(34,197,94,0.28)',
      }}>
        <CheckCircle2 size={54} />
      </div>
      <div data-line style={{ fontSize: 26, fontWeight: 800, color: color.text, letterSpacing: -0.5 }}>
        ¡Venta confirmada!
      </div>
      <div data-line>
        <Pill tone="accent">Ticket N° {ticket}</Pill>
      </div>
      <div data-line style={{ display: 'flex', gap: 10, marginTop: 10 }}>
        <Button variant="primary" size="lg" onClick={onNew}>Nueva venta</Button>
        <Button variant="secondary" size="lg" leftIcon={<Printer size={16} />} onClick={() => {}}>
          Reimprimir
        </Button>
      </div>
    </div>
  )
}

function CheckoutState({
  cart, total, change, payMethod, amountPaid,
  onSetMethod, onSetAmount, onBack, onConfirm,
}: {
  cart: CartItem[]; total: number; change: number
  payMethod: 'CASH' | 'TRANSFER'; amountPaid: string
  onSetMethod: (m: 'CASH' | 'TRANSFER') => void
  onSetAmount: (s: string) => void
  onBack: () => void
  onConfirm: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useGSAP(() => {
    gsap.from(ref.current, { y: 20, opacity: 0, scale: 0.98, duration: 0.45, ease: 'power3.out' })
  }, { scope: ref })

  const canConfirm = payMethod === 'TRANSFER' || parseFloat(amountPaid) >= total

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <Card ref={ref} padding={28} style={{ width: 440 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: color.text, marginBottom: 20 }}>
          Confirmar cobro
        </div>

        <div style={{
          background: color.surface, border: `1px solid ${color.border}`,
          borderRadius: radius.md, padding: '14px 16px', marginBottom: 20,
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            color: color.muted, fontSize: 12, marginBottom: 6,
          }}>
            <span>{cart.length} producto{cart.length !== 1 ? 's' : ''}</span>
            <span>{cart.reduce((s, i) => s + i.quantity, 0)} unidades</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: color.muted, fontSize: 13 }}>Total</span>
            <span style={{ fontSize: 26, fontWeight: 800, color: color.accent, letterSpacing: -0.5 }}>
              {fmt(total)}
            </span>
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={{
            fontSize: 10, letterSpacing: 1.3, color: color.mutedDeep,
            fontWeight: 700, marginBottom: 8, textTransform: 'uppercase',
          }}>
            Forma de pago
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <PayMethodBtn
              active={payMethod === 'CASH'}
              icon={<Banknote size={18} />}
              label="Efectivo"
              onClick={() => onSetMethod('CASH')}
            />
            <PayMethodBtn
              active={payMethod === 'TRANSFER'}
              icon={<CreditCard size={18} />}
              label="Transferencia"
              onClick={() => onSetMethod('TRANSFER')}
            />
          </div>
        </div>

        {payMethod === 'CASH' && (
          <div style={{ marginBottom: 20 }}>
            <div style={{
              fontSize: 10, letterSpacing: 1.3, color: color.mutedDeep,
              fontWeight: 700, marginBottom: 8, textTransform: 'uppercase',
            }}>
              Monto recibido
            </div>
            <input
              type="number"
              value={amountPaid}
              onChange={e => onSetAmount(e.target.value)}
              autoFocus
              placeholder="0"
              style={{
                width: '100%', padding: '14px 16px',
                borderRadius: radius.md, border: `1px solid ${color.border}`,
                background: color.surface, color: color.text,
                fontSize: 22, fontWeight: 800, fontFamily: 'inherit',
                outline: 'none', letterSpacing: -0.3,
              }}
            />
            {parseFloat(amountPaid) >= total && total > 0 && (
              <div style={{
                marginTop: 12, padding: '12px 16px',
                borderRadius: radius.md,
                background: color.successSoft,
                border: '1px solid rgba(34,197,94,0.28)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ color: color.success, fontWeight: 700 }}>Vuelto</span>
                <span style={{ color: color.success, fontWeight: 800, fontSize: 20 }}>{fmt(change)}</span>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="ghost" size="lg" leftIcon={<ArrowLeft size={16} />} onClick={onBack}>
            Volver
          </Button>
          <Button
            variant="success"
            size="lg"
            full
            disabled={!canConfirm}
            onClick={onConfirm}
            style={{ fontSize: 15 }}
          >
            Confirmar cobro
          </Button>
        </div>
      </Card>
    </div>
  )
}

function PayMethodBtn({ active, icon, label, onClick }: {
  active: boolean; icon: React.ReactNode; label: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        padding: '14px 12px',
        borderRadius: radius.md,
        border: `2px solid ${active ? color.accent : color.border}`,
        background: active ? color.accentSoft : color.surface,
        color: active ? color.accent : color.muted,
        fontSize: 14, fontWeight: 700, cursor: 'pointer',
        transition: 'all 0.15s ease',
        fontFamily: 'inherit',
      }}
    >
      {icon} {label}
    </button>
  )
}

function EmptyCart() {
  const ref = useRef<HTMLDivElement>(null)
  useGSAP(() => {
    gsap.from(ref.current, { y: 10, opacity: 0, duration: 0.4, ease: 'power2.out' })
  }, { scope: ref })

  return (
    <div ref={ref} style={{
      height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 12, color: color.muted,
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: 20,
        background: color.surface, border: `1px dashed ${color.borderHi}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: color.mutedDeep,
      }}>
        <ShoppingCart size={30} />
      </div>
      <div style={{ fontSize: 14 }}>
        Escaneá o buscá un producto para empezar
      </div>
    </div>
  )
}

function CartTable({ cart, onQty, onRemove }: {
  cart: CartItem[]
  onQty: (i: number, d: number) => void
  onRemove: (i: number) => void
}) {
  const ref = useRef<HTMLTableSectionElement>(null)
  const prevLen = useRef(cart.length)

  // Anim nueva fila
  useGSAP(() => {
    if (cart.length > prevLen.current) {
      const rows = ref.current?.querySelectorAll('tr')
      if (rows && rows.length > 0) {
        gsap.fromTo(rows[rows.length - 1],
          { y: -8, opacity: 0, backgroundColor: color.accentSoft },
          { y: 0, opacity: 1, backgroundColor: 'transparent', duration: 0.5, ease: 'power2.out' })
      }
    }
    prevLen.current = cart.length
  }, { dependencies: [cart.length] })

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ fontSize: 10, letterSpacing: 1.3, color: color.mutedDeep, textAlign: 'left' }}>
          <th style={th}>Producto</th>
          <th style={{ ...th, textAlign: 'center', width: 130 }}>Cant.</th>
          <th style={{ ...th, textAlign: 'right', width: 90 }}>Precio</th>
          <th style={{ ...th, textAlign: 'right', width: 110 }}>Subtotal</th>
          <th style={{ width: 38 }} />
        </tr>
      </thead>
      <tbody ref={ref}>
        {cart.map((item, i) => (
          <tr key={`${item.product_id}-${i}`} style={{ borderBottom: `1px solid ${color.border}` }}>
            <td style={td}>
              <div style={{ fontSize: 14, color: color.text, fontWeight: 600 }}>{item.product_name}</div>
              {item.barcode && <div style={{ fontSize: 11, color: color.mutedDeep, marginTop: 2 }}>{item.barcode}</div>}
            </td>
            <td style={{ ...td, textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <QtyBtn onClick={() => onQty(i, -1)}><Minus size={12} /></QtyBtn>
                <span style={{ minWidth: 22, textAlign: 'center', color: color.text, fontWeight: 700 }}>{item.quantity}</span>
                <QtyBtn onClick={() => onQty(i, +1)}><Plus size={12} /></QtyBtn>
              </div>
            </td>
            <td style={{ ...td, textAlign: 'right', color: color.muted, fontSize: 13 }}>
              {fmt(item.unit_price)}
            </td>
            <td style={{ ...td, textAlign: 'right', color: color.text, fontWeight: 700 }}>
              {fmt(item.quantity * item.unit_price)}
            </td>
            <td style={{ ...td, textAlign: 'center', padding: '10px 2px' }}>
              <button
                onClick={() => onRemove(i)}
                title="Quitar"
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: color.mutedDeep, padding: 6, borderRadius: 8,
                  display: 'inline-flex',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = color.danger; e.currentTarget.style.background = color.dangerSoft }}
                onMouseLeave={e => { e.currentTarget.style.color = color.mutedDeep; e.currentTarget.style.background = 'transparent' }}
              >
                <Trash2 size={14} />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function QtyBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 26, height: 26, borderRadius: 8,
        border: `1px solid ${color.border}`,
        background: color.surface,
        color: color.text, cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.12s, border-color 0.12s',
        fontFamily: 'inherit',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = color.surfaceHover; e.currentTarget.style.borderColor = color.borderHi }}
      onMouseLeave={e => { e.currentTarget.style.background = color.surface; e.currentTarget.style.borderColor = color.border }}
    >
      {children}
    </button>
  )
}

const th: React.CSSProperties = { padding: '10px 8px', fontWeight: 700, textTransform: 'uppercase' }
const td: React.CSSProperties = { padding: '12px 8px' }
