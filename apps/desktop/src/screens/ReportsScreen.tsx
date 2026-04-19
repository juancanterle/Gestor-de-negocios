import { useState, useEffect } from 'react'
import { TrendingUp, AlertTriangle, Truck, BarChart2 } from 'lucide-react'
import { T } from '../theme'
import { unwrap } from '../lib/api'
import type { SalesSummary, SalesByDay } from '../types/api'

type Period = 'today' | 'week' | 'month'

function periodDates(p: Period): { from: string; to: string } {
  const now   = new Date()
  const today = now.toISOString().slice(0, 10)
  if (p === 'today') return { from: `${today}T00:00:00.000Z`, to: `${today}T23:59:59.999Z` }
  if (p === 'week') {
    const d = new Date(now); d.setDate(d.getDate() - 6)
    return { from: `${d.toISOString().slice(0, 10)}T00:00:00.000Z`, to: `${today}T23:59:59.999Z` }
  }
  const d = new Date(now); d.setDate(d.getDate() - 29)
  return { from: `${d.toISOString().slice(0, 10)}T00:00:00.000Z`, to: `${today}T23:59:59.999Z` }
}

export default function ReportsScreen() {
  const [period, setPeriod]   = useState<Period>('today')
  const [summary, setSummary] = useState<SalesSummary | null>(null)
  const [byDay, setByDay]     = useState<SalesByDay[]>([])
  const [tab, setTab]         = useState<'overview' | 'products' | 'suppliers' | 'stock'>('overview')

  useEffect(() => {
    const { from, to } = periodDates(period)
    Promise.all([
      window.api.reports.salesSummary({ date_from: from, date_to: to }),
      window.api.reports.salesByDay({ date_from: from, date_to: to }),
    ]).then(([s, d]) => {
      try { setSummary(unwrap(s)); setByDay(unwrap(d)) }
      catch { setSummary(null); setByDay([]) }
    })
  }, [period])

  const fmt = (n: number) => n?.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }) || '$0'
  const maxAmount = Math.max(...byDay.map(d => d.total_amount), 1)

  const kpis = summary ? [
    { label: 'Ventas totales',  value: fmt(summary.totals.total_amount || 0),  sub: `${summary.totals.total_sales || 0} tickets`, color: T.primary },
    { label: 'Efectivo',        value: fmt(summary.totals.cash_amount || 0),   sub: 'en caja',  color: T.cash },
    { label: 'Transferencias',  value: fmt(summary.totals.transfer_amount || 0), sub: 'digital', color: T.transfer },
    { label: 'Ticket promedio', value: fmt((summary.totals.total_amount || 0) / Math.max(summary.totals.total_sales || 1, 1)), sub: 'por venta', color: T.warning },
  ] : []

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: T.bg }}>

      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>Reportes</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['today', 'week', 'month'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding: '8px 16px', borderRadius: T.r,
              border: `1.5px solid ${period === p ? T.primary : T.border}`,
              background: period === p ? `${T.primary}18` : 'transparent',
              color: period === p ? T.primary : T.sub,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              {p === 'today' ? 'Hoy' : p === 'week' ? '7 días' : '30 días'}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, padding: '16px 20px', borderBottom: `1px solid ${T.border}` }}>
          {kpis.map(({ label, value, sub, color }) => (
            <div key={label} style={{ background: T.card, borderRadius: T.rLg, padding: '16px 18px', border: `1px solid ${T.border}` }}>
              <div style={{ color: T.sub, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
              <div style={{ color, fontSize: 24, fontWeight: 800 }}>{value}</div>
              <div style={{ color: T.sub, fontSize: 12, marginTop: 3 }}>{sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}`, padding: '0 20px' }}>
        {[
          { id: 'overview',  label: 'Evolución',   icon: <BarChart2 size={14} /> },
          { id: 'products',  label: 'Productos',   icon: <TrendingUp size={14} /> },
          { id: 'suppliers', label: 'Proveedores', icon: <Truck size={14} /> },
          { id: 'stock',     label: 'Stock bajo',  icon: <AlertTriangle size={14} /> },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as typeof tab)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '11px 16px', border: 'none', background: 'transparent',
            borderBottom: `2px solid ${tab === t.id ? T.primary : 'transparent'}`,
            color: tab === t.id ? T.primary : T.sub,
            fontSize: 13, fontWeight: tab === t.id ? 700 : 400, cursor: 'pointer',
            marginBottom: -1,
          }}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>

        {tab === 'overview' && (
          <div>
            <div style={{ fontSize: 13, color: T.sub, marginBottom: 16, fontWeight: 500 }}>Ventas por día</div>
            {byDay.length === 0 ? (
              <div style={{ color: T.sub, fontSize: 14, textAlign: 'center', marginTop: 48 }}>Sin datos para el período</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {byDay.map(d => (
                  <div key={d.date} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 80, color: T.sub, fontSize: 12, flexShrink: 0 }}>
                      {new Date(d.date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                    </div>
                    <div style={{ flex: 1, background: T.surface, borderRadius: 8, overflow: 'hidden', height: 32 }}>
                      <div style={{
                        width: `${(d.total_amount / maxAmount) * 100}%`,
                        minWidth: 4, height: '100%',
                        background: `linear-gradient(90deg, ${T.primary}, #6366f1)`,
                        borderRadius: 8,
                        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 10,
                        transition: 'width 0.4s',
                      }}>
                        {(d.total_amount / maxAmount) > 0.2 && (
                          <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>{fmt(d.total_amount)}</span>
                        )}
                      </div>
                    </div>
                    <div style={{ width: 90, textAlign: 'right', color: T.text, fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                      {(d.total_amount / maxAmount) <= 0.2 ? fmt(d.total_amount) : ''}
                    </div>
                    <div style={{ width: 60, textAlign: 'right', color: T.sub, fontSize: 11, flexShrink: 0 }}>
                      {d.total_sales} ticket{d.total_sales !== 1 ? 's' : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'products' && (
          <div>
            <div style={{ fontSize: 13, color: T.sub, marginBottom: 16, fontWeight: 500 }}>Top 10 productos más vendidos</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: T.sub, fontSize: 11, borderBottom: `1px solid ${T.border}`, textAlign: 'left' }}>
                  <th scope="col" style={th}>#</th>
                  <th scope="col" style={th}>PRODUCTO</th>
                  <th scope="col" style={{ ...th, textAlign: 'right' }}>UNIDADES</th>
                  <th scope="col" style={{ ...th, textAlign: 'right' }}>TOTAL</th>
                  <th scope="col" style={{ ...th, textAlign: 'right' }}>MARGEN</th>
                </tr>
              </thead>
              <tbody>
                {summary?.topProducts.map((p, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.border}`, background: i % 2 === 1 ? `${T.surface}66` : 'transparent' }}>
                    <td style={{ padding: '10px 8px', color: T.sub, fontSize: 13 }}>{i + 1}</td>
                    <td style={{ padding: '10px 8px', color: T.text, fontSize: 14, fontWeight: 500 }}>{p.product_name}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', color: T.sub, fontSize: 13 }}>{p.total_qty}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', color: T.primary, fontWeight: 700, fontSize: 14 }}>{fmt(p.total_amount)}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', color: T.success, fontSize: 13, fontWeight: 600 }}>{fmt(p.total_margin)}</td>
                  </tr>
                ))}
                {(!summary?.topProducts?.length) && (
                  <tr><td colSpan={5} style={{ padding: 48, textAlign: 'center', color: T.sub }}>Sin ventas en el período</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'suppliers' && (
          <div>
            <div style={{ fontSize: 13, color: T.sub, marginBottom: 16, fontWeight: 500 }}>Ventas por proveedor</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: T.sub, fontSize: 11, borderBottom: `1px solid ${T.border}`, textAlign: 'left' }}>
                  <th scope="col" style={th}>PROVEEDOR</th>
                  <th scope="col" style={{ ...th, textAlign: 'right' }}>UNIDADES</th>
                  <th scope="col" style={{ ...th, textAlign: 'right' }}>TOTAL VENDIDO</th>
                  <th scope="col" style={{ ...th, textAlign: 'right' }}>% DEL TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {summary?.bySupplier.map((s, i) => {
                  const pct = summary.totals.total_amount > 0 ? (s.total_amount / summary.totals.total_amount * 100) : 0
                  return (
                    <tr key={i} style={{ borderBottom: `1px solid ${T.border}`, background: i % 2 === 1 ? `${T.surface}66` : 'transparent' }}>
                      <td style={{ padding: '10px 8px', color: T.text, fontSize: 14, fontWeight: 600 }}>{s.supplier_name}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', color: T.sub, fontSize: 13 }}>{s.total_qty}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', color: T.primary, fontWeight: 700, fontSize: 14 }}>{fmt(s.total_amount)}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
                          <div style={{ width: 72, height: 6, background: T.border, borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: T.primary, borderRadius: 3 }} />
                          </div>
                          <span style={{ color: T.sub, fontSize: 12, minWidth: 40, textAlign: 'right' }}>{pct.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {(!summary?.bySupplier?.length) && (
                  <tr><td colSpan={4} style={{ padding: 48, textAlign: 'center', color: T.sub }}>Sin ventas en el período</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'stock' && (
          <div>
            <div style={{ fontSize: 13, color: T.sub, marginBottom: 16, fontWeight: 500 }}>Productos con stock en o por debajo del mínimo</div>
            {(!summary?.lowStock?.length) ? (
              <div style={{ textAlign: 'center', padding: 48, color: T.success, fontSize: 16, fontWeight: 600 }}>
                ✓ Todo el stock está en orden
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: T.sub, fontSize: 11, borderBottom: `1px solid ${T.border}`, textAlign: 'left' }}>
                    <th scope="col" style={th}>PRODUCTO</th>
                    <th scope="col" style={{ ...th, textAlign: 'right' }}>STOCK ACTUAL</th>
                    <th scope="col" style={{ ...th, textAlign: 'right' }}>STOCK MÍNIMO</th>
                    <th scope="col" style={{ ...th, textAlign: 'right' }}>DIFERENCIA</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.lowStock.map((p, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${T.border}`, background: i % 2 === 1 ? `${T.surface}66` : 'transparent' }}>
                      <td style={{ padding: '10px 8px', color: T.text, fontSize: 14, fontWeight: 500 }}>{p.name}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', color: T.warning, fontWeight: 700, fontSize: 14 }}>
                        {p.stock} {p.unit}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', color: T.sub, fontSize: 13 }}>
                        {p.stock_min} {p.unit}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', color: T.danger, fontWeight: 700, fontSize: 14 }}>
                        {p.stock - p.stock_min} {p.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const th: React.CSSProperties = { padding: '10px 8px', fontWeight: 700 }
