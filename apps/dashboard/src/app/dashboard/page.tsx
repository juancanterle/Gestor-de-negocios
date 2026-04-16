import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { LogoutButton } from '@/app/components/LogoutButton'

const fmt = (n: number) =>
  n?.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }) ?? '$0'

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
  const storeName = (storeUser.stores as any)?.name ?? 'Mi local'

  const { totalAmount, cashAmount, transferAmount, ticketCount, recent, lowStock, register } = await getData(storeId)

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px 40px', minHeight: '100vh', background: '#f8fafc' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#1e293b' }}>{storeName}</div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>
            {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>
        <LogoutButton style={{ fontSize: 12, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }} />
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <KpiCard label="Ventas hoy" value={fmt(totalAmount)} sub={`${ticketCount} ticket${ticketCount !== 1 ? 's' : ''}`} color="#6366f1" span />
        <KpiCard label="Efectivo"       value={fmt(cashAmount)}     sub="en caja" color="#22c55e" />
        <KpiCard label="Transferencias" value={fmt(transferAmount)} sub="digital" color="#38bdf8" />
        <KpiCard label="Ticket prom."
          value={fmt(ticketCount > 0 ? totalAmount / ticketCount : 0)}
          sub="por venta" color="#f59e0b" />
      </div>

      {/* Caja */}
      <Section title="Caja">
        {register ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>Abierta</span>
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                Desde {new Date(register.opened_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#6366f1' }}>
                {fmt(register.theoretical_amount ?? register.opening_amount)}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>monto teórico</div>
            </div>
          </div>
        ) : (
          <div style={{ color: '#94a3b8', fontSize: 14 }}>No hay caja abierta</div>
        )}
      </Section>

      {/* Últimas ventas */}
      <Section title="Últimas ventas">
        {recent.length === 0 ? (
          <div style={{ color: '#94a3b8', fontSize: 14 }}>Sin ventas hoy</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {recent.map((s: any) => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>#{s.ticket_number}</span>
                  <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 8 }}>
                    {new Date(s.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20,
                    background: s.payment_method === 'CASH' ? '#22c55e18' : '#38bdf818',
                    color:      s.payment_method === 'CASH' ? '#16a34a'   : '#0284c7',
                    fontWeight: 600 }}>
                    {s.payment_method === 'CASH' ? 'Efectivo' : 'Transfer.'}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#6366f1' }}>{fmt(s.total)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Stock bajo */}
      {lowStock.length > 0 && (
        <Section title={`⚠️ Stock bajo (${lowStock.length})`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {lowStock.map((p: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: 13, color: '#1e293b' }}>{p.name}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#f59e0b' }}>{p.stock} {p.unit}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

    </div>
  )
}

function KpiCard({ label, value, sub, color, span }: {
  label: string; value: string; sub: string; color: string; span?: boolean
}) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '16px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      gridColumn: span ? '1 / -1' : undefined,
      display: span ? 'flex' : 'block',
      justifyContent: span ? 'space-between' : undefined,
      alignItems: span ? 'center' : undefined,
    }}>
      <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: span ? 0 : 6 }}>{label.toUpperCase()}</div>
      <div>
        <div style={{ fontSize: span ? 28 : 22, fontWeight: 800, color }}>{value}</div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 12, letterSpacing: 0.5 }}>
        {title.toUpperCase()}
      </div>
      {children}
    </div>
  )
}
