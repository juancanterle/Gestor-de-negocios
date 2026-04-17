import { useState, useEffect, useRef } from 'react'
import { Plus, Search, Edit2, Trash2, X } from 'lucide-react'
import { T, labelStyle, overlayStyle, inputStyle } from '../theme'
import type { Product, Category, Supplier } from '../types/api'

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
  const barcodeRef = useRef<HTMLInputElement>(null)
  const nameRef    = useRef<HTMLInputElement>(null)

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

  const openCreate = () => {
    setEditing({ ...EMPTY })
    setIsEdit(false)
    setModal(true)
    setTimeout(() => barcodeRef.current?.focus(), 50)
  }
  const openEdit = (p: Product) => {
    setEditing({ ...p, user_id: 'admin' })
    setIsEdit(true)
    setModal(true)
    setTimeout(() => nameRef.current?.focus(), 50)
  }

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
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: T.bg }}>

      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={15} color={T.sub} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o código..."
            style={{ ...inp, paddingLeft: 36 }}
          />
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={sel}>
          <option value="">Todas las categorías</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterSup} onChange={e => setFilterSup(e.target.value)} style={sel}>
          <option value="">Todos los proveedores</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button onClick={openCreate} style={primaryBtn}>
          <Plus size={15} /> Nuevo producto
        </button>
      </div>

      {/* Tabla */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ position: 'sticky', top: 0, background: T.bg, zIndex: 1 }}>
            <tr style={{ color: T.sub, fontSize: 11, textAlign: 'left', borderBottom: `1px solid ${T.border}` }}>
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
            {products.map((p, idx) => {
              const lowStock = p.stock_min > 0 && p.stock <= p.stock_min
              return (
                <tr key={p.id} style={{ borderBottom: `1px solid ${T.border}`, background: idx % 2 === 1 ? `${T.surface}66` : 'transparent' }}>
                  <td style={{ padding: '11px 8px' }}>
                    <div style={{ color: T.text, fontSize: 14, fontWeight: 600 }}>{p.name}</div>
                    {p.barcode && <div style={{ color: T.sub, fontSize: 11, marginTop: 2 }}>{p.barcode}</div>}
                  </td>
                  <td style={{ padding: '11px 8px', fontSize: 12, color: T.sub }}>{p.category_name || '—'}</td>
                  <td style={{ padding: '11px 8px', fontSize: 12, color: T.sub }}>{p.supplier_name || '—'}</td>
                  <td style={{ padding: '11px 8px', textAlign: 'right', fontSize: 12, color: T.sub }}>{fmt(p.cost)}</td>
                  <td style={{ padding: '11px 8px', textAlign: 'right', fontSize: 12, color: T.sub }}>{p.markup}%</td>
                  <td style={{ padding: '11px 8px', textAlign: 'right', fontSize: 15, color: T.primary, fontWeight: 700 }}>{fmt(eff(p))}</td>
                  <td style={{ padding: '11px 8px', textAlign: 'right' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: lowStock ? T.warning : T.text }}>
                      {p.stock} {p.unit}
                    </span>
                    {lowStock && <span style={{ display: 'block', fontSize: 10, color: T.warning, marginTop: 1 }}>stock bajo</span>}
                  </td>
                  <td style={{ padding: '11px 8px', textAlign: 'right' }}>
                    <button onClick={() => openEdit(p)} style={iconBtn}><Edit2 size={14} /></button>
                    <button onClick={() => handleDelete(p.id)} style={{ ...iconBtn, color: T.danger }}><Trash2 size={14} /></button>
                  </td>
                </tr>
              )
            })}
            {products.length === 0 && (
              <tr><td colSpan={8} style={{ padding: 48, textAlign: 'center', color: T.sub, fontSize: 14 }}>
                No se encontraron productos
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal && (
        <div style={overlayStyle}>
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: T.rXl, padding: 28, width: 580, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>{isEdit ? 'Editar producto' : 'Nuevo producto'}</div>
              <button onClick={() => setModal(false)} style={closeBtn}><X size={20} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Nombre *</label>
                <input ref={nameRef} value={editing.name || ''} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))} style={inp} placeholder="Nombre del producto" />
              </div>
              <div>
                <label style={labelStyle}>Código de barras</label>
                <input
                  ref={barcodeRef}
                  value={editing.barcode || ''}
                  onChange={e => setEditing(p => ({ ...p, barcode: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); nameRef.current?.focus() } }}
                  style={inp}
                  placeholder="Escaneá o escribí el código..."
                />
              </div>
              <div>
                <label style={labelStyle}>Unidad</label>
                <select value={editing.unit || 'un'} onChange={e => setEditing(p => ({ ...p, unit: e.target.value }))} style={inp}>
                  {['un', 'kg', 'g', 'lt', 'ml', 'caja', 'pack', 'docena'].map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Categoría</label>
                <select value={editing.category_id || ''} onChange={e => setEditing(p => ({ ...p, category_id: e.target.value }))} style={inp}>
                  <option value="">Sin categoría</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Proveedor</label>
                <select value={editing.supplier_id || ''} onChange={e => setEditing(p => ({ ...p, supplier_id: e.target.value }))} style={inp}>
                  <option value="">Sin proveedor</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              {/* Precios */}
              <div style={{ gridColumn: '1 / -1', borderTop: `1px solid ${T.border}`, paddingTop: 16, marginTop: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: T.sub, marginBottom: 12, textTransform: 'uppercase' }}>Precios</div>
              </div>
              <div>
                <label style={labelStyle}>Costo de compra</label>
                <input type="number" value={editing.cost ?? 0}
                  onChange={e => {
                    const cost = parseFloat(e.target.value) || 0
                    setEditing(p => ({ ...p, cost, price_auto: priceAuto(cost, p.markup ?? 0) }))
                  }}
                  style={inp} placeholder="0" />
              </div>
              <div>
                <label style={labelStyle}>Markup (%)</label>
                <input type="number" value={editing.markup ?? 0}
                  onChange={e => {
                    const markup = parseFloat(e.target.value) || 0
                    setEditing(p => ({ ...p, markup, price_auto: priceAuto(p.cost ?? 0, markup) }))
                  }}
                  style={inp} placeholder="0" />
              </div>

              <div style={{ gridColumn: '1 / -1', background: `${T.primary}14`, border: `1px solid ${T.primary}30`, borderRadius: T.r, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: T.sub, fontSize: 13 }}>Precio calculado automático</span>
                <span style={{ color: T.primary, fontWeight: 800, fontSize: 22 }}>
                  {fmt(priceAuto(editing.cost ?? 0, editing.markup ?? 0))}
                </span>
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" id="useManual"
                  checked={!!editing.use_manual}
                  onChange={e => setEditing(p => ({ ...p, use_manual: e.target.checked ? 1 : 0 }))} />
                <label htmlFor="useManual" style={{ color: T.sub, fontSize: 13, cursor: 'pointer' }}>
                  Usar precio manual
                </label>
              </div>

              {!!editing.use_manual && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Precio manual</label>
                  <input type="number" value={editing.price_manual ?? ''}
                    onChange={e => setEditing(p => ({ ...p, price_manual: parseFloat(e.target.value) || undefined }))}
                    style={{ ...inp, borderColor: T.primary }} placeholder="Precio de venta" />
                </div>
              )}

              {/* Stock */}
              <div style={{ gridColumn: '1 / -1', borderTop: `1px solid ${T.border}`, paddingTop: 16, marginTop: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: T.sub, marginBottom: 12, textTransform: 'uppercase' }}>Stock</div>
              </div>
              <div>
                <label style={labelStyle}>Stock actual</label>
                <input type="number" value={editing.stock ?? 0}
                  onChange={e => setEditing(p => ({ ...p, stock: parseFloat(e.target.value) || 0 }))}
                  style={inp} placeholder="0" />
              </div>
              <div>
                <label style={labelStyle}>Stock mínimo (alerta)</label>
                <input type="number" value={editing.stock_min ?? 0}
                  onChange={e => setEditing(p => ({ ...p, stock_min: parseFloat(e.target.value) || 0 }))}
                  style={inp} placeholder="0" />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(false)} style={cancelBtn}>Cancelar</button>
              <button onClick={handleSave} style={primaryBtn}>
                {isEdit ? 'Guardar cambios' : 'Crear producto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const th: React.CSSProperties = { padding: '10px 8px', fontWeight: 600 }
const inp: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: T.r,
  border: `1.5px solid ${T.border}`, background: T.input,
  color: T.text, fontSize: 14, outline: 'none', boxSizing: 'border-box',
}
const sel: React.CSSProperties = {
  padding: '10px 12px', borderRadius: T.r,
  border: `1.5px solid ${T.border}`, background: T.input,
  color: T.sub, fontSize: 13, outline: 'none',
}
const iconBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', color: T.sub, padding: '4px 6px' }
const closeBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', color: T.sub }
const primaryBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '10px 18px', borderRadius: T.r, border: 'none',
  background: T.primary, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
}
const cancelBtn: React.CSSProperties = {
  padding: '10px 18px', borderRadius: T.r,
  border: `1.5px solid ${T.border}`, background: 'transparent',
  color: T.sub, fontSize: 13, cursor: 'pointer',
}
