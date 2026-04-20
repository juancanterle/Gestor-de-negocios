import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Package, Phone, X } from 'lucide-react'
import { T, labelStyle } from '../theme'
import { inp, primaryBtn, cancelBtn, iconBtn } from '../styles/inputs'
import Modal from '../components/Modal'
import { useToast } from '../hooks/useToast'
import { useConfirm } from '../components/confirm-context'
import { unwrap } from '../lib/api'
import type { Supplier, SalesSummary } from '../types/api'

const EMPTY: Partial<Supplier> = { name: '', contact: '', phone: '', notes: '' }

interface SupplierStats {
  sold:     number
  qty:      number
  lowStock: SalesSummary['lowStock']
}

export default function SuppliersScreen() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [modal, setModal]         = useState(false)
  const [editing, setEditing]     = useState<Partial<Supplier>>(EMPTY)
  const [isEdit, setIsEdit]       = useState(false)
  const [detail, setDetail]       = useState<Supplier | null>(null)
  const [stats, setStats]         = useState<SupplierStats | null>(null)
  const [saving, setSaving]       = useState(false)
  const toast   = useToast()
  const confirm = useConfirm()

  const load = async () => {
    try {
      setSuppliers(unwrap(await window.api.suppliers.list()))
    } catch {
      toast.error('No se pudieron cargar los proveedores')
    }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!detail) { setStats(null); return }
    window.api.reports.salesSummary().then(raw => {
      const r = unwrap(raw)
      const sup = r.bySupplier.find(s => s.supplier_name === detail.name)
      setStats({ sold: sup?.total_amount || 0, qty: sup?.total_qty || 0, lowStock: r.lowStock })
    }).catch(() => {})
  }, [detail])

  const openCreate = () => { setEditing({ ...EMPTY }); setIsEdit(false); setModal(true) }
  const openEdit   = (s: Supplier) => { setEditing({ ...s }); setIsEdit(true); setModal(true) }

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: '¿Eliminar proveedor?',
      message: 'Esta acción no se puede deshacer.',
      variant: 'danger',
      confirmLabel: 'Eliminar',
    })
    if (!ok) return
    try {
      await window.api.suppliers.delete(id)
      toast.success('Proveedor eliminado')
      if (detail?.id === id) setDetail(null)
      load()
    } catch {
      toast.error('No se pudo eliminar el proveedor')
    }
  }

  const handleSave = async () => {
    if (!editing.name?.trim()) {
      toast.warning('El nombre es obligatorio')
      return
    }
    setSaving(true)
    try {
      if (isEdit) await window.api.suppliers.update(editing as Supplier)
      else        await window.api.suppliers.create(editing)
      setModal(false)
      toast.success(isEdit ? 'Proveedor actualizado' : 'Proveedor creado')
      load()
    } catch {
      toast.error('No se pudo guardar el proveedor')
    } finally {
      setSaving(false)
    }
  }

  const fmt = (n: number) => n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 })

  return (
    <div style={{ flex: 1, display: 'flex', height: '100%', overflow: 'hidden', background: T.bg }}>

      {/* Lista */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>Proveedores</div>
          <button onClick={openCreate} style={primaryBtn}>
            <Plus size={15} /> Nuevo proveedor
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {suppliers.length === 0 ? (
            <div style={{ textAlign: 'center', color: T.sub, fontSize: 14, marginTop: 60 }}>No hay proveedores cargados</div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {suppliers.map(s => (
                <div
                  key={s.id}
                  onClick={() => setDetail(detail?.id === s.id ? null : s)}
                  style={{
                    background: T.card, borderRadius: T.rLg, padding: '16px 18px',
                    border: `1.5px solid ${detail?.id === s.id ? T.primary : T.border}`,
                    cursor: 'pointer', transition: 'border-color 0.15s',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ color: T.text, fontWeight: 700, fontSize: 15 }}>{s.name}</div>
                    {s.contact && <div style={{ color: T.sub, fontSize: 12, marginTop: 3 }}>{s.contact}</div>}
                    {s.phone && (
                      <div style={{ color: T.sub, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <Phone size={11} aria-hidden="true" /> {s.phone}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={e => { e.stopPropagation(); openEdit(s) }}
                      style={iconBtn}
                      aria-label={`Editar ${s.name}`}
                      onMouseEnter={e => (e.currentTarget.style.color = T.primary)}
                      onMouseLeave={e => (e.currentTarget.style.color = T.sub)}
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(s.id) }}
                      style={{ ...iconBtn, color: T.faint }}
                      aria-label={`Eliminar ${s.name}`}
                      onMouseEnter={e => (e.currentTarget.style.color = T.danger)}
                      onMouseLeave={e => (e.currentTarget.style.color = T.faint)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Panel de detalle */}
      {detail && (
        <div style={{ width: 320, borderLeft: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: T.surface }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{detail.name}</div>
            <button
              onClick={() => setDetail(null)}
              style={iconBtn}
              aria-label="Cerrar detalle"
            >
              <X size={18} />
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: T.card, borderRadius: T.r, padding: 16, border: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: T.sub, marginBottom: 12, textTransform: 'uppercase' }}>Ventas hoy</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: T.primary }}>{fmt(stats?.sold || 0)}</div>
                  <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>Vendido</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: T.success }}>{stats?.qty || 0}</div>
                  <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>Unidades</div>
                </div>
              </div>
            </div>

            {stats && stats.lowStock.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: T.warning, marginBottom: 8, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Package size={12} aria-hidden="true" /> Stock bajo
                </div>
                {stats.lowStock.map((p, i) => (
                  <div key={i} style={{ padding: '7px 0', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: T.text }}>{p.name}</span>
                    <span style={{ color: T.warning, fontWeight: 600 }}>{p.stock} {p.unit}</span>
                  </div>
                ))}
              </div>
            )}

            {detail.notes && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: T.sub, marginBottom: 6, textTransform: 'uppercase' }}>Notas</div>
                <div style={{ color: T.text, fontSize: 13, background: T.card, borderRadius: T.r, padding: '10px 12px', border: `1px solid ${T.border}` }}>
                  {detail.notes}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={isEdit ? 'Editar proveedor' : 'Nuevo proveedor'}
        width={460}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label htmlFor="sup-name" style={labelStyle}>Nombre *</label>
            <input
              id="sup-name"
              value={editing.name || ''}
              onChange={e => setEditing(p => ({ ...p, name: e.target.value }))}
              style={inp}
              placeholder="Ej: Arcor, Mastellone..."
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="sup-contact" style={labelStyle}>Contacto</label>
            <input
              id="sup-contact"
              value={editing.contact || ''}
              onChange={e => setEditing(p => ({ ...p, contact: e.target.value }))}
              style={inp}
              placeholder="Nombre del vendedor"
            />
          </div>
          <div>
            <label htmlFor="sup-phone" style={labelStyle}>Teléfono</label>
            <input
              id="sup-phone"
              value={editing.phone || ''}
              onChange={e => setEditing(p => ({ ...p, phone: e.target.value }))}
              style={inp}
              placeholder="+54 11 ..."
            />
          </div>
          <div>
            <label htmlFor="sup-notes" style={labelStyle}>Notas</label>
            <textarea
              id="sup-notes"
              value={editing.notes || ''}
              onChange={e => setEditing(p => ({ ...p, notes: e.target.value }))}
              style={{ ...inp, minHeight: 80, resize: 'vertical' }}
              placeholder="Días de visita, condiciones..."
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
          <button onClick={() => setModal(false)} style={cancelBtn}>Cancelar</button>
          <button onClick={handleSave} disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Guardando…' : isEdit ? 'Guardar' : 'Crear proveedor'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
