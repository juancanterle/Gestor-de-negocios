import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Trash2, Barcode, Lock, ArrowLeft,
  Banknote, CreditCard, QrCode, CheckCircle2, Printer, AlertTriangle,
} from 'lucide-react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import type { User, Product, CartItem } from '../types/api'
import {
  Button, Card, Kbd, Pill,
  color, radius, shadow, font,
  fmt, fmtMoney, splitMoney,
  useToast,
} from '../ui'

interface Props { user: User }

export default function POSScreen({ user }: Props) {
  const toast = useToast()

  const [cart, setCart]             = useState<CartItem[]>([])
  const [scanValue, setScanValue]   = useState('')
  const [flash, setFlash]           = useState<{ type: 'ok' | 'error'; msg: string } | null>(null)
  const [register, setRegister]     = useState<{ id: string } | null>(null)
  const [payMethod, setPayMethod]   = useState<'CASH' | 'TRANSFER' | 'CARD'>('CASH')
  const [amountPaid, setAmountPaid] = useState('')
  const [step, setStep]             = useState<'cart' | 'checkout' | 'done'>('cart')
  const [lastTicket, setLastTicket] = useState<number | null>(null)
  const [lastTotal, setLastTotal]   = useState(0)
  const [noRegister, setNoRegister] = useState(false)

  const scanRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const total  = cart.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const count  = cart.reduce((s, i) => s + i.quantity, 0)
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

  // F2 → pay shortcut
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'F2' && cart.length > 0 && step === 'cart') {
        e.preventDefault()
        setStep('checkout')
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [cart.length, step])

  const effectivePrice = (p: Product) =>
    p.use_manual && p.price_manual != null ? p.price_manual : p.price_auto

  const showFlash = useCallback((type: 'ok' | 'error', msg: string) => {
    setFlash({ type, msg })
    setTimeout(() => setFlash(null), type === 'ok' ? 1400 : 2000)
  }, [])

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
    showFlash('ok', `+ ${p.name}`)
    setTimeout(() => scanRef.current?.focus(), 30)
  }, [showFlash])

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const val = scanValue.trim()
    if (!val) return

    const p = await window.api.products.getByBarcode(val)
    if (p) {
      addProduct(p)
    } else {
      const results = await window.api.products.list({ search: val })
      if (results.length === 1) {
        addProduct(results[0])
      } else if (results.length > 1) {
        showFlash('error', `${results.length} resultados — sé más específico`)
      } else {
        showFlash('error', `Código "${val}" no encontrado`)
      }
    }
    setScanValue('')
  }

  const inc = (idx: number) =>
    setCart(prev => prev.map((i, n) => n === idx ? { ...i, quantity: i.quantity + 1 } : i))
  const dec = (idx: number) =>
    setCart(prev => prev.map((i, n) => n === idx ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i))
  const removeItem = (idx: number) =>
    setCart(prev => prev.filter((_, n) => n !== idx))

  const confirmSale = async () => {
    if (!register || cart.length === 0) return
    if (payMethod === 'CASH' && parseFloat(amountPaid) < total) return

    const backendMethod: 'CASH' | 'TRANSFER' =
      payMethod === 'CARD' ? 'TRANSFER' : payMethod

    const sale = await window.api.sales.create({
      user_id: user.id,
      cash_register_id: register.id,
      items: cart,
      subtotal: total,
      total,
      payment_method: backendMethod,
      amount_paid: payMethod === 'CASH' ? parseFloat(amountPaid) : undefined,
      change_given: payMethod === 'CASH' ? change : undefined,
    })

    setLastTicket(sale.ticket_number)
    setLastTotal(total)
    setCart([])
    setAmountPaid('')
    setPayMethod('CASH')
    setStep('done')
    toast.success('Venta cobrada', `Ticket #${sale.ticket_number} · ${fmt(total)}`)
  }

  if (noRegister) return <NoRegisterState />

  if (step === 'done') {
    return <DoneState
      ticket={lastTicket}
      total={lastTotal}
      onNew={() => setStep('cart')}
    />
  }

  // ── CART (default) ──
  return (
    <div ref={rootRef} style={{
      display: 'grid', gridTemplateColumns: '1fr 380px',
      height: '100%', overflow: 'hidden',
    }}>
      {/* Left: scanner + cart */}
      <section style={{
        padding: 24, display: 'flex', flexDirection: 'column', gap: 20,
        minWidth: 0, position: 'relative',
      }}>
        <form onSubmit={handleScanSubmit} style={S.scanZone}>
          <div style={S.scanIcon}>
            <Barcode size={20} />
          </div>
          <input
            ref={scanRef}
            value={scanValue}
            onChange={e => setScanValue(e.target.value)}
            placeholder="Escaneá o buscá un producto para empezar…"
            onKeyDown={e => {
              if (e.key === 'Escape') {
                setScanValue('')
                setCart([])
              }
            }}
            style={{
              background: 'none', border: 'none', outline: 'none', flex: 1,
              color: color.textStrong,
              fontSize: scanValue ? 22 : 16,
              fontWeight: scanValue ? 600 : 400,
              fontFamily: scanValue ? font.mono : 'inherit',
              letterSpacing: scanValue ? 0.2 : 0,
            }}
          />
          <Kbd>⎋ Cancelar</Kbd>
        </form>

        {flash && <FlashPill type={flash.type} msg={flash.msg} />}

        <div style={S.cartWrap}>
          <div style={S.cartHead}>
            <span>Producto</span>
            <span>Cantidad</span>
            <span style={{ textAlign: 'right' }}>Precio</span>
            <span style={{ textAlign: 'right' }}>Subtotal</span>
            <span />
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {cart.length === 0
              ? <EmptyCart />
              : cart.map((item, idx) => (
                  <CartRow
                    key={`${item.product_id}-${idx}`}
                    item={item} idx={idx}
                    inc={inc} dec={dec} del={removeItem}
                  />
                ))
            }
          </div>
          <div style={S.cartFooter}>
            <span><b style={{ color: color.muted, fontWeight: 600 }}>{count} ítems</b></span>
            <div style={{ display: 'flex', gap: 18, color: color.mutedDeep }}>
              <span>⎋ Vaciar</span><span>F3 Descuento</span><span>F4 Cliente</span>
            </div>
          </div>
        </div>
      </section>

      {/* Right: summary + pay */}
      <aside style={S.summary}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SumLine k="Subtotal"  v={fmtMoney(total, { cents: true })} />
          <SumLine k="Ítems"     v={count.toString()} />
          <SumLine k="Descuento" v="—" dim />
        </div>
        <div style={{ height: 1, background: color.border, margin: '16px 0' }} />
        <SumLine k="Cliente" v="Sin identificar" dim />
        <SumLine k="Caja"    v={`#04 · ${user.name.split(' ')[0]}`} />

        <div style={{ marginTop: 'auto', padding: '24px 0 16px' }}>
          <div style={S.totalLabel}>Total a cobrar</div>
          <div style={S.totalValue}>
            ${splitMoney(total).int}
            <span style={S.totalCents}>,{splitMoney(total).cents}</span>
          </div>
        </div>

        <button
          disabled={cart.length === 0}
          onClick={() => setStep('checkout')}
          style={{
            ...S.cobrar,
            background: cart.length > 0 ? color.ctaGrad : '#20242f',
            cursor: cart.length > 0 ? 'pointer' : 'not-allowed',
            boxShadow: cart.length > 0 ? '0 0 32px rgba(56,189,248,0.35)' : 'none',
            opacity: cart.length > 0 ? 1 : 0.5,
          }}
        >
          Cobrar
          <Kbd tone="inverted" style={{ fontSize: 11 }}>F2</Kbd>
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
          <button style={S.secondaryBtn}>Guardar venta</button>
          <button style={S.secondaryBtn}>Descontar stock</button>
        </div>
      </aside>

      {step === 'checkout' && (
        <CheckoutModal
          total={total}
          count={count}
          payMethod={payMethod}
          amountPaid={amountPaid}
          change={change}
          onSetMethod={setPayMethod}
          onSetAmount={setAmountPaid}
          onCancel={() => setStep('cart')}
          onConfirm={confirmSale}
        />
      )}
    </div>
  )
}

