import { useState, useEffect } from 'react'
import { Save, Plus, LogOut } from 'lucide-react'
import { T, labelStyle } from '../theme'
import type { Store } from '../types/api'

export default function SettingsScreen({ onLogout }: { onLogout: () => void }) {
  const [store, setStore]       = useState<Partial<Store>>({})
  const [saved, setSaved]       = useState(false)
  const [tab, setTab]           = useState<'store' | 'users'>('store')
  const [users, setUsers]       = useState<any[]>([])
  const [newUser, setNewUser]   = useState({ name: '', pin: '', role: 'CASHIER' })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    window.api.store.get().then(s => setStore(s || {}))
    window.api.users.list().then(setUsers)
  }, [])

  const handleSave = async () => {
    await window.api.store.update(store as Store)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleCreateUser = async () => {
    if (!newUser.name.trim() || newUser.pin.length !== 4) return
    await window.api.users.create(newUser)
    setNewUser({ name: '', pin: '', role: 'CASHIER' })
    setCreating(false)
    window.api.users.list().then(setUsers)
  }

  const roleLabel: Record<string, string> = { OWNER: 'Dueño', MANAGER: 'Encargado', CASHIER: 'Cajero' }
  const roleColor: Record<string, string> = { OWNER: T.primary, MANAGER: T.warning, CASHIER: T.sub }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: T.bg }}>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}`, padding: '0 20px' }}>
        {[{ id: 'store', label: 'Configuración del local' }, { id: 'users', label: 'Usuarios' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as typeof tab)} style={{
            padding: '13px 18px', border: 'none', background: 'transparent',
            borderBottom: `2px solid ${tab === t.id ? T.primary : 'transparent'}`,
            color: tab === t.id ? T.primary : T.sub,
            fontSize: 14, fontWeight: tab === t.id ? 700 : 400, cursor: 'pointer', marginBottom: -1,
          }}>
            {t.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={onLogout} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', border: 'none', background: 'transparent', color: T.danger, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <LogOut size={15} /> Cerrar sesión
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>

        {tab === 'store' && (
          <div style={{ maxWidth: 580 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 20 }}>Datos del negocio</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Nombre del negocio</label>
                <input value={store.name || ''} onChange={e => setStore(s => ({ ...s, name: e.target.value }))} style={inp} placeholder="Mi Kiosco" />
              </div>
              <div>
                <label style={labelStyle}>Dirección</label>
                <input value={store.address || ''} onChange={e => setStore(s => ({ ...s, address: e.target.value }))} style={inp} placeholder="Av. Corrientes 1234" />
              </div>
              <div>
                <label style={labelStyle}>Teléfono</label>
                <input value={store.phone || ''} onChange={e => setStore(s => ({ ...s, phone: e.target.value }))} style={inp} placeholder="+54 11 ..." />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Encabezado del ticket</label>
                <textarea value={store.ticket_header || ''} onChange={e => setStore(s => ({ ...s, ticket_header: e.target.value }))}
                  style={{ ...inp, minHeight: 64, resize: 'vertical' }} placeholder="Texto que aparece arriba del ticket" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Pie del ticket</label>
                <textarea value={store.ticket_footer || ''} onChange={e => setStore(s => ({ ...s, ticket_footer: e.target.value }))}
                  style={{ ...inp, minHeight: 64, resize: 'vertical' }} placeholder="Gracias por su compra" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Redondeo de precios calculados</label>
                <select value={store.price_round_mode || 'NONE'} onChange={e => setStore(s => ({ ...s, price_round_mode: e.target.value as Store['price_round_mode'] }))} style={inp}>
                  <option value="NONE">Sin redondeo</option>
                  <option value="10">Redondear a $10</option>
                  <option value="50">Redondear a $50</option>
                  <option value="100">Redondear a $100</option>
                </select>
                <div style={{ color: T.sub, fontSize: 12, marginTop: 5 }}>
                  Ej con 40%: costo $1000 → precio $1400. Con redondeo a $100 → $1400.
                </div>
              </div>
            </div>

            <button onClick={handleSave} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 28px', borderRadius: T.r, border: 'none',
              background: saved ? T.success : T.primary,
              color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              transition: 'background 0.25s',
              boxShadow: saved ? `0 4px 16px ${T.success}40` : `0 4px 16px ${T.primary}40`,
            }}>
              <Save size={16} /> {saved ? '¡Guardado!' : 'Guardar configuración'}
            </button>
          </div>
        )}

        {tab === 'users' && (
          <div style={{ maxWidth: 580 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>Usuarios del sistema</div>
              <button onClick={() => setCreating(c => !c)} style={primaryBtn}>
                <Plus size={14} /> Nuevo usuario
              </button>
            </div>

            {creating && (
              <div style={{ background: T.card, border: `1.5px solid ${T.primary}`, borderRadius: T.rLg, padding: 20, marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 14 }}>Crear nuevo usuario</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
                  <div>
                    <label style={labelStyle}>Nombre</label>
                    <input value={newUser.name} onChange={e => setNewUser(u => ({ ...u, name: e.target.value }))} style={inp} placeholder="Juan" autoFocus />
                  </div>
                  <div>
                    <label style={labelStyle}>PIN (4 dígitos)</label>
                    <input type="password" maxLength={4} value={newUser.pin}
                      onChange={e => setNewUser(u => ({ ...u, pin: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                      style={inp} placeholder="••••" />
                  </div>
                  <div>
                    <label style={labelStyle}>Rol</label>
                    <select value={newUser.role} onChange={e => setNewUser(u => ({ ...u, role: e.target.value }))} style={inp}>
                      <option value="CASHIER">Cajero</option>
                      <option value="MANAGER">Encargado</option>
                      <option value="OWNER">Dueño</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={() => setCreating(false)} style={cancelBtn}>Cancelar</button>
                  <button onClick={handleCreateUser} disabled={!newUser.name || newUser.pin.length !== 4}
                    style={{ ...primaryBtn, background: newUser.name && newUser.pin.length === 4 ? T.primary : T.border, cursor: newUser.name && newUser.pin.length === 4 ? 'pointer' : 'default' }}>
                    Crear usuario
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {users.map(u => (
                <div key={u.id} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: T.rLg, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ color: T.text, fontWeight: 700, fontSize: 15 }}>{u.name}</div>
                    <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>PIN: ••••</div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 20, background: `${roleColor[u.role]}22`, color: roleColor[u.role] }}>
                    {roleLabel[u.role]}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 28, padding: 16, background: `${T.warning}0d`, borderRadius: T.rLg, border: `1px solid ${T.warning}44` }}>
              <div style={{ color: T.warning, fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Seguridad</div>
              <div style={{ color: T.sub, fontSize: 13, lineHeight: 1.6 }}>
                Los PINs se almacenan en la base de datos local. Usá PINs únicos para cada usuario. El dueño siempre debe tener un PIN diferente al del cajero.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const inp: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: T.r,
  border: `1.5px solid ${T.border}`, background: T.input,
  color: T.text, fontSize: 14, outline: 'none', boxSizing: 'border-box',
}
const primaryBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '9px 16px', borderRadius: T.r, border: 'none',
  background: T.primary, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
}
const cancelBtn: React.CSSProperties = {
  padding: '9px 16px', borderRadius: T.r,
  border: `1.5px solid ${T.border}`, background: 'transparent',
  color: T.sub, fontSize: 13, cursor: 'pointer',
}
