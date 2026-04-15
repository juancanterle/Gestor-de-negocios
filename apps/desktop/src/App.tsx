import { useState, useEffect } from 'react'
import {
  ShoppingCart, Package, Users, Truck, ShoppingBag,
  BarChart2, Settings, DollarSign
} from 'lucide-react'
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
  { id: 'pos',       label: 'Venta',      icon: <ShoppingCart size={18} /> },
  { id: 'products',  label: 'Productos',  icon: <Package size={18} /> },
  { id: 'purchases', label: 'Compras',    icon: <ShoppingBag size={18} /> },
  { id: 'suppliers', label: 'Proveedores',icon: <Truck size={18} /> },
  { id: 'cash',      label: 'Caja',       icon: <DollarSign size={18} /> },
  { id: 'reports',   label: 'Reportes',   icon: <BarChart2 size={18} /> },
  { id: 'settings',  label: 'Config.',    icon: <Settings size={18} /> },
]

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [screen, setScreen] = useState<Screen>('pos')

  // Guardar sesión mientras la app está abierta
  useEffect(() => {
    const saved = sessionStorage.getItem('user')
    if (saved) setUser(JSON.parse(saved))
  }, [])

  const handleLogin = (u: User) => {
    setUser(u)
    sessionStorage.setItem('user', JSON.stringify(u))
  }

  const handleLogout = () => {
    setUser(null)
    sessionStorage.removeItem('user')
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />
  }

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
    <div style={{ display: 'flex', height: '100vh', background: '#0f1117' }}>
      {/* Sidebar */}
      <nav style={{
        width: 180,
        background: '#1a1d27',
        borderRight: '1px solid #2a2d3a',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 0',
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ padding: '0 16px 20px', borderBottom: '1px solid #2a2d3a' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#6366f1' }}>KioscoApp</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
            {user.name} · {user.role === 'OWNER' ? 'Dueño' : user.role === 'MANAGER' ? 'Encargado' : 'Cajero'}
          </div>
        </div>

        {/* Nav items */}
        <div style={{ flex: 1, padding: '12px 8px' }}>
          {NAV_ITEMS.map(item => {
            const active = screen === item.id
            return (
              <button
                key={item.id}
                onClick={() => setScreen(item.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  marginBottom: 2,
                  background: active ? '#6366f1' : 'transparent',
                  color: active ? '#fff' : '#94a3b8',
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  transition: 'all 0.15s',
                  textAlign: 'left',
                }}
              >
                {item.icon}
                {item.label}
              </button>
            )
          })}
        </div>

        {/* Users icon en footer */}
        <div style={{ padding: '12px 8px', borderTop: '1px solid #2a2d3a' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 12px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              background: 'transparent',
              color: '#64748b',
              fontSize: 13,
            }}
          >
            <Users size={18} />
            Cambiar usuario
          </button>
        </div>
      </nav>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {renderScreen()}
      </main>
    </div>
  )
}
