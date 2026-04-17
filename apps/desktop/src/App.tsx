import { useState, useEffect } from 'react'
import {
  ShoppingCart, Package, Users, Truck, ShoppingBag,
  BarChart2, Settings, DollarSign, LogOut,
} from 'lucide-react'
import { T } from './theme'
import LoginScreen from './screens/LoginScreen'
import POSScreen from './screens/POSScreen'
import ProductsScreen from './screens/ProductsScreen'
import SuppliersScreen from './screens/SuppliersScreen'
import PurchasesScreen from './screens/PurchasesScreen'
import CashRegisterScreen from './screens/CashRegisterScreen'
import ReportsScreen from './screens/ReportsScreen'
import SettingsScreen from './screens/SettingsScreen'
import type { User } from './types/api'

type Screen =
  | 'pos' | 'products' | 'suppliers'
  | 'purchases' | 'cash' | 'reports' | 'settings'

const NAV_ITEMS: { id: Screen; label: string; icon: React.ReactNode }[] = [
  { id: 'pos',       label: 'Venta',        icon: <ShoppingCart size={20} /> },
  { id: 'products',  label: 'Productos',    icon: <Package size={20} /> },
  { id: 'purchases', label: 'Compras',      icon: <ShoppingBag size={20} /> },
  { id: 'suppliers', label: 'Proveedores',  icon: <Truck size={20} /> },
  { id: 'cash',      label: 'Caja',         icon: <DollarSign size={20} /> },
  { id: 'reports',   label: 'Reportes',     icon: <BarChart2 size={20} /> },
  { id: 'settings',  label: 'Configuración',icon: <Settings size={20} /> },
]

const roleLabel: Record<string, string> = {
  OWNER: 'Dueño', MANAGER: 'Encargado', CASHIER: 'Cajero',
}

export default function App() {
  const [user, setUser]   = useState<User | null>(null)
  const [screen, setScreen] = useState<Screen>('pos')

  useEffect(() => {
    const saved = sessionStorage.getItem('user')
    if (saved) setUser(JSON.parse(saved))
  }, [])

  const handleLogin = async (u: User) => {
    setUser(u)
    sessionStorage.setItem('user', JSON.stringify(u))
    const register = await window.api.cashRegister.getCurrent()
    if (!register) setScreen('cash')
  }

  const handleLogout = () => {
    setUser(null)
    sessionStorage.removeItem('user')
  }

  if (!user) return <LoginScreen onLogin={handleLogin} />

  const renderScreen = () => {
    switch (screen) {
      case 'pos':       return <POSScreen user={user} />
      case 'products':  return <ProductsScreen />
      case 'suppliers': return <SuppliersScreen />
      case 'purchases': return <PurchasesScreen user={user} />
      case 'cash':      return <CashRegisterScreen user={user} />
      case 'reports':   return <ReportsScreen />
      case 'settings':  return <SettingsScreen onLogout={handleLogout} />
      default:          return <POSScreen user={user} />
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: T.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif' }}>

      {/* ── Sidebar ── */}
      <nav style={{
        width: 210,
        background: T.sidebar,
        borderRight: `1px solid ${T.sidebarB}`,
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ padding: '22px 20px 18px', borderBottom: `1px solid ${T.sidebarB}` }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: T.primary, letterSpacing: '-0.3px' }}>
            KioscoApp
          </div>
          <div style={{ fontSize: 12, color: T.sub, marginTop: 3 }}>Sistema de caja</div>
        </div>

        {/* Nav */}
        <div style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV_ITEMS.filter(item => item.id !== 'settings' || user.role === 'OWNER').map(item => {
            const active = screen === item.id
            return (
              <button
                key={item.id}
                onClick={() => setScreen(item.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '11px 12px',
                  borderRadius: T.r,
                  border: 'none',
                  cursor: 'pointer',
                  background: active ? `${T.primary}18` : 'transparent',
                  color: active ? T.primary : T.sub,
                  fontSize: 13.5,
                  fontWeight: active ? 700 : 400,
                  textAlign: 'left',
                  transition: 'all 0.12s',
                  boxShadow: active ? `inset 3px 0 0 ${T.primary}` : 'none',
                }}
              >
                <span style={{ opacity: active ? 1 : 0.7 }}>{item.icon}</span>
                {item.label}
              </button>
            )
          })}
        </div>

        {/* User footer */}
        <div style={{ padding: '12px 10px', borderTop: `1px solid ${T.sidebarB}` }}>
          <div style={{ padding: '10px 12px', marginBottom: 6, background: T.card, borderRadius: T.r, border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
            <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>{roleLabel[user.role] ?? user.role}</div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 12px',
              borderRadius: T.r,
              border: 'none',
              cursor: 'pointer',
              background: 'transparent',
              color: T.sub,
              fontSize: 13,
            }}
          >
            <LogOut size={16} />
            Cambiar usuario
          </button>
        </div>
      </nav>

      {/* ── Main ── */}
      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {renderScreen()}
      </main>
    </div>
  )
}