// ───── sub-components ─────

function FlashPill({ type, msg }: { type: 'ok' | 'error'; msg: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useGSAP(() => {
    gsap.from(ref.current, { y: -10, opacity: 0, duration: 0.3, ease: 'power2.out' })
  }, { scope: ref })

  const ok = type === 'ok'
  return (
    <div ref={ref} style={{
      position: 'absolute', top: 88, left: '50%', transform: 'translateX(-50%)',
      zIndex: 5,
      background: color.surface2,
      border: `1px solid ${ok ? 'rgba(34,197,94,0.30)' : 'rgba(239,68,68,0.30)'}`,
      borderLeft: `3px solid ${ok ? color.success : color.danger}`,
      borderRadius: radius.lg,
      padding: '10px 16px',
      fontSize: 13, fontWeight: 600,
      color: ok ? color.success : color.danger,
      boxShadow: shadow.lg,
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      {ok ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
      {msg}
    </div>
  )
}

function EmptyCart() {
  const ref = useRef<HTMLDivElement>(null)
  useGSAP(() => {
    gsap.from(ref.current, { y: 10, opacity: 0, duration: 0.4, ease: 'power2.out' })
  }, { scope: ref })

  return (
    <div ref={ref} style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: 40, gap: 12, color: color.mutedDeep,
      minHeight: 280,
    }}>
      <div style={{ opacity: 0.4 }}><Barcode size={56} strokeWidth={1.2} /></div>
      <div style={{ fontSize: 15, color: color.muted, fontWeight: 500 }}>
        Escaneá un producto para empezar
      </div>
      <div style={{ fontSize: 12, fontFamily: font.mono, color: color.mutedFaint }}>
        Probá: <span style={{ color: color.sky }}>7791234567892</span>
      </div>
    </div>
  )
}

function CartRow({ item, idx, inc, dec, del }: {
  item: CartItem; idx: number
  inc: (i: number) => void; dec: (i: number) => void; del: (i: number) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useGSAP(() => {
    gsap.fromTo(ref.current,
      { x: -8, opacity: 0, backgroundColor: 'rgba(99,102,241,0.12)' },
      { x: 0, opacity: 1, backgroundColor: 'transparent', duration: 0.36, ease: 'power3.out' })
  }, { scope: ref })

  return (
    <div ref={ref} style={S.cartRow}>
      <div>
        <div style={{ color: color.textStrong, fontWeight: 500 }}>{item.product_name}</div>
        <div style={{ fontFamily: font.mono, fontSize: 11, color: color.mutedFaint, marginTop: 2 }}>
          {item.barcode || 'sin código'}
        </div>
      </div>
      <div>
        <div style={S.qtyGroup}>
          <button onClick={() => dec(idx)} style={S.qtyBtn}>−</button>
          <span style={S.qtyValue}>{item.quantity}</span>
          <button onClick={() => inc(idx)} style={S.qtyBtn}>+</button>
        </div>
      </div>
      <div style={{ textAlign: 'right', fontFamily: font.mono, color: color.text }}>
        {fmtMoney(item.unit_price, { cents: true })}
      </div>
      <div style={{ textAlign: 'right', fontFamily: font.mono, color: color.textStrong, fontWeight: 600 }}>
        {fmtMoney(item.quantity * item.unit_price, { cents: true })}
      </div>
      <div>
        <button onClick={() => del(idx)} style={S.trashBtn} title="Quitar">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  )
}

function SumLine({ k, v, dim }: { k: string; v: string; dim?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      fontSize: 14,
    }}>
      <b style={{ color: color.muted, fontWeight: 500 }}>{k}</b>
      <span style={{
        color: dim ? color.mutedDeep : color.text,
        fontFamily: font.mono,
      }}>{v}</span>
    </div>
  )
}

function NoRegisterState() {
  const ref = useRef<HTMLDivElement>(null)
  useGSAP(() => {
    gsap.from(ref.current, { y: 20, opacity: 0, duration: 0.5, ease: 'power3.out' })
  }, { scope: ref })

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100%', padding: 40,
    }}>
      <Card ref={ref} padding={32} style={{ maxWidth: 440, textAlign: 'center' }}>
        <div style={{
          width: 56, height: 56, margin: '0 auto 18px',
          borderRadius: radius.lg,
          background: color.warningTint, color: color.warning,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Lock size={26} />
        </div>
        <div style={{ fontSize: 20, color: color.textStrong, fontWeight: 700, marginBottom: 6 }}>
          Sin caja abierta
        </div>
        <div style={{ fontSize: 13, color: color.muted, lineHeight: 1.55 }}>
          Abrí la caja desde el módulo <b style={{ color: color.brand400 }}>Caja</b> antes de empezar a vender.
        </div>
      </Card>
    </div>
  )
}

