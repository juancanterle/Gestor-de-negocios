import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { LogoutButton } from '@/app/components/LogoutButton'

const fmtInt = (n: number) => Math.floor(Math.abs(n)).toLocaleString('es-AR')
const fmtCents = (n: number) => Math.round((Math.abs(n) - Math.floor(Math.abs(n))) * 100).toString().padStart(2, '0')
const fmt = (n: number) => `$${fmtInt(n)}`

async function getData(storeId: string) {
  const supabase = await createClient()

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const [salesRes, recentRes, productsRes, cashRes] = await Promise.all([
    supabase
      .from('sales')
      .select('total, payment_method')
      .eq('store_id', storeId)
      .eq('status', 'COMPLETED')
      .gte('created_at', todayStart.toISOString())
      .lte('created_at', todayEnd.toISOString()),

    supabase
      .from('sales')
      .select('id, ticket_number, total, payment_method, created_at')
      .eq('store_id', storeId)
      .eq('status', 'COMPLETED')
      .order('created_at', { ascending: false })
      .limit(6),

    supabase
      .from('products')
      .select('name, stock, stock_min, unit')
      .eq('store_id', storeId)
      .gt('stock_min', 0)
      .filter('stock', 'lte', 'stock_min')
      .limit(10),

    supabase
      .from('cash_registers')
      .select('*')
      .eq('store_id', storeId)
      .eq('status', 'OPEN')
      .order('opened_at', { ascending: false })
      .limit(1),
  ])

  const sales    = salesRes.data ?? []
  const recent   = recentRes.data ?? []
  const lowStock = productsRes.data ?? []
  const register = cashRes.data?.[0] ?? null

  const totalAmount    = sales.reduce((s, v) => s + v.total, 0)
  const cashAmount     = sales.filter(v => v.payment_method === 'CASH').reduce((s, v) => s + v.total, 0)
  const transferAmount = sales.filter(v => v.payment_method === 'TRANSFER').reduce((s, v) => s + v.total, 0)
  const ticketCount    = sales.length

  return { totalAmount, cashAmount, transferAmount, ticketCount, recent, lowStock, register }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: storeUser } = await supabase
    .from('store_users')
    .select('store_id, stores(name)')
    .eq('id', user.id)
    .single()

  if (!storeUser) redirect('/')

  const storeId   = storeUser.store_id
  const storeName = (storeUser.stores as { name?: string } | null)?.name ?? 'Mi local'

  const { totalAmount, cashAmount, transferAmount, ticketCount, recent, lowStock, register } = await getData(storeId)

  const today = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
  const outOfStock = lowStock.filter(p => p.stock <= 0).length
  const belowMin   = lowStock.length - outOfStock
  const avgTicket  = ticketCount > 0 ? totalAmount / ticketCount : 0

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px 40px', minHeight: '100vh', background: 'var(--bg)' }}>

      {/* ── Greeting header ── */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Hola,</div>
          <h1 style={{ margin: '2px 0 0', fontSize: 22, fontWeight: 700, color: 'var(--text-strong)', letterSpacing: '-0.2px' }}>
            {storeName}
          </h1>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4, textTransform: 'capitalize' }}>{today}</div>
        </div>
        <LogoutButton style={{
          fontSize: 12, color: 'var(--text-muted)', background: 'var(--surface)',
          border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px',
          cursor: 'pointer', fontWeight: 500,
        }} />
      </header>

      {/* ── Hero: Ventas hoy ── */}
      <section style={{
        padding: '26px 22px 22px', borderRadius: 22,
        background: 'var(--g-hero)', color: '#fff',
        position: 'relative', overflow: 'hidden',
        boxShadow: 'var(--glow-brand)',
        marginBottom: 14,
      }}>
        <div aria-hidden style={{
          position: 'absolute', width: 180, height: 180, borderRadius: '50%',
          background: 'rgba(255,255,255,0.12)', top: -60, right: -50,
        }} />
        <div style={{
          fontSize: 11, textTransform: 'uppercase', fontWeight: 600,
          letterSpacing: 1.5, opacity: 0.85, position: 'relative',
        }}>Ventas hoy</div>
        <div style={{
          fontSize: 44, fontWeight: 800, letterSpacing: '-0.025em',
          marginTop: 8, fontVariantNumeric: 'tabular-nums', position: 'relative', lineHeight: 1,
        }}>
          ${fmtInt(totalAmount)}
          <span style={{ fontSize: 22, opacity: 0.7, fontWeight: 600, marginLeft: 1 }}>
            ,{fmtCents(totalAmount)}
          </span>
        </div>
        <div style={{
          marginTop: 18, paddingTop: 14,
          borderTop: '1px solid rgba(255,255,255,0.18)',
          fontSize: 12, opacity: 0.95,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'relative',
        }}>
          <span style={{ opacity: 0.85 }}>
            {ticketCount} {ticketCount === 1 ? 'ticket' : 'tickets'}
            {ticketCount > 0 && ` · ticket prom. ${fmt(avgTicket)}`}
          </span>
        </div>
      </section>

      {/* ── Caja ── */}
      <CajaCard register={register} />

      {/* ── Attention: low stock ── */}
      {lowStock.length > 0 && (
        <AttentionCard
          count={lowStock.length}
          outOfStock={outOfStock}
          belowMin={belowMin}
        />
      )}

      {/* ── Efectivo / Transferencias ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '12px 0' }}>
        <MiniCard label="Efectivo"       value={fmt(cashAmount)}     tone="success" />
        <MiniCard label="Transferencias" value={fmt(transferAmount)} tone="sky" />
      </div>

      {/* ── Últimas ventas ── */}
      <div style={{ marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-strong)' }}>Últimas ventas</div>
          {recent.length > 0 && (
            <div style={{ fontSize: 12, color: 'var(--brand-500)', fontWeight: 600 }}>{recent.length}</div>
          )}
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          {recent.length === 0 ? (
            <div style={{ color: 'var(--text-dim)', fontSize: 13, padding: '18px', textAlign: 'center' }}>
              Todavía no vendiste hoy.
            </div>
          ) : recent.map((s, i) => (
            <SaleRow key={s.id} sale={s} isLast={i === recent.length - 1} />
          ))}
        </div>
      </div>

    </div>
  )
}

