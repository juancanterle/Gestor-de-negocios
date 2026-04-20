import { requireStoreContext, fmt } from '@/lib/store-context'

export const dynamic = 'force-dynamic'

export default async function ProductsPage({
  searchParams,
}: { searchParams: Promise<{ q?: string; filter?: string }> }) {
  const { supabase, storeId } = await requireStoreContext()
  const sp = await searchParams
  const q = (sp?.q || '').trim()
  const filter = sp?.filter || 'all'

  let query = supabase
    .from('products')
    .select('id, name, barcode, stock, stock_min, unit, cost, price_auto, price_manual, use_manual, category_name, supplier_name')
    .eq('store_id', storeId)
    .order('name')

  if (q) query = query.or(`name.ilike.%${q}%,barcode.ilike.%${q}%`)
  if (filter === 'low')  query = query.filter('stock_min', 'gt', 0).filter('stock', 'lte', 'stock_min')
  if (filter === 'out')  query = query.lte('stock', 0)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  const products = data ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <form style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por nombre o código…"
          style={{
            flex: 1, padding: '10px 12px', borderRadius: 10,
            border: '1px solid var(--border)', background: 'var(--surface)',
            color: 'var(--text)', fontSize: 13, outline: 'none',
          }}
        />
        <select
          name="filter"
          defaultValue={filter}
          style={{
            padding: '10px 12px', borderRadius: 10,
            border: '1px solid var(--border)', background: 'var(--surface)',
            fontSize: 13, color: 'var(--text)', cursor: 'pointer',
          }}
        >
          <option value="all">Todos</option>
          <option value="low">Stock bajo</option>
          <option value="out">Sin stock</option>
        </select>
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
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 120px 120px 120px',
          gap: 10, padding: '10px 14px',
          fontSize: 10, textTransform: 'uppercase', letterSpacing: 1,
          color: 'var(--text-muted)', fontWeight: 700,
          background: 'var(--surface-2)', borderBottom: '1px solid var(--border)',
        }}>
          <div>Producto</div>
          <div style={{ textAlign: 'right' }}>Stock</div>
          <div style={{ textAlign: 'right' }}>Precio</div>
          <div style={{ textAlign: 'right' }}>Costo</div>
        </div>

        {products.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
            No hay productos que coincidan con el filtro.
          </div>
        ) : products.map((p, i) => {
          const priceShown = p.use_manual && p.price_manual ? p.price_manual : p.price_auto
          const lowStock = p.stock_min > 0 && p.stock <= p.stock_min
          const outOfStock = p.stock <= 0
          return (
            <div key={p.id} style={{
              display: 'grid',
              gridTemplateColumns: '1fr 120px 120px 120px',
              gap: 10, padding: '12px 14px',
              borderBottom: i === products.length - 1 ? 'none' : '1px solid var(--border-soft)',
              alignItems: 'center',
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                  {p.barcode || '—'} {p.category_name && `· ${p.category_name}`}
                </div>
              </div>
              <div style={{
                textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                fontSize: 13, fontWeight: 600,
                color: outOfStock ? 'var(--danger-500)' : lowStock ? 'var(--warning-600)' : 'var(--text-strong)',
              }}>
                {p.stock} {p.unit}
                {lowStock && (
                  <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginTop: 2 }}>
                    {outOfStock ? 'Sin stock' : 'Bajo'}
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: 13, fontWeight: 600, color: 'var(--text-strong)' }}>
                {fmt(priceShown || 0)}
              </div>
              <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: 13, color: 'var(--text-muted)' }}>
                {fmt(p.cost || 0)}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'right' }}>
        {products.length} {products.length === 1 ? 'producto' : 'productos'}
      </div>
    </div>
  )
}