function DoneState({ ticket, total, onNew }: {
  ticket: number | null; total: number; onNew: () => void
}) {
  const ref     = useRef<HTMLDivElement>(null)
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
        background: color.successTint, color: color.success,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 60px rgba(34,197,94,0.28)',
      }}>
        <CheckCircle2 size={54} />
      </div>
      <div data-line style={{ fontSize: 28, fontWeight: 800, color: color.textStrong, letterSpacing: -0.5 }}>
        ¡Venta cobrada!
      </div>
      <div data-line style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <Pill tone="accent">Ticket #{ticket}</Pill>
        <span style={{ color: color.muted, fontFamily: font.mono, fontSize: 14 }}>
          {fmtMoney(total, { cents: true })}
        </span>
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

// ───── Checkout modal ─────

function CheckoutModal({
  total, count, payMethod, amountPaid, change,
  onSetMethod, onSetAmount, onCancel, onConfirm,
}: {
  total: number; count: number
  payMethod: 'CASH' | 'TRANSFER' | 'CARD'
  amountPaid: string; change: number
  onSetMethod: (m: 'CASH' | 'TRANSFER' | 'CARD') => void
  onSetAmount: (s: string) => void
  onCancel: () => void
  onConfirm: () => void
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const backRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    gsap.from(backRef.current, { opacity: 0, duration: 0.2 })
    gsap.from(cardRef.current, { y: 14, opacity: 0, scale: 0.98, duration: 0.35, ease: 'power3.out' })
  }, { scope: backRef })

  const canConfirm = payMethod !== 'CASH' || parseFloat(amountPaid) >= total

  // Keyboard shortcuts: F1/F2/F3 methods, Esc cancel, Enter confirm
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onCancel() }
      if (e.key === 'Enter' && canConfirm) { e.preventDefault(); onConfirm() }
      if (e.key === 'F1') { e.preventDefault(); onSetMethod('CASH') }
      if (e.key === 'F2') { e.preventDefault(); onSetMethod('CARD') }
      if (e.key === 'F3') { e.preventDefault(); onSetMethod('TRANSFER') }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [canConfirm, onCancel, onConfirm, onSetMethod])

  const methods: { id: 'CASH' | 'CARD' | 'TRANSFER'; label: string; kbd: string; Icon: React.ComponentType<{ size?: number }> }[] = [
    { id: 'CASH',     label: 'Efectivo',    kbd: 'F1', Icon: Banknote    },
    { id: 'CARD',     label: 'Tarjeta',     kbd: 'F2', Icon: CreditCard  },
    { id: 'TRANSFER', label: 'MercadoPago', kbd: 'F3', Icon: QrCode      },
  ]

  return (
    <div ref={backRef} style={{
      position: 'absolute', inset: 0, zIndex: 30,
      background: 'rgba(5,7,12,0.55)', backdropFilter: 'blur(3px)',
      display: 'grid', placeItems: 'center', padding: 40,
    }}>
      <div ref={cardRef} style={{
        width: 480,
        background: color.surface2,
        border: `1px solid ${color.border}`,
        borderRadius: radius['3xl'],
        padding: 28,
        boxShadow: shadow.xl,
      }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: color.textStrong, letterSpacing: -0.2 }}>
          Cobrar venta
        </div>
        <div style={{ fontSize: 13, color: color.muted, marginTop: 4 }}>
          {count} ítems · {count === 1 ? 'Un' : ''} producto{count !== 1 ? 's' : ''}
        </div>

        <div style={{
          margin: '24px 0', padding: '18px 20px',
          background: color.bg, borderRadius: radius.lg,
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        }}>
          <span style={{
            fontSize: 11, color: color.mutedDeep, textTransform: 'uppercase',
            fontWeight: 700, letterSpacing: 1.5,
          }}>
            Total
          </span>
          <span style={{
            fontSize: 28, fontWeight: 800, color: color.brand400,
            fontFamily: font.mono, letterSpacing: -0.5,
          }}>
            {fmtMoney(total, { cents: true })}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {methods.map(m => {
            const active = payMethod === m.id
            return (
              <button
                key={m.id}
                onClick={() => onSetMethod(m.id)}
                style={{
                  padding: '18px 12px',
                  background: active ? 'rgba(99,102,241,0.08)' : color.bg,
                  border: `1px solid ${active ? color.brand : color.border}`,
                  borderRadius: radius.lg,
                  textAlign: 'center', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  boxShadow: active ? '0 0 0 3px rgba(99,102,241,0.15)' : 'none',
                  transition: 'all 120ms',
                  fontFamily: 'inherit',
                }}
              >
                <div style={{ color: active ? color.brand400 : color.muted }}>
                  <m.Icon size={24} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: color.text }}>
                  {m.label}
                </div>
                <Kbd>{m.kbd}</Kbd>
              </button>
            )
          })}
        </div>

        {payMethod === 'CASH' ? (
          <>
            <div style={{ marginTop: 20 }}>
              <div style={{
                fontSize: 11, color: color.mutedDeep, textTransform: 'uppercase',
                fontWeight: 700, letterSpacing: 1.5, marginBottom: 8,
              }}>
                Recibido
              </div>
              <div style={{
                background: color.bg, border: `1px solid ${color.border}`,
                borderRadius: radius.md, padding: '14px 16px',
                fontSize: 22, fontWeight: 600, color: color.textStrong,
                fontFamily: font.mono,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ color: color.mutedDeep }}>$</span>
                <input
                  autoFocus
                  value={amountPaid}
                  onChange={e => onSetAmount(e.target.value.replace(/[^0-9]/g, ''))}
                  style={{
                    background: 'none', border: 'none', outline: 'none',
                    color: 'inherit', fontSize: 'inherit', fontFamily: 'inherit',
                    fontWeight: 'inherit', flex: 1,
                  }}
                />
              </div>
            </div>
            {change > 0 && (
              <div style={{
                marginTop: 14, padding: '16px 20px',
                background: color.successTint,
                border: `1px solid ${color.successBorder}`,
                borderRadius: radius.lg,
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              }}>
                <span style={{
                  fontSize: 11, color: color.success, textTransform: 'uppercase',
                  fontWeight: 700, letterSpacing: 1.5,
                }}>
                  Vuelto
                </span>
                <span style={{
                  fontSize: 22, fontWeight: 800, color: color.success,
                  fontFamily: font.mono,
                }}>
                  {fmtMoney(change, { cents: true })}
                </span>
              </div>
            )}
          </>
        ) : (
          <div style={{
            marginTop: 20, padding: 20,
            background: color.bg, borderRadius: radius.lg,
            border: `1px dashed ${color.border}`,
            textAlign: 'center', color: color.muted, fontSize: 13,
          }}>
            {payMethod === 'CARD'
              ? 'Pasá la tarjeta por el POSnet…'
              : 'Esperando confirmación de MercadoPago…'}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: 12,
            background: 'transparent',
            border: `1px solid ${color.border}`,
            borderRadius: radius.md,
            color: color.muted, fontSize: 13, fontWeight: 500,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <ArrowLeft size={14} /> Cancelar <Kbd>Esc</Kbd>
          </button>
          <button
            disabled={!canConfirm}
            onClick={onConfirm}
            style={{
              flex: 2, padding: 12,
              background: canConfirm ? color.brand : '#2a2d3a',
              border: 'none', borderRadius: radius.md,
              color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: canConfirm ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
              boxShadow: canConfirm ? '0 8px 20px -8px rgba(99,102,241,0.6)' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              opacity: canConfirm ? 1 : 0.5,
            }}
          >
            Confirmar cobro
            <Kbd tone="inverted">⏎</Kbd>
          </button>
        </div>
      </div>
    </div>
  )
}