/* ── Components ───────────────────────────────────────────── */

function CajaCard({ register }: { register: { opened_at: string; theoretical_amount?: number; opening_amount?: number } | null }) {
  if (!register) {
    return (
      <div style={cajaBase}>
        <div style={{ ...icTile, background: 'rgba(148,163,184,0.15)' }}>
          <LockIcon />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-strong)' }}>Caja cerrada</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            Abrila desde el local para empezar a vender
          </div>
        </div>
      </div>
    )
  }
  const openedAt = new Date(register.opened_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  const theoretical = register.theoretical_amount ?? register.opening_amount ?? 0
  return (
    <div style={cajaBase}>
      <div style={{ ...icTile, background: 'rgba(34,197,94,0.12)' }}>
        <CheckIcon />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-strong)' }}>Caja abierta</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
          Desde {openedAt} hs
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-strong)', fontVariantNumeric: 'tabular-nums' }}>
          {fmt(theoretical)}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 1, textTransform: 'uppercase', letterSpacing: 0.8 }}>
          en caja
        </div>
      </div>
    </div>
  )
}

function AttentionCard({ count, outOfStock, belowMin }: { count: number; outOfStock: number; belowMin: number }) {
  const parts = []
  if (outOfStock > 0) parts.push(`${outOfStock} sin stock`)
  if (belowMin > 0)   parts.push(`${belowMin} con stock bajo`)
  return (
    <div style={{
      padding: '14px 16px',
      background: 'linear-gradient(180deg, #fffbeb 0%, #fff 100%)',
      border: '1px solid #fde68a',
      borderRadius: 14,
      display: 'flex', alignItems: 'center', gap: 12,
      marginBottom: 4,
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10,
        background: '#fef3c7', color: '#b45309',
        display: 'grid', placeItems: 'center', flexShrink: 0,
      }}>
        <AlertIcon />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-strong)' }}>
          {count} {count === 1 ? 'producto necesita' : 'productos necesitan'} reposición
        </div>
        <div style={{ fontSize: 11, color: '#78716c', marginTop: 2 }}>
          {parts.join(' · ') || 'Revisá el stock mínimo'}
        </div>
      </div>
    </div>
  )
}

function MiniCard({ label, value, tone }: { label: string; value: string; tone: 'success' | 'sky' }) {
  const accent = tone === 'success' ? 'var(--success-500)' : 'var(--accent-sky)'
  return (
    <div style={{
      padding: 14, borderRadius: 14,
      background: 'var(--surface)', border: '1px solid var(--border)',
    }}>
      <div style={{
        fontSize: 10, color: 'var(--text-muted)',
        textTransform: 'uppercase', fontWeight: 600, letterSpacing: 1.5,
      }}>{label}</div>
      <div style={{
        fontSize: 20, fontWeight: 700, color: 'var(--text-strong)',
        marginTop: 6, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em',
      }}>{value}</div>
      <div style={{
        fontSize: 10, marginTop: 3, fontFamily: 'var(--font-mono)',
        fontWeight: 600, color: accent,
      }}>● hoy</div>
    </div>
  )
}

function SaleRow({ sale, isLast }: {
  sale: { id: string; ticket_number: number; total: number; payment_method: string; created_at: string }
  isLast: boolean
}) {
  const isCash = sale.payment_method === 'CASH'
  const time   = new Date(sale.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 14px',
      borderBottom: isLast ? 'none' : '1px solid var(--border-soft)',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        display: 'grid', placeItems: 'center', flexShrink: 0,
        background: isCash ? 'var(--success-tint)' : 'var(--sky-tint)',
        color:      isCash ? 'var(--success-600)' : 'var(--accent-sky)',
      }}>
        {isCash ? <CashIcon /> : <PhoneIcon />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-strong)' }}>
          Ticket #{sale.ticket_number}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 1, fontFamily: 'var(--font-mono)' }}>
          {isCash ? 'Efectivo' : 'Transferencia'}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 700, color: 'var(--text-strong)',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {fmt(sale.total)}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 1, fontFamily: 'var(--font-mono)' }}>
          {time} hs
        </div>
      </div>
    </div>
  )
}

/* ── Inline lucide-style icons ───────────────────────────── */

function AlertIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
}
function CheckIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--success-600)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
}
function LockIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
}
function CashIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>
  </svg>
}
function PhoneIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
  </svg>
}

/* ── Shared inline styles ────────────────────────────────── */

const icTile: React.CSSProperties = {
  width: 42, height: 42, borderRadius: 12,
  display: 'grid', placeItems: 'center', flexShrink: 0,
}

const cajaBase: React.CSSProperties = {
  padding: 14, borderRadius: 14,
  background: 'var(--surface)', border: '1px solid var(--border)',
  display: 'flex', alignItems: 'center', gap: 14,
  marginBottom: 4,
}
