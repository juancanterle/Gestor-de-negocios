import { useState, useEffect } from 'react'
import { Plus, Trash2, Search } from 'lucide-react'
import { T, labelStyle } from '../theme'
import { inp, primaryBtn, cancelBtn } from '../styles/inputs'
import Modal from '../components/Modal'
import Skeleton from '../components/Skeleton'
import { useToast } from '../hooks/useToast'
import { unwrap } from '../lib/api'
import type { User, Product, Supplier, Purchase } from '../types/api'

interface PurchaseItem { product: Product; quantity: number; unit_cost: number }

export default function PurchasesScreen({ user }: { user: User }) {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(false)
  const [suppId, setSuppId]       = useState('')
  const [notes, setNotes]         = useState('')
  const [items, setItems]         = useState<PurchaseItem[]>([])
  const [search, setSearch]       = useState('')
  const [results, setResults]     = useState<Product[]>([])
  const [saving, setSaving]       = useState(false)
  const toast = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const [p, s] = await Promise.all([window.api.purchases.list(), window.api.suppliers.list()])
      setPurchases(unwrap(p))
      setSuppliers(unwrap(s))
    } catch {
      toast.error('No se pudieron cargar las compras')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const q = search.trim()
    const t = setTimeout(async () => {
      if (!q) { setResults([]); return }
      try {
        const r = unwrap(await window.api.products.list({ search: q }))
        setResults(r.slice(0, 8))
      } catch { setResults([]) }
    }, 150)
    return () => clearTimeout(t)
  }, [search])

  const addItem = (p: Product) => {
    setItems(prev => {
      const idx = prev.findIndex(i => i.product.id === p.id)
      if (idx >= 0) return prev
      return [...prev, { product: p, quantity: 1, unit_cost: p.cost }]
    })
    setSearch('')
    setResults([])
  }

  const updateItem = (idx: number, field: 'quantity' | 'unit_cost', val: number) => {
    setItems(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: val }
      return next
    })
  }

  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx))

  const totalCost = items.reduce((s, i) => s + i.quantity * i.unit_cost, 0)

  const handleSave = async () => {
    if (items.length === 0) { toast.warning('Agregá al menos un producto'); return }
    setSaving(true)
    try {
      await window.api.purchases.create({
        supplier_id: suppId || undefined,
        user_id: user.id,
        notes: notes || undefined,
        items: items.map(i => ({ product_id: i.product.id, quantity: i.quantity, unit_cost: i.unit_cost })),
      })
      setModal(false)
      setSuppId(''); setNotes(''); setItems([])
      toast.success('Compra registrada')
      load()
    } catch {
      toast.error('No se pudo registrar la compra')
    } finally {
      setSaving(false)
    }
  }

  const fmt = (n: number) => n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 })

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: T.bg }}>

      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>Compras / Ingreso de mercadería</div>
        <button onClick={() => setModal(true)} style={primaryBtn}>
          <Plus size={15} /> Nueva compra
        </button>
      </div>

      {/* Lista */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', padding: '0 20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
          <thead style={{ position: 'sticky', top: 0, background: T.bg, zIndex: 1 }}>
            <tr style={{ color: T.sub, fontSize: 11, borderBottom: `1px solid ${T.border}`, textAlign: 'left' }}>
              <th scope="col" style={th}>FECHA</th>
              <th scope="col" style={th}>PROVEEDOR</th>
              <th scope="col" style={th}>NOTAS</th>
              <th scope="col" style={{ ...th, textAlign: 'right' }}>TOTAL</th>
              <th scope="col" style={th}>ESTADO</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <td key={j} style={{ padding: '11px 8px' }}>
                      <Skeleton height={14} width="80%" />
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <>
                {purchases.map((p, idx) => (
                  <tr key={p.id} style={{ borderBottom: `1px solid ${T.border}`, background: idx % 2 === 1 ? `${T.surface}66` : 'transparent' }}>
                    <td style={{ padding: '11px 8px', color: T.sub, fontSize: 12 }}>
                      {new Date(p.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '11px 8px', color: T.text, fontSize: 14, fontWeight: 500 }}>{p.supplier_name || '—'}</td>
                    <td style={{ padding: '11px 8px', color: T.sub, fontSize: 12 }}>{p.notes || '—'}</td>
                    <td style={{ padding: '11px 8px', textAlign: 'right', color: T.primary, fontWeight: 700, fontSize: 15 }}>{fmt(p.total_cost)}</td>
                    <td style={{ padding: '11px 8px' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: `${T.success}22`, color: T.success }}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {!loading && purchases.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: 48, textAlign: 'center', color: T.sub, fontSize: 14 }}>
                      No hay compras registradas
                    </td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal nueva compra */}
      <Modal
        open={modal}
        onClose={() => { setModal(false); setSuppId(''); setNotes(''); setItems([]) }}
        title="Nueva compra / Ingreso"
        width={660}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
          <div>
            <label htmlFor="purch-supplier" style={labelStyle}>Proveedor</label>
            <select id="purch-supplier" value={suppId} onChange={e => setSuppId(e.target.value)} style={inp}>
              <option value="">Sin proveedor</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="purch-notes" style={labelStyle}>Notas</label>
            <input id="purch-notes" value={notes} onChange={e => setNotes(e.target.value)} style={inp} placeholder="Observaciones opcionales" />
          </div>
        </div>

        {/* Buscador */}
        <div style={{ marginBottom: 18 }}>
          <label htmlFor="purch-search" style={labelStyle}>Agregar producto</label>
          <div style={{ position: 'relative' }}>
            <Search size={14} color={T.sub} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} aria-hidden="true" />
            <input
              id="purch-search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre o código..."
              style={{ ...inp, paddingLeft: 36 }}
            />
            {results.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: T.card, border: `1px solid ${T.border}`, borderRadius: T.r, boxShadow: '0 12px 32px rgba(0,0,0,0.5)', marginTop: 4 }}>
                {results.map(p => (
                  <button key={p.id} onClick={() => addItem(p)}
                    style={{ width: '100%', padding: '11px 14px', display: 'flex', justifyContent: 'space-between', border: 'none', background: 'transparent', color: T.text, cursor: 'pointer', borderBottom: `1px solid ${T.border}`, fontSize: 14 }}>
                    <span style={{ fontWeight: 500 }}>{p.name}</span>
                    <span style={{ color: T.sub }}>costo: {fmt(p.cost)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Items */}
        {items.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: T.sub, fontSize: 11, borderBottom: `1px solid ${T.border}`, textAlign: 'left' }}>
                  <th scope="col" style={th}>PRODUCTO</th>
                  <th scope="col" style={{ ...th, textAlign: 'center', width: 100 }}>CANTIDAD</th>
                  <th scope="col" style={{ ...th, textAlign: 'right', width: 130 }}>COSTO UNIT.</th>
                  <th scope="col" style={{ ...th, textAlign: 'right', width: 120 }}>SUBTOTAL</th>
                  <th scope="col" aria-label="Acciones" style={{ width: 36 }} />
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td style={{ padding: '9px 8px', color: T.text, fontSize: 14, fontWeight: 500 }}>{item.product.name}</td>
                    <td style={{ padding: '9px 8px', textAlign: 'center' }}>
                      <input
                        type="number"
                        value={item.quantity}
                        min={0.1}
                        step={0.1}
                        aria-label={`Cantidad de ${item.product.name}`}
                        onChange={e => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)}
                        style={{ ...inp, textAlign: 'center', padding: '6px 8px', width: 80 }}
                      />
                    </td>
                    <td style={{ padding: '9px 8px', textAlign: 'right' }}>
                      <input
                        type="number"
                        value={item.unit_cost}
                        aria-label={`Costo unitario de ${item.product.name}`}
                        onChange={e => updateItem(i, 'unit_cost', parseFloat(e.target.value) || 0)}
                        style={{ ...inp, textAlign: 'right', padding: '6px 8px', width: 110 }}
                      />
                    </td>
                    <td style={{ padding: '9px 8px', textAlign: 'right', color: T.primary, fontWeight: 700, fontSize: 14 }}>
                      {fmt(item.quantity * item.unit_cost)}
                    </td>
                    <td style={{ padding: '9px 4px', textAlign: 'center' }}>
                      <button
                        onClick={() => removeItem(i)}
                        aria-label={`Quitar ${item.product.name}`}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.danger, padding: 4, display: 'flex', alignItems: 'center', borderRadius: 4 }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14, padding: '12px 8px', borderTop: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>
                Total: <span style={{ color: T.primary, fontSize: 22 }}>{fmt(totalCost)}</span>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={() => { setModal(false); setSuppId(''); setNotes(''); setItems([]) }} style={cancelBtn}>
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={items.length === 0 || saving}
            style={{
              ...primaryBtn,
              background: items.length > 0 && !saving ? T.primary : T.border,
              cursor: items.length > 0 && !saving ? 'pointer' : 'default',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Guardando…' : 'Confirmar ingreso'}
          </button>
        </div>
      </Modal>
    </div>
  )
}

const th: React.CSSProperties = { padding: '10px 8px', fontWeight: 600 }
