import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, X, Package } from 'lucide-react'
import type { Supplier } from '../types/api'

const $ = {
  bg: '#0f1117', surface: '#1a1d27', border: '#2a2d3a',
  text: '#e2e8f0', muted: '#64748b', primary: '#6366f1',
  success: '#22c55e', warning: '#f59e0b', danger: '#ef4444',
}

const EMPTY: Partial<Supplier> = { name: '', contact: '', phone: '', notes: '' }

export default function SuppliersScreen() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [modal, setModal]         = useState(false)
  const [editing, setEditing]     = useState<Partial<Supplier>>(EMPTY)
  const [isEdit, setIsEdit]       = useState(false)
  const [detail, setDetail]       = useState<Supplier | null>(null)
  const [stats, setStats]         = useState<any>(null)

  const load = async () => setSuppliers(await window.api.suppliers.list())

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!detail) { setStats(null); return }
    // Cargar stats del proveedor via reportes generales y filtrar
    window.api.reports.salesSummary().then(r => {
      const sup = r.bySupplier.find((s: any) => s.supplier_name === detail.name)
      setStats({ sold: sup?.total_amount || 0, qty: sup?.total_qty || 0, lowStock: r.lowStock })
    })
  }, [detail])

  const openCreate = () => { setEditing({ ...EMPTY }); setIsEdit(false); setModal(true) }
  const openEdit   = (s: Supplier) => { setEditing({ ...s }); setIsEdit(true); setModal(true) }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este proveedor?')) return
    await window.api.suppliers.delete(id)
    load()
  }

  const handleSave = async () => {
    if (!editing.name?.trim()) return
    if (isEdit) await window.api.suppliers.update(editing as Supplier)
    else        await window.api.suppliers.create(editing)
    setModal(false)
    load()
  }

  const fmt = (n: number) => n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 })

  return (
    <div style={{ flex: 1, display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* Lista */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${$.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: $.text }}>Proveedores</div>
          <button onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: $.primary, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={15} /> Nuevo proveedor
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {suppliers.length === 0 ? (
            <div style={{ textAlign: 'center', color: $.muted, fontSize: 13, marginTop: 40 }}>No hay proveedores cargados</div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {suppliers.map(s => (
                <div
                  key={s.id}
                  onClick={() => setDetail(detail?.id === s.id ? null : s)}
                  style={{
                    background: $.surface, borderRadius: 12, padding: '14px 16px',
                    border: `1px solid ${detail?.id === s.id ? $.primary : $.border}`,
                    cursor: 'pointer', transition: 'border-color 0.15s',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ color: $.text, fontWeight: 600, fontSize: 14 }}>{s.name}</div>
                    {s.contact && <div style={{ color: $.muted, fontSize: 12, marginTop: 2 }}>{s.contact}</div>}
                    {s.phone   && <div style={{ color: $.muted, fontSize: 12 }}>📞 {s.phone}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={e => { e.stopPropagation(); openEdit(s) }} style={iconBtn}><Edit2 size={14} /></button>
                    <button onClick={e => { e.stopPropagation(); handleDelete(s.id) }} style={{ ...iconBtn, color: $.danger }}><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Panel de detalle */}
      {detail && (
        <div style={{ width: 320, borderLeft: `1px solid ${$.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${$.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: $.text }}>{detail.name}</div>
            <button onClick={() => setDetail(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: $.muted }}><X size={18} /></button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Estadísticas del día */}
            <div style={{ background: $.bg, borderRadius: 10, padding: 14, border: `1px solid ${$.border}` }}>
              <div style={{ fontSize: 11, color: $.muted, marginBottom: 10, fontWeight: 600 }}>VENTAS HOY</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: $.primary }}>{fmt(stats?.sold || 0)}</div>
                  <div style={{ fontSize: 11, color: $.muted }}>Vendido</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: $.success }}>{stats?.qty || 0}</div>
                  <div style={{ fontSize: 11, color: $.muted }}>Unidades</div>
                </div>
              </div>
            </div>

            {/* Productos con stock bajo */}
            {stats?.lowStock?.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: $.warning, marginBottom: 8, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Package size={12} /> STOCK BAJO
                </div>
                {stats.lowStock.map((p: any, i: number) => (
                  <div key={i} style={{ padding: '6px 0', borderBottom: `1px solid ${$.border}`, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: $.text }}>{p.name}</span>
                    <span style={{ color: $.warning }}>{p.stock} {p.unit}</span>
                  </div>
                ))}
              </div>
            )}

            {detail.notes && (
              <div>
                <div style={{ fontSize: 11, color: $.muted, marginBottom: 6 }}>NOTAS</div>
                <div style={{ color: $.text, fontSize: 13, background: $.bg, borderRadius: 8, padding: 10 }}>{detail.notes}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div style={overlayStyle}>
          <div style={{ background: $.surface, border: `1px solid ${$.border}`, borderRadius: 14, padding: 28, width: 440 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: $.text }}>{isEdit ? 'Editar proveedor' : 'Nuevo proveedor'}</div>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: $.muted }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={lbl}>Nombre *</label>
                <input value={editing.name || ''} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))} style={inp} placeholder="Ej: Arcor, Mastellone..." />
              </div>
              <div>
                <label style={lbl}>Contacto</label>
                <input value={editing.contact || ''} onChange={e => setEditing(p => ({ ...p, contact: e.target.value }))} style={inp} placeholder="Nombre del vendedor" />
              </div>
              <div>
                <label style={lbl}>Teléfono</label>
                <input value={editing.phone || ''} onChange={e => setEditing(p => ({ ...p, phone: e.target.value }))} style={inp} placeholder="+54 11 ..." />
              </div>
              <div>
                <label style={lbl}>Notas</label>
                <textarea value={editing.notes || ''} onChange={e => setEditing(p => ({ ...p, notes: e.target.value }))}
                  style={{ ...inp, minHeight: 72, resize: 'vertical' }} placeholder="Días de visita, condiciones..." />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(false)} style={{ padding: '8px 18px', borderRadius: 8, border: `1px solid ${$.border}`, background: 'transparent', color: $.muted, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleSave} style={{ padding: '8px 22px', borderRadius: 8, border: 'none', background: $.primary, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {isEdit ? 'Guardar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const iconBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px 6px' }
const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }
const lbl: React.CSSProperties = { display: 'block', fontSize: 11, color: '#64748b', marginBottom: 5, fontWeight: 500 }
const inp: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #2a2d3a', background: '#0f1117', color: '#e2e8f0', fontSize: 13, outline: 'none' }
