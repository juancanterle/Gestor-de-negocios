import { supabaseAdmin } from '@/lib/supabase-admin'
import Link from 'next/link'
import { LogoutButton } from '@/app/components/LogoutButton'
import { ToggleStoreButton } from './ToggleStoreButton'

export default async function AdminPage() {
  const { data: stores } = await supabaseAdmin
    .from('stores')
    .select('id, name, active, created_at')
    .order('created_at', { ascending: false })

  const { data: storeUsers } = await supabaseAdmin
    .from('store_users')
    .select('id, store_id')

  const { data: authData } = await supabaseAdmin.auth.admin.listUsers()
  const authUsers = authData?.users ?? []

  const storesWithOwner = (stores ?? []).map(store => {
    const su = storeUsers?.find(u => u.store_id === store.id)
    const authUser = su ? authUsers.find(u => u.id === su.id) : null
    return { ...store, ownerEmail: authUser?.email ?? '—', userId: su?.id ?? null }
  })

  const totalActive = storesWithOwner.filter(s => s.active).length

  return (
    <div className="page" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-strong)', letterSpacing: '-0.2px' }}>KioscoApp</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Panel de administración</div>
        </div>
        <LogoutButton style={{
          fontSize: 12, color: 'var(--text-muted)', background: 'var(--surface)',
          border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px',
          cursor: 'pointer', fontWeight: 500,
        }} />
      </header>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <KpiCard label="Locales totales" value={storesWithOwner.length} color="var(--brand-500)" />
        <KpiCard label="Activos"          value={totalActive}            color="var(--success-500)" />
      </div>

      {/* Stores list */}
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
          <Link
            href="/admin/new"
            style={{
              fontSize: 13, fontWeight: 600, color: '#fff',
              background: 'var(--brand-500)', padding: '6px 12px', borderRadius: 10,
              textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >
            <PlusIcon /> Nuevo local
          </Link>
        </div>

        {storesWithOwner.length === 0 ? (
          <div style={{ color: 'var(--text-dim)', fontSize: 14, padding: '28px 16px', textAlign: 'center' }}>
            No hay locales aún. ¡Creá el primero!
          </div>
        ) : (
          storesWithOwner.map((store, i) => (
            <div
              key={store.id}
              style={{
                padding: '14px 16px',
                borderBottom: i === storesWithOwner.length - 1 ? 'none' : '1px solid var(--border-soft)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: store.active ? 'var(--success-500)' : 'var(--text-faint)',
                    flexShrink: 0,
                    boxShadow: store.active ? '0 0 8px rgba(34,197,94,0.55)' : 'none',
                  }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-strong)' }}>{store.name}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3, marginLeft: 16 }}>
                  {store.ownerEmail}
                </div>
                <div style={{
                  fontSize: 11, color: 'var(--text-faint)', marginTop: 2, marginLeft: 16,
                  fontFamily: 'var(--font-mono)', wordBreak: 'break-all',
                }}>
                  {store.id}
                </div>
              </div>
              <ToggleStoreButton storeId={store.id} active={store.active} />
            </div>
          ))
        )}
      </section>

    </div>
  )
}

function KpiCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 14, padding: 16,
    }}>
      <div style={{
        fontSize: 11, color: 'var(--text-muted)',
        fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase',
      }}>{label}</div>
      <div style={{
        fontSize: 28, fontWeight: 800, color,
        marginTop: 8, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em', lineHeight: 1,
      }}>{value}</div>
    </div>
  )
}

function PlusIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
}
