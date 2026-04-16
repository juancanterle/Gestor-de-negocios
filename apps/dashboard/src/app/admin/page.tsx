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
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 16px 40px', minHeight: '100vh', background: '#f8fafc' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#1e293b' }}>KioscoApp</div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>Panel de administración</div>
        </div>
        <LogoutButton style={{ fontSize: 12, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }} />
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div style={card}>
          <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 6 }}>LOCALES TOTALES</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#6366f1' }}>{storesWithOwner.length}</div>
        </div>
        <div style={card}>
          <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 6 }}>ACTIVOS</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#22c55e' }}>{totalActive}</div>
        </div>
      </div>

      {/* Stores list */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', letterSpacing: 0.5 }}>LOCALES</div>
          <Link
            href="/admin/new"
            style={{ fontSize: 13, fontWeight: 600, color: '#fff', background: '#6366f1', padding: '6px 14px', borderRadius: 8, textDecoration: 'none' }}
          >
            + Nuevo local
          </Link>
        </div>

        {storesWithOwner.length === 0 ? (
          <div style={{ color: '#94a3b8', fontSize: 14, padding: '20px 0', textAlign: 'center' }}>
            No hay locales aún. ¡Creá el primero!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {storesWithOwner.map(store => (
              <div key={store.id} style={{ padding: '14px 0', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: store.active ? '#22c55e' : '#94a3b8',
                      display: 'inline-block', flexShrink: 0,
                    }} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{store.name}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 3, marginLeft: 16 }}>
                    {store.ownerEmail}
                  </div>
                  <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 2, marginLeft: 16 }}>
                    ID: {store.id}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <ToggleStoreButton storeId={store.id} active={store.active} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}

const card: React.CSSProperties = {
  background: '#fff',
  borderRadius: 12,
  padding: 16,
  marginBottom: 12,
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
}
