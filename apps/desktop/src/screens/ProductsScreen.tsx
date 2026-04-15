import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, X } from 'lucide-react'
import type { Product, Category, Supplier } from '../types/api'

const $ = {
  bg: '#0f1117', surface: '#1a1d27', border: '#2a2d3a',
  text: '#e2e8f0', muted: '#64748b', primary: '#6366f1',
  success: '#22c55e', warning: '#f59e0b', danger: '#ef4444',
}

const EMPTY: Partial<Product> & { user_id: string } = {
  name: '', barcode: '', description: '', category_id: '', supplier_id: '',
  cost: 0, markup: 0, price_auto: 0, price_manual: undefined, use_manual: 0,
  round_mode: 'INHERIT', stock: 0, stock_min: 0, unit: 'un', user_id: 'admin',
}

export default function ProductsScreen() {
  const [products, setProducts]     = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers]   = useState<Supplier[]>([])
  const [search, setSearch]         = useState('')
  const [filterCat, setFilterCat]   = useState('')
  const [filterSup, setFilterSup]   = useState('')
  const [modal, setModal]           = useState(false)
  const [editing, setEditing]       = useState<Partial<Product> & { user_id: string }>(EMPTY)
  const [isEdit, setIsEdit]         = useState(false)

  const load = async () => {
    const [prods, cats, sups] = await Promise.all([
      window.api.products.list({ search: search || undefined, category_id: filterCat || undefined, supplier_id: filterSup || undefined }),
      window.api.categories.list(),
      window.api.suppliers.list(),
    ])
    setProducts(prods)
    setCategories(cats)
    setSuppliers(sups)
  }

  useEffect(() => { load() }, [search, filterCat, filterSup])

  const openCreate = () => { setEditing({ ...EMPTY }); setIsEdit(false); setModal(true) }
  const openEdit   = (p: Product) => { setEditing({ ...p, user_id: 'admin' }); setIsEdit(true); setModal(true) }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este producto?')) return
    await window.api.products.delete(id)
    load()
  }

  const handleSave = async () => {
    if (!editing.name?.trim()) return
    if (isEdit) await window.api.products.update(editing as Product & { user_id: string })
    else        await window.api.products.create(editing)
    setModal(false)
    load()
  }

  const priceAuto = (cost: number, markup: number) => Math.round(cost * (1 + markup / 100))
  const eff = (p: Product) => p.use_manual && p.price_manual != null ? p.price_manual : p.price_auto
  const fmt = (n: number) => n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 })

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${$.border}`, display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={15} color={$.muted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o código..."
            style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: 8, border: `1px solid ${$.border}`, background: $.surface, color: $.text, fontSize: 13, outline: 'none' }} />
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={selStyle}>
          <option value="">Todas las categorías</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterSup} onChange={e => setFilterSup(e.target.value)} style={selStyle}>
          <option value="">Todos los proveedores</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: $.primary, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={15} /> Nuevo producto
        </button>
      </div>

      {/* Tabla */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ position: 'sticky', top: 0, background: $.bg, zIndex: 1 }}>
            <tr style={{ color: $.muted, fontSize: 11, textAlign: 'left', borderBottom: `1px solid ${$.border}` }}>
              <th style={th}>PRODUCTO</th>
              <th style={th}>CATEGORÍA</th>
              <th style={th}>PROVEEDOR</th>
              <th style={{ ...th, textAlign: 'right' }}>COSTO</th>
              <th style={{ ...th, textAlign: 'right' }}>MARKUP</th>
              <th style={{ ...th, textAlign: 'right' }}>PRECIO</th>
              <th style={{ ...th, textAlign: 'right' }}>STOCK</th>
              <th style={{ ...th, width: 80 }} />
            </tr>
          </thead>
          <tbody>
            {products.map(p => {
              const lowStock = p.stock_min > 0 && p.stock <= p.stock_min
              return (
                <tr key={p.id} style={{ borderBottom: `1px solid ${$.border}` }}>
                  <td style={{ padding: '10px 8px' }}>
                    <div style={{ color: $.text, fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                    {p.barcode && <div style={{ color: $.muted, fontSize: 11 }}>{p.barcode}</div>}
                  </td>
                  <td style={{ padding: '10px 8px', fontSize: 12, color: $.muted }}>{p.category_name || '—'}</td>
                  <td style={{ padding: '10px 8px', fontSize: 12, color: $.muted }}>{p.supplier_name || '—'}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: 12, color: $.muted }}>{fmt(p.cost)}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: 12, color: $.muted }}>{p.markup}%</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: 13, color: $.primary, fontWeight: 700 }}>{fmt(eff(p))}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: lowStock ? $.warning : $.text }}>
                      {p.stock} {p.unit}
                    </span>
                    {lowStock && <span style={{ display: 'block', fontSize: 10, color: $.warning }}>stock bajo</span>}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                    <button onClick={() => openEdit(p)} style={iconBtn}><Edit2 size={13} /></button>
                    <button onClick={() => handleDelete(p.id)} style={{ ...iconBtn, color: $.danger }}><Trash2 size={13} /></button>
                  </td>
                </tr>
              )
            })}
            {products.length === 0 && (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: $.muted, fontSize: 13 }}>
                No se encontraron productos
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal && (
        <div style={overlay}>
          <div style={{ background: $.surface, border: `1px solid ${$.border}`, borderRadius: 16, padding: 28, width: 560, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: $.text }}>{isEdit ? 'Editar producto' : 'Nuevo producto'}</div>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: $.muted }}><X size={20} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={lbl}>Nombre *</label>
                <input value={editing.name || ''} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))} style={inp} placeholder="Nombre del producto" />
              </div>
              <div>
                <label style={lbl}>Código de barras</label>
                <input value={editing.barcode || ''} onChange={e => setEditing(p => ({ ...p, barcode: e.target.value }))} style={inp} placeholder="EAN-13, EAN-8..." />
              </div>
              <div>
                <label style={lbl}>Unidad</label>
                <select value={editing.unit || 'un'} onChange={e => setEditing(p => ({ ...p, unit: e.target.value }))} style={inp}>
                  {['un', 'kg', 'g', 'lt', 'ml', 'caja', 'pack', 'docena'].map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Categoría</label>
                <select value={editing.category_id || ''} onChange={e => setEditing(p => ({ ...p, category_id: e.target.value }))} style={inp}>
                  <option value="">Sin categoría</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Proveedor</label>
                <select value={editing.supplier_id || ''} onChange={e => setEditing(p => ({ ...p, supplier_id: e.target.value }))} style={inp}>
                  <option value="">Sin proveedor</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              {/* Bloque de precios */}
              <div style={{ gridColumn: '1 / -1', borderTop: `1px solid ${$.border}`, paddingTop: 14 }}>
                <div style={{ fontSize: 12, color: $.muted, marginBottom: 12, fontWeight: 600, letterSpacing: 1 }}>PRECIOS</div>
              </div>
              <div>
                <label style={lbl}>Costo de compra</label>
                <input type="number" value={editing.cost ?? 0}
                  onChange={e => {
                    const cost = parseFloat(e.target.value) || 0
                    setEditing(p => ({ ...p, cost, price_auto: priceAuto(cost, p.markup ?? 0) }))
                  }}
                  style={inp} placeholder="0" />
              </div>
              <div>
                <label style={lbl}>Markup (%)</label>
                <input type="number" value={editing.markup ?? 0}
                  onChange={e => {
                    const markup = parseFloat(e.target.value) || 0
                    setEditing(p => ({ ...p, markup, price_auto: priceAuto(p.cost ?? 0, markup) }))
                  }}
                  style={inp} placeholder="0" />
              </div>

              {/* Preview precio calculado */}
              <div style={{ gridColumn: '1 / -1', background: `${$.primary}15`, borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: $.muted, fontSize: 13 }}>Precio calculado automático</span>
                <span style={{ color: $.primary, fontWeight: 800, fontSize: 20 }}>
                  {fmt(priceAuto(editing.cost ?? 0, editing.markup ?? 0))}
                </span>
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" id="useManual"
                  checked={!!editing.use_manual}
                  onChange={e => setEditing(p => ({ ...p, use_manual: e.target.checked ? 1 : 0 }))} />
                <label htmlFor="useManual" style={{ color: $.muted, fontSize: 13, cursor: 'pointer' }}>
                  Usar precio manual
                </label>
              </div>

              {!!editing.use_manual && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={lbl}>Precio manual</label>
                  <input type="number" value={editing.price_manual ?? ''}
                    onChange={e => setEditing(p => ({ ...p, price_manual: parseFloat(e.target.value) || undefined }))}
                    style={{ ...inp, borderColor: $.primary }} placeholder="Precio de venta" />
                </div>
              )}

              {/* Stock */}
              <div style={{ gridColumn: '1 / -1', borderTop: `1px solid ${$.border}`, paddingTop: 14 }}>
                <div style={{ fontSize: 12, color: $.muted, marginBottom: 12, fontWeight: 600, letterSpacing: 1 }}>STOCK</div>
              </div>
              <div>
                <label style={lbl}>Stock actual</label>
                <input type="number" value={editing.stock ?? 0}
                  onChange={e => setEditing(p => ({ ...p, stock: parseFloat(e.target.value) || 0 }))}
                  style={inp} placeholder="0" />
              </div>
              <div>
                <label style={lbl}>Stock mínimo (alerta)</label>
                <input type="number" value={editing.stock_min ?? 0}
                  onChange={e => setEditing(p => ({ ...p, stock_min: parseFloat(e.target.value) || 0 }))}
                  style={inp} placeholder="0" />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(false)} style={{ padding: '9px 20px', borderRadius: 8, border: `1px solid ${$.border}`, background: 'transparent', color: $.muted, fontSize: 13, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleSave} style={{ padding: '9px 24px', borderRadius: 8, border: 'none', background: $.primary, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {isEdit ? 'Guardar cambios' : 'Crear producto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const th: React.CSSProperties = { padding: '10px 8px', fontWeight: 500 }
const selStyle: React.CSSProperties = { padding: '8px 10px', borderRadius: 8, border: `1px solid #2a2d3a`, background: '#1a1d27', color: '#94a3b8', fontSize: 12, outline: 'none' }
const iconBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px 6px' }
const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }
const lbl: React.CSSProperties = { display: 'block', fontSize: 11, color: '#64748b', marginBottom: 5, fontWeight: 500, letterSpacing: 0.5 }
const inp: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #2a2d3a', background: '#0f1117', color: '#e2e8f0', fontSize: 13, outline: 'none' }
