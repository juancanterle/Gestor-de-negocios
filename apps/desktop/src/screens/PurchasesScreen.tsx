import { useState, useEffect } from 'react'
import { Plus, Trash2, X, Search } from 'lucide-react'
import type { User, Product, Supplier, Purchase } from '../types/api'

const $ = {
  bg: '#0f1117', surface: '#1a1d27', border: '#2a2d3a',
  text: '#e2e8f0', muted: '#64748b', primary: '#6366f1',
  success: '#22c55e', warning: '#f59e0b', danger: '#ef4444',
}

interface PurchaseItem { product: Product; quantity: number; unit_cost: number }

export default function PurchasesScreen({ user }: { user: User }) {
  const [purchases, setPurchases]   = useState<Purchase[]>([])
  const [suppliers, setSuppliers]   = useState<Supplier[]>([])
  const [modal, setModal]           = useState(false)
  const [suppId, setSuppId]         = useState('')
  const [notes, setNotes]           = useState('')
  const [items, setItems]           = useState<PurchaseItem[]>([])
  const [search, setSearch]         = useState('')
  const [results, setResults]       = useState<Product[]>([])

  const load = async () => {
    const [p, s] = await Promise.all([window.api.purchases.list(), window.api.suppliers.list()])
    setPurchases(p)
    setSuppliers(s)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!search.trim()) { setResults([]); return }
    const t = setTimeout(async () => {
      const r = await window.api.products.list({ search: search.trim() })
      setResults(r.slice(0, 8))
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
    if (items.length === 0) return
    await window.api.purchases.create({
      supplier_id: suppId || undefined,
      user_id: user.id,
      notes: notes || undefined,
      items: items.map(i => ({ product_id: i.product.id, quantity: i.quantity, unit_cost: i.unit_cost })),
    })
    setModal(false)
    setSuppId(''); setNotes(''); setItems([])
    load()
  }

  const fmt = (n: number) => n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 })

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${$.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: $.text }}>Compras / Ingreso de mercadería</div>
        <button onClick={() => setModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: $.primary, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={15} /> Nueva compra
        </button>
      </div>

      {/* Lista */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ position: 'sticky', top: 0, background: $.bg }}>
            <tr style={{ color: $.muted, fontSize: 11, borderBottom: `1px solid ${$.border}`, textAlign: 'left' }}>
              <th style={th}>FECHA</th>
              <th style={th}>PROVEEDOR</th>
              <th style={th}>NOTAS</th>
              <th style={{ ...th, textAlign: 'right' }}>TOTAL</th>
              <th style={{ ...th }}>ESTADO</th>
            </tr>
          </thead>
          <tbody>
            {purchases.map(p => (
              <tr key={p.id} style={{ borderBottom: `1px solid ${$.border}` }}>
                <td style={{ padding: '10px 8px', color: $.muted, fontSize: 12 }}>
                  {new Date(p.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td style={{ padding: '10px 8px', color: $.text, fontSize: 13 }}>{p.supplier_name || '—'}</td>
                <td style={{ padding: '10px 8px', color: $.muted, fontSize: 12 }}>{p.notes || '—'}</td>
                <td style={{ padding: '10px 8px', textAlign: 'right', color: $.primary, fontWeight: 700 }}>{fmt(p.total_cost)}</td>
                <td style={{ padding: '10px 8px' }}>
                  <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: `${$.success}22`, color: $.success }}>
                    {p.status}
                  </span>
                </td>
              </tr>
            ))}
            {purchases.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: $.muted, fontSize: 13 }}>No hay compras registradas</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal nueva compra */}
      {modal && (
        <div style={overlayStyle}>
          <div style={{ background: $.surface, border: `1px solid ${$.border}`, borderRadius: 16, padding: 28, width: 640, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: $.text }}>Nueva compra / Ingreso</div>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: $.muted }}><X size={20} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              <div>
                <label style={lbl}>Proveedor</label>
                <select value={suppId} onChange={e => setSuppId(e.target.value)} style={inp}>
                  <option value="">Sin proveedor</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Notas</label>
                <input value={notes} onChange={e => setNotes(e.target.value)} style={inp} placeholder="Observaciones opcionales" />
              </div>
            </div>

            {/* Buscador de productos */}
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Agregar producto</label>
              <div style={{ position: 'relative' }}>
                <Search size={14} color={$.muted} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o código..."
                  style={{ ...inp, paddingLeft: 32 }} />
                {results.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: $.surface, border: `1px solid ${$.border}`, borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', marginTop: 4 }}>
                    {results.map(p => (
                      <button key={p.id} onClick={() => addItem(p)}
                        style={{ width: '100%', padding: '9px 12px', display: 'flex', justifyContent: 'space-between', border: 'none', background: 'transparent', color: $.text, cursor: 'pointer', borderBottom: `1px solid ${$.border}`, fontSize: 13 }}>
                        <span>{p.name}</span>
                        <span style={{ color: $.muted }}>costo: {p.cost.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 })}</span>
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
                    <tr style={{ color: $.muted, fontSize: 11, borderBottom: `1px solid ${$.border}`, textAlign: 'left' }}>
                      <th style={th}>PRODUCTO</th>
                      <th style={{ ...th, textAlign: 'center', width: 100 }}>CANTIDAD</th>
                      <th style={{ ...th, textAlign: 'right', width: 130 }}>COSTO UNIT.</th>
                      <th style={{ ...th, textAlign: 'right', width: 110 }}>SUBTOTAL</th>
                      <th style={{ width: 36 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${$.border}` }}>
                        <td style={{ padding: '8px 8px', color: $.text, fontSize: 13 }}>{item.product.name}</td>
                        <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                          <input type="number" value={item.quantity} min={0.1} step={0.1}
                            onChange={e => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)}
                            style={{ ...inp, textAlign: 'center', padding: '5px 8px', width: 80 }} />
                        </td>
                        <td style={{ padding: '8px 8px', textAlign: 'right' }}>
                          <input type="number" value={item.unit_cost}
                            onChange={e => updateItem(i, 'unit_cost', parseFloat(e.target.value) || 0)}
                            style={{ ...inp, textAlign: 'right', padding: '5px 8px', width: 110 }} />
                        </td>
                        <td style={{ padding: '8px 8px', textAlign: 'right', color: $.primary, fontWeight: 600 }}>
                          {fmt(item.quantity * item.unit_cost)}
                        </td>
                        <td style={{ padding: '8px 4px', textAlign: 'center' }}>
                          <button onClick={() => removeItem(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: $.danger, padding: 4 }}><Trash2 size={13} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12, padding: '10px 8px', borderTop: `1px solid ${$.border}` }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: $.text }}>
                    Total: <span style={{ color: $.primary }}>{fmt(totalCost)}</span>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(false)} style={{ padding: '9px 20px', borderRadius: 8, border: `1px solid ${$.border}`, background: 'transparent', color: $.muted, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleSave} disabled={items.length === 0}
                style={{ padding: '9px 24px', borderRadius: 8, border: 'none', background: items.length > 0 ? $.primary : $.border, color: '#fff', fontSize: 13, fontWeight: 600, cursor: items.length > 0 ? 'pointer' : 'default' }}>
                Confirmar ingreso
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const th: React.CSSProperties = { padding: '10px 8px', fontWeight: 500 }
const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }
const lbl: React.CSSProperties = { display: 'block', fontSize: 11, color: '#64748b', marginBottom: 5, fontWeight: 500 }
const inp: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #2a2d3a', background: '#0f1117', color: '#e2e8f0', fontSize: 13, outline: 'none' }
