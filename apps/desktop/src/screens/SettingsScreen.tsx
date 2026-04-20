import { useState, useEffect } from 'react'
import { Save, Plus, LogOut, RefreshCw, Check, WifiOff, AlertCircle, CloudUpload } from 'lucide-react'
import { T, labelStyle } from '../theme'
import { inp, primaryBtn, cancelBtn } from '../styles/inputs'
import { useToast } from '../hooks/useToast'
import { useSyncStatus } from '../hooks/useSyncStatus'
import { unwrap } from '../lib/api'
import type { Store, User } from '../types/api'

export default function SettingsScreen({ onLogout }: { onLogout: () => void }) {
  const [store, setStore]       = useState<Partial<Store>>({})
  const [saving, setSaving]     = useState(false)
  const [tab, setTab]           = useState<'store' | 'users'>('store')
  const [users, setUsers]       = useState<User[]>([])
  const [newUser, setNewUser]   = useState({ name: '', pin: '', role: 'CASHIER' })
  const [creating, setCreating] = useState(false)
  const [userErrors, setUserErrors] = useState<{ name?: string; pin?: string }>({})
  const toast = useToast()
  const { status: syncStatus, triggerManualSync } = useSyncStatus()

  const reloadUsers = () => {
    window.api.users.list().then(r => { if (r.ok) setUsers(r.data) }).catch(() => {})
  }

  useEffect(() => {
    window.api.store.get().then(r => { if (r.ok) setStore(r.data || {}) }).catch(() => {})
    reloadUsers()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      unwrap(await window.api.store.update(store as Store))
      toast.success('Configuración guardada')
    } catch {
      toast.error('No se pudo guardar la configuración')
    } finally {
      setSaving(false)
    }
  }

  const validateUser = () => {
    const e: typeof userErrors = {}
    if (!newUser.name.trim())           e.name = 'El nombre es obligatorio'
    else if (users.some(u => u.name.toLowerCase() === newUser.name.trim().toLowerCase()))
                                        e.name = 'Ya existe un usuario con ese nombre'
    if (newUser.pin.length !== 4)       e.pin  = 'El PIN debe tener exactamente 4 dígitos'
    return e
  }

  const handleCreateUser = async () => {
    const errs = validateUser()
    if (Object.keys(errs).length > 0) { setUserErrors(errs); return }
    try {
      unwrap(await window.api.users.create({ ...newUser, role: newUser.role as User['role'] }))
      setNewUser({ name: '', pin: '', role: 'CASHIER' })
      setCreating(false)
      setUserErrors({})
      toast.success('Usuario creado')
      reloadUsers()
    } catch {
      toast.error('No se pudo crear el usuario')
    }
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
          <LogOut size={15} aria-hidden="true" /> Cerrar sesión
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>

        {tab === 'store' && (
          <div style={{ maxWidth: 580 }}>

            {/* Panel de sincronización */}
            {syncStatus && (() => {
              const { Icon, color, label, detail } = (() => {
                if (syncStatus.processing) return { Icon: RefreshCw, color: T.primary, label: 'Sincronizando…', detail: 'Enviando datos al panel' }
                if (syncStatus.failed > 0)  return { Icon: AlertCircle, color: T.danger, label: `${syncStatus.failed} fallido${syncStatus.failed !== 1 ? 's' : ''}`, detail: syncStatus.lastError ?? 'Reintentá manualmente' }
                if (!syncStatus.online)     return { Icon: WifiOff, color: T.warning, label: 'Offline', detail: syncStatus.pending > 0 ? `${syncStatus.pending} venta${syncStatus.pending !== 1 ? 's' : ''} pendiente${syncStatus.pending !== 1 ? 's' : ''} de subir` : 'Sin conexión a internet' }
                if (syncStatus.pending > 0) return { Icon: CloudUpload, color: T.warning, label: `${syncStatus.pending} pendiente${syncStatus.pending !== 1 ? 's' : ''}`, detail: 'Se subirán automáticamente' }
                return { Icon: Check, color: T.cash, label: 'Todo sincronizado', detail: syncStatus.lastSync ? `Última sync: ${new Date(syncStatus.lastSync).toLocaleString('es-AR')}` : 'Listo' }
              })()
              const canSync = syncStatus.online && !syncStatus.processing
              return (
                <div style={{
                  background: T.card, border: `1px solid ${T.border}`, borderRadius: T.rLg,
                  padding: '16px 18px', marginBottom: 24,
                  display: 'flex', alignItems: 'center', gap: 14,
                }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: '50%',
                    background: `${color}22`, border: `1px solid ${color}55`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Icon
                      size={20}
                      color={color}
                      aria-hidden="true"
                      style={syncStatus.processing ? { animation: 'spin 1s linear infinite' } : undefined}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color, fontWeight: 700, fontSize: 14 }}>{label}</div>
                    <div style={{ color: T.sub, fontSize: 12, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{detail}</div>
                  </div>
                  <button
                    onClick={() => triggerManualSync()}
                    disabled={!canSync}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 14px', borderRadius: T.r, border: 'none',
                      background: canSync ? T.primaryD : T.border,
                      color: canSync ? '#fff' : T.faint,
                      fontSize: 12, fontWeight: 600,
                      cursor: canSync ? 'pointer' : 'not-allowed',
                      flexShrink: 0,
                    }}
                  >
                    <RefreshCw size={13} aria-hidden="true" />
                    Sincronizar
                  </button>
                </div>
              )
            })()}

            <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 20 }}>Datos del negocio</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="s-sync-id" style={labelStyle}>ID de sincronización (del panel admin)</label>
                <input
                  id="s-sync-id"
                  value={store.supabase_store_id || ''}
                  onChange={e => setStore(s => ({ ...s, supabase_store_id: e.target.value.trim() }))}
                  style={inp}
                  placeholder="Pegá el Store ID que te dio el panel de administración"
                />
                <div style={{ color: store.supabase_store_id ? T.success : T.warning, fontSize: 12, marginTop: 5, fontWeight: 600 }}>
                  {store.supabase_store_id ? '✓ Sincronización activa con la nube' : '⚠ Sin ID — los datos no se sincronizan con el dashboard'}
                </div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="s-name" style={labelStyle}>Nombre del negocio</label>
                <input id="s-name" value={store.name || ''} onChange={e => setStore(s => ({ ...s, name: e.target.value }))} style={inp} placeholder="Mi Kiosco" />
              </div>
              <div>
                <label htmlFor="s-address" style={labelStyle}>Dirección</label>
                <input id="s-address" value={store.address || ''} onChange={e => setStore(s => ({ ...s, address: e.target.value }))} style={inp} placeholder="Av. Corrientes 1234" />
              </div>
              <div>
                <label htmlFor="s-phone" style={labelStyle}>Teléfono</label>
                <input id="s-phone" value={store.phone || ''} onChange={e => setStore(s => ({ ...s, phone: e.target.value }))} style={inp} placeholder="+54 11 ..." />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="s-header" style={labelStyle}>Encabezado del ticket</label>
                <textarea id="s-header" value={store.ticket_header || ''} onChange={e => setStore(s => ({ ...s, ticket_header: e.target.value }))}
                  style={{ ...inp, minHeight: 64, resize: 'vertical' }} placeholder="Texto que aparece arriba del ticket" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="s-footer" style={labelStyle}>Pie del ticket</label>
                <textarea id="s-footer" value={store.ticket_footer || ''} onChange={e => setStore(s => ({ ...s, ticket_footer: e.target.value }))}
                  style={{ ...inp, minHeight: 64, resize: 'vertical' }} placeholder="Gracias por su compra" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="s-round" style={labelStyle}>Redondeo de precios calculados</label>
                <select id="s-round" value={store.price_round_mode || 'NONE'} onChange={e => setStore(s => ({ ...s, price_round_mode: e.target.value as Store['price_round_mode'] }))} style={inp}>
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

            <button onClick={handleSave} disabled={saving} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 28px', borderRadius: T.r, border: 'none',
              background: T.primary, color: '#fff',
              fontSize: 14, fontWeight: 700, cursor: saving ? 'default' : 'pointer',
              opacity: saving ? 0.7 : 1, transition: 'opacity 0.2s',
              boxShadow: T.shadowPrimary,
            }}>
              <Save size={16} aria-hidden="true" /> {saving ? 'Guardando…' : 'Guardar configuración'}
            </button>
          </div>
        )}

        {tab === 'users' && (
          <div style={{ maxWidth: 580 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>Usuarios del sistema</div>
              <button onClick={() => { setCreating(c => !c); setUserErrors({}) }} style={primaryBtn}>
                <Plus size={14} aria-hidden="true" /> Nuevo usuario
              </button>
            </div>

            {creating && (
              <div style={{ background: T.card, border: `1.5px solid ${T.primary}`, borderRadius: T.rLg, padding: 20, marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 14 }}>Crear nuevo usuario</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
                  <div>
                    <label htmlFor="u-name" style={labelStyle}>Nombre</label>
                    <input
                      id="u-name"
                      value={newUser.name}
                      onChange={e => { setNewUser(u => ({ ...u, name: e.target.value })); setUserErrors(x => ({ ...x, name: undefined })) }}
                      style={userErrors.name ? { ...inp, borderColor: T.danger } : inp}
                      placeholder="Juan"
                      autoFocus
                    />
                    {userErrors.name && <div style={{ color: T.danger, fontSize: 11, marginTop: 4 }}>{userErrors.name}</div>}
                  </div>
                  <div>
                    <label htmlFor="u-pin" style={labelStyle}>PIN (4 dígitos)</label>
                    <input
                      id="u-pin"
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={newUser.pin}
                      onChange={e => { setNewUser(u => ({ ...u, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })); setUserErrors(x => ({ ...x, pin: undefined })) }}
                      style={userErrors.pin ? { ...inp, borderColor: T.danger } : inp}
                      placeholder="••••"
                    />
                    {userErrors.pin && <div style={{ color: T.danger, fontSize: 11, marginTop: 4 }}>{userErrors.pin}</div>}
                  </div>
                  <div>
                    <label htmlFor="u-role" style={labelStyle}>Rol</label>
                    <select id="u-role" value={newUser.role} onChange={e => setNewUser(u => ({ ...u, role: e.target.value }))} style={inp}>
                      <option value="CASHIER">Cajero</option>
                      <option value="MANAGER">Encargado</option>
                      <option value="OWNER">Dueño</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={() => { setCreating(false); setUserErrors({}) }} style={cancelBtn}>Cancelar</button>
                  <button onClick={handleCreateUser} style={primaryBtn}>
                    Crear usuario
                  </button>
                </div>
              </div>
            )}

            {users.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 48, color: T.sub, fontSize: 14, background: T.card, borderRadius: T.rLg, border: `1px solid ${T.border}` }}>
                No hay usuarios creados todavía
              </div>
            ) : (
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
            )}

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
