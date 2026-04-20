import { useState, useEffect, useRef } from 'react'
import { Plus, Search, Edit2, Trash2 } from 'lucide-react'
import { T, labelStyle } from '../theme'
import { inp, sel, primaryBtn, cancelBtn, iconBtn } from '../styles/inputs'
import Modal from '../components/Modal'
import Skeleton from '../components/Skeleton'
import { useToast } from '../hooks/useToast'
import { useConfirm } from '../components/confirm-context'
import { unwrap } from '../lib/api'
import type { Product, Category, Supplier } from '../types/api'

const EMPTY: Partial<Product> & { user_id: string } = {
  name: '', barcode: '', description: '', category_id: '', supplier_id: '',
  cost: 0, markup: 0, price_auto: 0, price_manual: undefined, use_manual: 0,
  round_mode: 'INHERIT', stock: 0, stock_min: 0, unit: 'un', user_id: 'admin',
}

type Errors = Partial<Record<keyof Product | 'root', string>>

export default function ProductsScreen() {
  const [products, setProducts]     = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers]   = useState<Supplier[]>([])
  const [search, setSearch]         = useState('')
  const [filterCat, setFilterCat]   = useState('')
  const [filterSup, setFilterSup]   = useState('')
  const [loading, setLoading]       = useState(true)
  const [modal, setModal]           = useState(false)
  const [editing, setEditing]       = useState<Partial<Product> & { user_id: string }>(EMPTY)
  const [isEdit, setIsEdit]         = useState(false)
  const [saving, setSaving]         = useState(false)
  const [errors, setErrors]         = useState<Errors>({})
  const barcodeRef = useRef<HTMLInputElement>(null)
  const nameRef    = useRef<HTMLInputElement>(null)
  const toast      = useToast()
  const confirm    = useConfirm()

  const load = async () => {
    setLoading(true)
    try {
      const [prods, cats, sups] = await Promise.all([
        window.api.products.list({ search: search || undefined, category_id: filterCat || undefined, supplier_id: filterSup || undefined }),
        window.api.categories.list(),
        window.api.suppliers.list(),
      ])
      setProducts(unwrap(prods))
      setCategories(unwrap(cats))
      setSuppliers(unwrap(sups))
    } catch {
      toast.error('No se pudieron cargar los productos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [search, filterCat, filterSup])

  const openCreate = () => {
    setEditing({ ...EMPTY })
    setIsEdit(false)
    setErrors({})
    setModal(true)
    setTimeout(() => barcodeRef.current?.focus(), 50)
  }

  const openEdit = (p: Product) => {
    setEditing({ ...p, user_id: 'admin' })
    setIsEdit(true)
    setErrors({})
    setModal(true)
    setTimeout(() => nameRef.current?.focus(), 50)
  }

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: '¿Eliminar producto?',
      message: 'Esta acción no se puede deshacer.',
      variant: 'danger',
      confirmLabel: 'Eliminar',
    })
    if (!ok) return
    try {
      await window.api.products.delete(id)
      toast.success('Producto eliminado')
      load()
    } catch {
      toast.error('No se pudo eliminar el producto')
    }
  }

  const validate = (): Errors => {
    const e: Errors = {}
    if (!editing.name?.trim())              e.name      = 'El nombre es obligatorio'
    if ((editing.cost ?? 0) <= 0)          e.cost      = 'El costo debe ser mayor a 0'
    if ((editing.markup ?? 0) < 0)         e.markup    = 'El markup no puede ser negativo'
    if ((editing.stock ?? 0) < 0)          e.stock     = 'El stock no puede ser negativo'
    if ((editing.stock_min ?? 0) > (editing.stock ?? 0)) e.stock_min = 'No puede superar el stock actual'
    return e
  }

  const handleSave = async () => {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setSaving(true)
    try {
      if (isEdit) await window.api.products.update(editing as Product & { user_id: string })
      else        await window.api.products.create(editing)
      setModal(false)
      setErrors({})
      toast.success(isEdit ? 'Producto actualizado' : 'Producto creado')
      load()
    } catch {
      toast.error('No se pudo guardar el producto')
    } finally {
      setSaving(false)
    }
  }

  const priceAuto = (cost: number, markup: number) => Math.round(cost * (1 + markup / 100))
  const eff = (p: Product) => p.use_manual && p.price_manual != null ? p.price_manual : p.price_auto
  const fmt = (n: number) => n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 })

  const field = (key: keyof Product) => errors[key] ? (
    <div style={{ color: T.danger, fontSize: 11, marginTop: 4 }}>{errors[key]}</div>
  ) : null

  const inpErr = (key: keyof Product): React.CSSProperties =>
    errors[key] ? { ...inp, borderColor: T.danger } : inp

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: T.bg }}>

      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={15} color={T.sub} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} aria-hidden="true" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o código..."
            aria-label="Buscar productos"
            style={{ ...inp, paddingLeft: 36 }}
          />
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={sel} aria-label="Filtrar por categoría">
          <option value="">Todas las categorías</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterSup} onChange={e => setFilterSup(e.target.value)} style={sel} aria-label="Filtrar por proveedor">
          <option value="">Todos los proveedores</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button onClick={openCreate} style={primaryBtn}>
          <Plus size={15} /> Nuevo producto
        </button>
      </div>

      {/* Tabla */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', padding: '0 20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
          <thead style={{ position: 'sticky', top: 0, background: T.bg, zIndex: 1 }}>
            <tr style={{ color: T.sub, fontSize: 11, textAlign: 'left', borderBottom: `1px solid ${T.border}` }}>
              <th scope="col" style={th}>PRODUCTO</th>
              <th scope="col" style={th}>CATEGORÍA</th>
              <th scope="col" style={th}>PROVEEDOR</th>
              <th scope="col" style={{ ...th, textAlign: 'right' }}>COSTO</th>
              <th scope="col" style={{ ...th, textAlign: 'right' }}>MARKUP</th>
              <th scope="col" style={{ ...th, textAlign: 'right' }}>PRECIO</th>
              <th scope="col" style={{ ...th, textAlign: 'right' }}>STOCK</th>
              <th scope="col" aria-label="Acciones" style={{ ...th, width: 80 }} />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 7 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 8 }).map((__, j) => (
                    <td key={j} style={{ padding: '11px 8px' }}>
                      <Skeleton height={14} width={j === 7 ? 60 : '85%'} />
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <>
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
                        <button
                          onClick={() => openEdit(p)}
                          style={iconBtn}
                          aria-label={`Editar ${p.name}`}
                          onMouseEnter={e => (e.currentTarget.style.color = T.primary)}
                          onMouseLeave={e => (e.currentTarget.style.color = T.sub)}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          style={{ ...iconBtn, color: T.faint }}
                          aria-label={`Eliminar ${p.name}`}
                          onMouseEnter={e => (e.currentTarget.style.color = T.danger)}
                          onMouseLeave={e => (e.currentTarget.style.color = T.faint)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {!loading && products.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ padding: 48, textAlign: 'center', color: T.sub, fontSize: 14 }}>
                      No se encontraron productos
                    </td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal
        open={modal}
        onClose={() => { setModal(false); setErrors({}) }}
        title={isEdit ? 'Editar producto' : 'Nuevo producto'}
        width={580}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="prod-name" style={labelStyle}>Nombre *</label>
            <input
              id="prod-name"
              ref={nameRef}
              value={editing.name || ''}
              onChange={e => { setEditing(p => ({ ...p, name: e.target.value })); setErrors(x => ({ ...x, name: undefined })) }}
              style={inpErr('name')}
              placeholder="Nombre del producto"
            />
            {field('name')}
          </div>

          <div>
            <label htmlFor="prod-barcode" style={labelStyle}>Código de barras</label>
            <input
              id="prod-barcode"
              ref={barcodeRef}
              value={editing.barcode || ''}
              onChange={e => setEditing(p => ({ ...p, barcode: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); nameRef.current?.focus() } }}
              style={inp}
              placeholder="Escaneá o escribí el código..."
            />
          </div>

          <div>
            <label htmlFor="prod-unit" style={labelStyle}>Unidad</label>
            <select id="prod-unit" value={editing.unit || 'un'} onChange={e => setEditing(p => ({ ...p, unit: e.target.value }))} style={inp}>
              {['un', 'kg', 'g', 'lt', 'ml', 'caja', 'pack', 'docena'].map(u => <option key={u}>{u}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="prod-category" style={labelStyle}>Categoría</label>
            <select id="prod-category" value={editing.category_id || ''} onChange={e => setEditing(p => ({ ...p, category_id: e.target.value }))} style={inp}>
              <option value="">Sin categoría</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="prod-supplier" style={labelStyle}>Proveedor</label>
            <select id="prod-supplier" value={editing.supplier_id || ''} onChange={e => setEditing(p => ({ ...p, supplier_id: e.target.value }))} style={inp}>
              <option value="">Sin proveedor</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div style={{ gridColumn: '1 / -1', borderTop: `1px solid ${T.border}`, paddingTop: 16, marginTop: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: T.sub, marginBottom: 12, textTransform: 'uppercase' }}>Precios</div>
          </div>

          <div>
            <label htmlFor="prod-cost" style={labelStyle}>Costo de compra</label>
            <input
              id="prod-cost"
              type="number"
              value={editing.cost ?? 0}
              onChange={e => {
                const cost = parseFloat(e.target.value) || 0
                setEditing(p => ({ ...p, cost, price_auto: priceAuto(cost, p.markup ?? 0) }))
                setErrors(x => ({ ...x, cost: undefined }))
              }}
              style={inpErr('cost')}
              placeholder="0"
            />
            {field('cost')}
          </div>

          <div>
            <label htmlFor="prod-markup" style={labelStyle}>Markup (%)</label>
            <input
              id="prod-markup"
              type="number"
              value={editing.markup ?? 0}
              onChange={e => {
                const markup = parseFloat(e.target.value) || 0
                setEditing(p => ({ ...p, markup, price_auto: priceAuto(p.cost ?? 0, markup) }))
                setErrors(x => ({ ...x, markup: undefined }))
              }}
              style={inpErr('markup')}
              placeholder="0"
            />
            {field('markup')}
          </div>

          <div style={{ gridColumn: '1 / -1', background: `${T.primary}14`, border: `1px solid ${T.primary}30`, borderRadius: T.r, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: T.sub, fontSize: 13 }}>Precio calculado automático</span>
            <span style={{ color: T.primary, fontWeight: 800, fontSize: 22 }}>
              {fmt(priceAuto(editing.cost ?? 0, editing.markup ?? 0))}
            </span>
          </div>

          <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="checkbox"
              id="prod-useManual"
              checked={!!editing.use_manual}
              onChange={e => setEditing(p => ({ ...p, use_manual: e.target.checked ? 1 : 0 }))}
            />
            <label htmlFor="prod-useManual" style={{ color: T.sub, fontSize: 13, cursor: 'pointer' }}>
              Usar precio manual
            </label>
          </div>

          {!!editing.use_manual && (
            <div style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="prod-price-manual" style={labelStyle}>Precio manual</label>
              <input
                id="prod-price-manual"
                type="number"
                value={editing.price_manual ?? ''}
                onChange={e => setEditing(p => ({ ...p, price_manual: parseFloat(e.target.value) || undefined }))}
                style={{ ...inp, borderColor: T.primary }}
                placeholder="Precio de venta"
              />
            </div>
          )}

          <div style={{ gridColumn: '1 / -1', borderTop: `1px solid ${T.border}`, paddingTop: 16, marginTop: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: T.sub, marginBottom: 12, textTransform: 'uppercase' }}>Stock</div>
          </div>

          <div>
            <label htmlFor="prod-stock" style={labelStyle}>Stock actual</label>
            <input
              id="prod-stock"
              type="number"
              value={editing.stock ?? 0}
              onChange={e => {
                setEditing(p => ({ ...p, stock: parseFloat(e.target.value) || 0 }))
                setErrors(x => ({ ...x, stock: undefined, stock_min: undefined }))
              }}
              style={inpErr('stock')}
              placeholder="0"
            />
            {field('stock')}
          </div>

          <div>
            <label htmlFor="prod-stock-min" style={labelStyle}>Stock mínimo (alerta)</label>
            <input
              id="prod-stock-min"
              type="number"
              value={editing.stock_min ?? 0}
              onChange={e => {
                setEditing(p => ({ ...p, stock_min: parseFloat(e.target.value) || 0 }))
                setErrors(x => ({ ...x, stock_min: undefined }))
              }}
              style={inpErr('stock_min')}
              placeholder="0"
            />
            {field('stock_min')}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
          <button onClick={() => { setModal(false); setErrors({}) }} style={cancelBtn}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear producto'}
          </button>
        </div>
      </Modal>
    </div>
  )
}

const th: React.CSSProperties = { padding: '10px 8px', fontWeight: 600 }
