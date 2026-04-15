import { useState, useEffect } from 'react'
import { Save, Plus, LogOut } from 'lucide-react'
import type { Store } from '../types/api'

const $ = {
  bg: '#0f1117', surface: '#1a1d27', border: '#2a2d3a',
  text: '#e2e8f0', muted: '#64748b', primary: '#6366f1',
  success: '#22c55e', warning: '#f59e0b', danger: '#ef4444',
}

export default function SettingsScreen({ onLogout }: { onLogout: () => void }) {
  const [store, setStore]   = useState<Partial<Store>>({})
  const [saved, setSaved]   = useState(false)
  const [tab, setTab]       = useState<'store' | 'users'>('store')
  const [users, setUsers]   = useState<any[]>([])
  const [newUser, setNewUser] = useState({ name: '', pin: '', role: 'CASHIER' })
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
  const roleColor: Record<string, string> = { OWNER: $.primary, MANAGER: $.warning, CASHIER: $.muted }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${$.border}`, padding: '0 20px' }}>
        {[{ id: 'store', label: 'Configuración del local' }, { id: 'users', label: 'Usuarios' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as typeof tab)} style={{
            padding: '12px 16px', border: 'none', background: 'transparent',
            borderBottom: `2px solid ${tab === t.id ? $.primary : 'transparent'}`,
            color: tab === t.id ? $.primary : $.muted,
            fontSize: 13, fontWeight: tab === t.id ? 600 : 400, cursor: 'pointer', marginBottom: -1,
          }}>
            {t.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={onLogout} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', border: 'none', background: 'transparent', color: $.danger, fontSize: 13, cursor: 'pointer' }}>
          <LogOut size={15} /> Cerrar sesión
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

        {tab === 'store' && (
          <div style={{ maxWidth: 560 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={lbl}>Nombre del negocio</label>
                <input value={store.name || ''} onChange={e => setStore(s => ({ ...s, name: e.target.value }))} style={inp} placeholder="Mi Kiosco" />
              </div>
              <div>
                <label style={lbl}>Dirección</label>
                <input value={store.address || ''} onChange={e => setStore(s => ({ ...s, address: e.target.value }))} style={inp} placeholder="Av. Corrientes 1234" />
              </div>
              <div>
                <label style={lbl}>Teléfono</label>
                <input value={store.phone || ''} onChange={e => setStore(s => ({ ...s, phone: e.target.value }))} style={inp} placeholder="+54 11 ..." />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={lbl}>Encabezado del ticket</label>
                <textarea value={store.ticket_header || ''} onChange={e => setStore(s => ({ ...s, ticket_header: e.target.value }))}
                  style={{ ...inp, minHeight: 60, resize: 'vertical' }} placeholder="Texto que aparece arriba del ticket" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={lbl}>Pie del ticket</label>
                <textarea value={store.ticket_footer || ''} onChange={e => setStore(s => ({ ...s, ticket_footer: e.target.value }))}
                  style={{ ...inp, minHeight: 60, resize: 'vertical' }} placeholder="Gracias por su compra" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={lbl}>Redondeo de precios calculados</label>
                <select value={store.price_round_mode || 'NONE'} onChange={e => setStore(s => ({ ...s, price_round_mode: e.target.value as Store['price_round_mode'] }))} style={inp}>
                  <option value="NONE">Sin redondeo</option>
                  <option value="10">Redondear a $10</option>
                  <option value="50">Redondear a $50</option>
                  <option value="100">Redondear a $100</option>
                </select>
                <div style={{ color: $.muted, fontSize: 11, marginTop: 4 }}>
                  Ej con 40%: costo $1000 → precio $1400. Con redondeo a $50 → $1400. Con redondeo a $100 → $1400.
                </div>
              </div>
            </div>

            <button onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 10, border: 'none', background: saved ? $.success : $.primary, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}>
              <Save size={15} /> {saved ? '¡Guardado!' : 'Guardar configuración'}
            </button>
          </div>
        )}

        {tab === 'users' && (
          <div style={{ maxWidth: 560 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: $.muted }}>Usuarios con acceso al sistema</div>
              <button onClick={() => setCreating(c => !c)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: 'none', background: $.primary, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                <Plus size={13} /> Nuevo usuario
              </button>
            </div>

            {creating && (
              <div style={{ background: $.surface, border: `1px solid ${$.primary}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={lbl}>Nombre</label>
                    <input value={newUser.name} onChange={e => setNewUser(u => ({ ...u, name: e.target.value }))} style={inp} placeholder="Juan" autoFocus />
                  </div>
                  <div>
                    <label style={lbl}>PIN (4 dígitos)</label>
                    <input type="password" maxLength={4} value={newUser.pin} onChange={e => setNewUser(u => ({ ...u, pin: e.target.value.replace(/\D/g, '').slice(0, 4) }))} style={inp} placeholder="••••" />
                  </div>
                  <div>
                    <label style={lbl}>Rol</label>
                    <select value={newUser.role} onChange={e => setNewUser(u => ({ ...u, role: e.target.value }))} style={inp}>
                      <option value="CASHIER">Cajero</option>
                      <option value="MANAGER">Encargado</option>
                      <option value="OWNER">Dueño</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={() => setCreating(false)} style={{ padding: '7px 16px', borderRadius: 8, border: `1px solid ${$.border}`, background: 'transparent', color: $.muted, fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
                  <button onClick={handleCreateUser} disabled={!newUser.name || newUser.pin.length !== 4}
                    style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: newUser.name && newUser.pin.length === 4 ? $.primary : $.border, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    Crear usuario
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {users.map(u => (
                <div key={u.id} style={{ background: $.surface, border: `1px solid ${$.border}`, borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ color: $.text, fontWeight: 600, fontSize: 14 }}>{u.name}</div>
                    <div style={{ fontSize: 11, color: $.muted, marginTop: 2 }}>PIN: ••••</div>
                  </div>
                  <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 20, background: `${roleColor[u.role]}22`, color: roleColor[u.role], fontWeight: 600 }}>
                    {roleLabel[u.role]}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 24, padding: 16, background: `${$.warning}11`, borderRadius: 10, border: `1px solid ${$.warning}44` }}>
              <div style={{ color: $.warning, fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Seguridad</div>
              <div style={{ color: $.muted, fontSize: 12 }}>
                Los PINs se almacenan en la base de datos local. Usá PINs únicos para cada usuario. El dueño siempre debe tener un PIN diferente al del cajero.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const lbl: React.CSSProperties = { display: 'block', fontSize: 11, color: '#64748b', marginBottom: 5, fontWeight: 500 }
const inp: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #2a2d3a', background: '#0f1117', color: '#e2e8f0', fontSize: 13, outline: 'none' }
