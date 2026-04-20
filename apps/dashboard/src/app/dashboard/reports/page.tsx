import { requireStoreContext, fmt } from '@/lib/store-context'

export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
  const { supabase, storeId } = await requireStoreContext()

  const thirtyDays = new Date(Date.now() - 30 * 86400000).toISOString()

  const [salesRes, itemsRes] = await Promise.all([
    supabase
      .from('sales')
      .select('total, payment_method, created_at')
      .eq('store_id', storeId)
      .eq('status', 'COMPLETED')
      .gte('created_at', thirtyDays),
    supabase
      .from('sale_items')
      .select('product_name, quantity, subtotal, unit_cost, sale_id, sales!inner(store_id, status, created_at)')
      .eq('sales.store_id', storeId)
      .eq('sales.status', 'COMPLETED')
      .gte('sales.created_at', thirtyDays)
      .limit(5000),
  ])

  if (salesRes.error) throw new Error(salesRes.error.message)

  const sales = salesRes.data ?? []
  const items = itemsRes.data ?? []

  const total = sales.reduce((s, v) => s + (v.total || 0), 0)
  const cash = sales.filter(v => v.payment_method === 'CASH').reduce((s, v) => s + (v.total || 0), 0)
  const transfer = sales.filter(v => v.payment_method === 'TRANSFER').reduce((s, v) => s + (v.total || 0), 0)

  const byProduct = new Map<string, { qty: number; amount: number; margin: number }>()
  for (const it of items as Array<{ product_name: string; quantity: number; subtotal: number; unit_cost: number }>) {
    const k = it.product_name
    const cur = byProduct.get(k) || { qty: 0, amount: 0, margin: 0 }
    cur.qty += it.quantity || 0
    cur.amount += it.subtotal || 0
    cur.margin += (it.subtotal || 0) - (it.quantity || 0) * (it.unit_cost || 0)
    byProduct.set(k, cur)
  }

  const top = Array.from(byProduct.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        <StatCard label="30 días" value={fmt(total)} accent="var(--brand-500)" />
        <StatCard label="Efectivo" value={fmt(cash)} accent="var(--success-600)" />
        <StatCard label="Transferencias" value={fmt(transfer)} accent="var(--accent-sky)" />
      </section>

      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-strong)', marginBottom: 10 }}>
          Top 10 productos (30 días)
        </div>
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 14, overflow: 'hidden',
        }}>
          {top.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
              Todavía no hay suficiente data para reportar.
            </div>
          ) : top.map((p, i) => (
            <div key={p.name} style={{
              display: 'grid', gridTemplateColumns: '1fr 90px 120px 120px',
              gap: 10, padding: '12px 14px',
              borderBottom: i === top.length - 1 ? 'none' : '1px solid var(--border-soft)',
              alignItems: 'center',
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.name}
              </div>
              <div style={{ textAlign: 'right', fontSize: 12, fontVariantNumeric: 'tabular-nums', color: 'var(--text-muted)' }}>{Math.round(p.qty)}</div>
              <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'var(--text-strong)' }}>{fmt(p.amount)}</div>
              <div style={{ textAlign: 'right', fontSize: 12, fontVariantNumeric: 'tabular-nums', color: p.margin >= 0 ? 'var(--success-600)' : 'var(--danger-500)', fontWeight: 600 }}>
                {fmt(p.margin)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{
        padding: 14, borderRadius: 12, background: 'var(--brand-tint-soft)',
        border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)',
      }}>
        Más reportes (deuda a proveedores, márgenes detallados, comparativa semanal) están en camino.
      </div>
    </div>
  )
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{
      padding: 14, borderRadius: 14, background: 'var(--surface)', border: '1px solid var(--border)',
    }}>
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--text-muted)', fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-strong)', marginTop: 6, letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
      <div style={{ fontSize: 10, color: accent, fontWeight: 700, fontFamily: 'var(--font-mono)', marginTop: 3 }}>●</div>
    </div>
  )
}
