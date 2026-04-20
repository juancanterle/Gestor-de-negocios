import { requireStoreContext, fmt, fmtDate } from '@/lib/store-context'

export const dynamic = 'force-dynamic'

export default async function PurchasesPage() {
  const { supabase, storeId } = await requireStoreContext()

  const { data, error } = await supabase
    .from('purchases')
    .select('id, total_cost, notes, status, created_at, supplier_id')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error && error.code !== 'PGRST116') throw new Error(error.message)
  const purchases = data ?? []

  const total = purchases.reduce((s, p) => s + (p.total_cost || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <section style={{
        padding: 16, borderRadius: 14, background: 'var(--surface)',
        border: '1px solid var(--border)',
      }}>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--text-muted)', fontWeight: 700 }}>
          Últimas 100 compras
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-strong)', marginTop: 4, letterSpacing: '-0.01em' }}>
          {fmt(total)}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
          {purchases.length} {purchases.length === 1 ? 'compra' : 'compras'}
        </div>
      </section>

      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 14, overflow: 'hidden',
      }}>
        {purchases.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
            No hay compras registradas todavía.
          </div>
        ) : purchases.map((p, i) => (
          <div key={p.id} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 16px',
            borderBottom: i === purchases.length - 1 ? 'none' : '1px solid var(--border-soft)',
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-strong)' }}>
                {p.notes || 'Compra'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                {fmtDate(p.created_at)} · {p.status}
              </div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-strong)', fontVariantNumeric: 'tabular-nums' }}>
              {fmt(p.total_cost || 0)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
