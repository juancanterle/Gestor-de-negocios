import { supabaseAdmin } from '@/lib/supabase-admin'
import Link from 'next/link'
import { LogoutButton } from '@/app/components/LogoutButton'
import { ToggleStoreButton } from './ToggleStoreButton'

const fmt = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`

export const dynamic = 'force-dynamic'

async function getStoreStats(storeId: string) {
  const thirtyDays = new Date(Date.now() - 30 * 86400000).toISOString()
  const [salesRes, openRes, lastSaleRes] = await Promise.all([
    supabaseAdmin
      .from('sales')
      .select('total')
      .eq('store_id', storeId)
      .eq('status', 'COMPLETED')
      .gte('created_at', thirtyDays),
    supabaseAdmin
      .from('cash_registers')
      .select('id')
      .eq('store_id', storeId)
      .eq('status', 'OPEN')
      .limit(1),
    supabaseAdmin
      .from('sales')
      .select('created_at')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(1),
  ])
  const sales = salesRes.data ?? []
  const total30d = sales.reduce((s, v) => s + (v.total || 0), 0)
  return {
    tickets30d: sales.length,
    total30d,
    cashOpen: (openRes.data?.length ?? 0) > 0,
    lastSaleAt: lastSaleRes.data?.[0]?.created_at ?? null,
  }
}

export default async function AdminPage() {
  const { data: stores } = await supabaseAdmin
    .from('stores')
    .select('id, name, active, created_at')
    .order('created_at', { ascending: false })

  const { data: storeUsers } = await supabaseAdmin.from('store_users').select('id, store_id')
  const { data: authData } = await supabaseAdmin.auth.admin.listUsers()
  const authUsers = authData?.users ?? []

  const storesBase = (stores ?? []).map(store => {
    const su = storeUsers?.find(u => u.store_id === store.id)
    const authUser = su ? authUsers.find(u => u.id === su.id) : null
    return { ...store, ownerEmail: authUser?.email ?? '—', userId: su?.id ?? null }
  })

  const stats = await Promise.all(storesBase.map(s => getStoreStats(s.id)))
  const storesWithStats = storesBase.map((s, i) => ({ ...s, ...stats[i] }))

  const totalActive = storesWithStats.filter(s => s.active).length
  const grandTotal30d = storesWithStats.reduce((s, v) => s + v.total30d, 0)
  const grandTickets30d = storesWithStats.reduce((s, v) => s + v.tickets30d, 0)

  return (
    <div className="page" style={{ background: 'var(--bg)' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-strong)', letterSpacing: '-0.2px' }}>KioscoApp</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Panel de administración</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/admin/audit" style={{
            fontSize: 12, color: 'var(--text-muted)', background: 'var(--surface)',
            border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px',
            textDecoration: 'none', fontWeight: 500,
          }}>Auditoría</Link>
          <LogoutButton style={{
            fontSize: 12, color: 'var(--text-muted)', background: 'var(--surface)',
            border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px',
            cursor: 'pointer', fontWeight: 500,
          }} />
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        <KpiCard label="Locales"         value={String(storesWithStats.length)} accent="var(--brand-500)" />
        <KpiCard label="Activos"         value={String(totalActive)}            accent="var(--success-500)" />
        <KpiCard label="Tickets 30d"     value={String(grandTickets30d)}        accent="var(--accent-sky)" />
        <KpiCard label="Ingresos 30d"    value={fmt(grandTotal30d)}             accent="var(--accent-violet)" />
      </div>

      <section style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 14, overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 16px', borderBottom: '1px solid var(--border-soft)',
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
            letterSpacing: 1.5, textTransform: 'uppercase',
          }}>Locales</div>
          <Link href="/admin/new" style={{
            fontSize: 13, fontWeight: 600, color: '#fff',
            background: 'var(--brand-500)', padding: '6px 12px', borderRadius: 10,
            textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            <PlusIcon /> Nuevo local
          </Link>
        </div>

        {storesWithStats.length === 0 ? (
          <div style={{ color: 'var(--text-dim)', fontSize: 14, padding: '28px 16px', textAlign: 'center' }}>
            No hay locales aún. ¡Creá el primero!
          </div>
        ) : (
          storesWithStats.map((s, i) => (
            <div key={s.id} style={{
              padding: '14px 16px',
              borderBottom: i === storesWithStats.length - 1 ? 'none' : '1px solid var(--border-soft)',
              display: 'grid', gridTemplateColumns: '1.5fr 110px 140px 140px 80px',
              gap: 10, alignItems: 'center',
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: s.active ? 'var(--success-500)' : 'var(--text-faint)',
                    boxShadow: s.active ? '0 0 8px rgba(34,197,94,0.55)' : 'none',
                    flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-strong)' }}>{s.name}</span>
                  {s.cashOpen && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: 1,
                      color: 'var(--success-600)', background: 'var(--success-tint)',
                      padding: '2px 6px', borderRadius: 6, textTransform: 'uppercase',
                    }}>Caja abierta</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, marginLeft: 16 }}>
                  {s.ownerEmail}
                </div>
                {s.lastSaleAt && (
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 1, marginLeft: 16, fontFamily: 'var(--font-mono)' }}>
                    última venta: {new Date(s.lastSaleAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                {s.tickets30d}
                <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1 }}>tickets 30d</div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: 'var(--text-strong)', fontVariantNumeric: 'tabular-nums' }}>
                {fmt(s.total30d)}
                <div style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 500 }}>ingresos 30d</div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>
                {s.active ? 'Activo' : 'Inactivo'}
              </div>
              <div style={{ textAlign: 'right' }}>
                <ToggleStoreButton storeId={s.id} active={s.active} />
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  )
}

function KpiCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 14, padding: 14,
    }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: accent, marginTop: 8, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>{value}</div>
    </div>
  )
}

function PlusIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
}
