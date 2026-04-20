import { supabaseAdmin } from '@/lib/supabase-admin'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminAuditPage({
  searchParams,
}: { searchParams: Promise<{ store?: string; q?: string }> }) {
  const sp = await searchParams
  const filterStore = sp?.store || ''
  const filterQ = (sp?.q || '').trim()

  const [storesRes, auditRes] = await Promise.all([
    supabaseAdmin.from('stores').select('id, name').order('name'),
    (async () => {
      let q = supabaseAdmin
        .from('audit_log_remote')
        .select('id, store_id, user_name, action, entity_type, entity_id, metadata, created_at')
        .order('created_at', { ascending: false })
        .limit(500)
      if (filterStore) q = q.eq('store_id', filterStore)
      if (filterQ)     q = q.ilike('action', `%${filterQ}%`)
      return q
    })(),
  ])

  const stores = storesRes.data ?? []
  const events = auditRes.data ?? []
  const storeNameById = new Map(stores.map(s => [s.id, s.name]))

  return (
    <div className="page" style={{ background: 'var(--bg)' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <Link href="/admin" style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none' }}>
            ← Volver al panel
          </Link>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-strong)', marginTop: 2, letterSpacing: '-0.2px' }}>
            Auditoría
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            Últimos 500 eventos. Se propagan desde las cajas registradoras.
          </div>
        </div>
      </header>

      <form style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <select name="store" defaultValue={filterStore} style={{
          padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)',
          background: 'var(--surface)', fontSize: 13, color: 'var(--text)',
        }}>
          <option value="">Todos los locales</option>
          {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input
          name="q"
          defaultValue={filterQ}
          placeholder="Filtrar por acción (ej: auth.login, products.delete)"
          style={{
            flex: 1, padding: '10px 12px', borderRadius: 10,
            border: '1px solid var(--border)', background: 'var(--surface)',
            color: 'var(--text)', fontSize: 13, outline: 'none',
          }}
        />
        <button type="submit" style={{
          padding: '10px 16px', borderRadius: 10, border: 'none',
          background: 'var(--brand-500)', color: '#fff',
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>Filtrar</button>
      </form>

      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 14, overflow: 'hidden',
      }}>
        {events.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
            No hay eventos todavía.
          </div>
        ) : events.map((e, i) => (
          <div key={e.id} style={{
            display: 'grid', gridTemplateColumns: '160px 1fr 140px 170px',
            gap: 10, padding: '10px 14px',
            borderBottom: i === events.length - 1 ? 'none' : '1px solid var(--border-soft)',
            alignItems: 'center', fontSize: 12,
          }}>
            <div style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
              {new Date(e.created_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'medium' })}
            </div>
            <div style={{ fontWeight: 600, color: 'var(--text-strong)', fontFamily: 'var(--font-mono)' }}>
              {e.action}
              {e.entity_id && (
                <span style={{ color: 'var(--text-dim)', fontWeight: 400, marginLeft: 6 }}>· {e.entity_type}:{String(e.entity_id).slice(0, 8)}</span>
              )}
            </div>
            <div style={{ color: 'var(--text-muted)' }}>{e.user_name || '—'}</div>
            <div style={{ color: 'var(--text-muted)', textAlign: 'right' }}>
              {storeNameById.get(e.store_id) || e.store_id}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
