import { requireStoreContext, fmt, fmtDate } from '@/lib/store-context'

export const dynamic = 'force-dynamic'

export default async function CashPage() {
  const { supabase, storeId } = await requireStoreContext()

  const [openRes, historyRes] = await Promise.all([
    supabase
      .from('cash_registers')
      .select('*')
      .eq('store_id', storeId)
      .eq('status', 'OPEN')
      .order('opened_at', { ascending: false })
      .limit(1),
    supabase
      .from('cash_registers')
      .select('id, status, opening_amount, closing_amount, theoretical_amount, difference, notes, opened_at, closed_at')
      .eq('store_id', storeId)
      .eq('status', 'CLOSED')
      .order('opened_at', { ascending: false })
      .limit(30),
  ])

  if (openRes.error)    throw new Error(openRes.error.message)
  if (historyRes.error) throw new Error(historyRes.error.message)

  const open = openRes.data?.[0] ?? null
  const history = historyRes.data ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <section style={{
        padding: 18, borderRadius: 14, background: 'var(--surface)',
        border: '1px solid var(--border)',
      }}>
        {open ? (
          <>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--success-600)', fontWeight: 700 }}>
              ● Caja abierta
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-strong)', marginTop: 4 }}>
              {fmt(open.theoretical_amount ?? open.opening_amount ?? 0)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
              Desde {fmtDate(open.opened_at)} · apertura {fmt(open.opening_amount || 0)}
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--text-muted)', fontWeight: 700 }}>
              Caja cerrada
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 6 }}>
              No hay caja abierta en este momento.
            </div>
          </>
        )}
      </section>

      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-strong)', marginBottom: 10 }}>
          Últimos cierres
        </div>
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 14, overflow: 'hidden',
        }}>
          {history.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
              Todavía no hay cierres de caja.
            </div>
          ) : history.map((c, i) => (
            <div key={c.id} style={{
              display: 'grid',
              gridTemplateColumns: '1.4fr 1fr 1fr 1fr',
              gap: 10, padding: '12px 16px',
              borderBottom: i === history.length - 1 ? 'none' : '1px solid var(--border-soft)',
              alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-strong)', fontFamily: 'var(--font-mono)' }}>
                  {fmtDate(c.opened_at)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                  → {c.closed_at ? fmtDate(c.closed_at) : '—'}
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                {fmt(c.opening_amount || 0)}
                <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 0.8 }}>Apertura</div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 600, color: 'var(--text-strong)', fontVariantNumeric: 'tabular-nums' }}>
                {fmt(c.closing_amount || 0)}
                <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 500 }}>Cierre</div>
              </div>
              <div style={{
                textAlign: 'right', fontSize: 12, fontWeight: 700,
                color: (c.difference || 0) < 0 ? 'var(--danger-500)'
                     : (c.difference || 0) > 0 ? 'var(--warning-600)'
                     : 'var(--success-600)',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {(c.difference || 0) >= 0 ? '+' : ''}{fmt(c.difference || 0)}
                <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 500 }}>Diferencia</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