// ───── styles ─────

const S: Record<string, React.CSSProperties> = {
  scanZone: {
    background: color.surface,
    border: `1.5px solid ${color.brand}`,
    borderRadius: radius.lg,
    padding: '16px 20px',
    display: 'flex', alignItems: 'center', gap: 16,
    boxShadow: '0 0 0 4px rgba(99,102,241,0.08)',
  },
  scanIcon: {
    width: 40, height: 40, borderRadius: radius.md,
    background: 'rgba(99,102,241,0.15)',
    display: 'grid', placeItems: 'center',
    color: color.brand400,
  },

  cartWrap: {
    flex: 1,
    background: color.surface,
    border: `1px solid ${color.border}`,
    borderRadius: radius.xl,
    overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
    minHeight: 0,
  },
  cartHead: {
    display: 'grid',
    gridTemplateColumns: '1fr 110px 110px 120px 32px',
    gap: 16,
    padding: '14px 20px',
    borderBottom: `1px solid ${color.border}`,
    fontSize: 10, color: color.mutedDeep,
    textTransform: 'uppercase', fontWeight: 700, letterSpacing: 1.5,
  },
  cartRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 110px 110px 120px 32px',
    gap: 16,
    padding: '14px 20px',
    borderBottom: '1px solid rgba(42,45,58,0.5)',
    alignItems: 'center', fontSize: 14,
  },
  cartFooter: {
    padding: '14px 20px',
    borderTop: `1px solid ${color.border}`,
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    fontSize: 12, color: color.mutedDeep,
    fontFamily: font.mono, letterSpacing: 0.2,
  },
  qtyGroup: {
    display: 'inline-flex', alignItems: 'center',
    background: color.bg, borderRadius: radius.md, overflow: 'hidden',
    border: `1px solid ${color.border}`,
  },
  qtyBtn: {
    width: 28, height: 28, background: 'none', border: 'none',
    color: color.muted, cursor: 'pointer', fontSize: 14,
    fontFamily: 'inherit',
  },
  qtyValue: {
    width: 32, textAlign: 'center',
    fontFamily: font.mono, fontSize: 13,
    color: color.text, fontWeight: 600,
  },
  trashBtn: {
    color: color.mutedFaint, cursor: 'pointer',
    background: 'none', border: 'none',
    padding: 6, borderRadius: radius.sm,
  },

  summary: {
    background: '#13171f',
    borderLeft: `1px solid ${color.border}`,
    display: 'flex', flexDirection: 'column',
    padding: '28px 28px 20px',
  },
  totalLabel: {
    fontSize: 11, color: color.mutedDeep,
    textTransform: 'uppercase', fontWeight: 700, letterSpacing: 1.5,
  },
  totalValue: {
    fontSize: 52, fontWeight: 800, letterSpacing: -0.5,
    color: color.textStrong,
    marginTop: 6,
    fontFamily: 'inherit',
    fontVariantNumeric: 'tabular-nums',
    lineHeight: 1,
  },
  totalCents: {
    fontSize: 30, color: color.muted, fontWeight: 600, marginLeft: 2,
  },
  cobrar: {
    width: '100%', padding: '18px 20px',
    border: 'none', borderRadius: radius.lg,
    color: '#fff', fontSize: 16, fontWeight: 700, letterSpacing: 0.2,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
    fontFamily: 'inherit',
    transition: 'all 150ms',
  },
  secondaryBtn: {
    padding: 11,
    background: color.surface,
    border: `1px solid ${color.border}`,
    borderRadius: radius.md,
    color: color.muted, fontSize: 12, fontWeight: 500,
    cursor: 'pointer', fontFamily: 'inherit',
  },
}
