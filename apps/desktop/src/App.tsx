import { useState, useEffect } from 'react'
import {
  ShoppingCart, Package, Truck, ShoppingBag,
  BarChart2, Settings, DollarSign, LogOut, Menu, ChevronLeft,
  AlertTriangle,
} from 'lucide-react'
import { T } from './theme'
import { unwrap } from './lib/api'
import LoginScreen from './screens/LoginScreen'
import POSScreen from './screens/POSScreen'
import ProductsScreen from './screens/ProductsScreen'
import SuppliersScreen from './screens/SuppliersScreen'
import PurchasesScreen from './screens/PurchasesScreen'
import CashRegisterScreen from './screens/CashRegisterScreen'
import ReportsScreen from './screens/ReportsScreen'
import SettingsScreen from './screens/SettingsScreen'
import ErrorBoundary from './components/ErrorBoundary'
import ToastProvider from './components/ToastProvider'
import { ConfirmProvider } from './components/ConfirmDialog'
import SyncIndicator from './components/SyncIndicator'
import type { User } from './types/api'

type Screen =
  | 'pos' | 'products' | 'suppliers'
  | 'purchases' | 'cash' | 'reports' | 'settings'

const NAV_ITEMS: { id: Screen; label: string; icon: React.ReactNode }[] = [
  { id: 'pos',       label: 'Venta',         icon: <ShoppingCart size={17} /> },
  { id: 'products',  label: 'Productos',     icon: <Package size={17} /> },
  { id: 'purchases', label: 'Compras',       icon: <ShoppingBag size={17} /> },
  { id: 'suppliers', label: 'Proveedores',   icon: <Truck size={17} /> },
  { id: 'cash',      label: 'Caja',          icon: <DollarSign size={17} /> },
  { id: 'reports',   label: 'Reportes',      icon: <BarChart2 size={17} /> },
  { id: 'settings',  label: 'Configuración', icon: <Settings size={17} /> },
]

const roleLabel: Record<string, string> = {
  OWNER: 'Dueño', MANAGER: 'Encargado', CASHIER: 'Cajero',
}

function MissingBridge() {
  return (
    <div style={{
      height: '100vh', background: T.bg, display: 'flex',
      alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16,
      padding: 32, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    }}>
      <AlertTriangle size={48} color={T.warning} strokeWidth={1.5} />
      <div style={{ fontSize: 20, fontWeight: 700, color: T.text }}>Esta app requiere Electron</div>
      <div style={{ color: T.sub, fontSize: 14, maxWidth: 480, textAlign: 'center', lineHeight: 1.6 }}>
        El puente <code style={{ fontFamily: 'ui-monospace, monospace', color: T.text }}>window.api</code> no está disponible.
        Probablemente abriste <code style={{ fontFamily: 'ui-monospace, monospace', color: T.text }}>localhost</code> en un navegador normal.
      </div>
      <div style={{ color: T.sub, fontSize: 13, background: T.card, border: `1px solid ${T.border}`, borderRadius: T.r, padding: '10px 14px', fontFamily: 'ui-monospace, monospace' }}>
        npm run dev
      </div>
    </div>
  )
}

export default function App() {
  if (typeof window === 'undefined' || !window.api?.cashRegister) return <MissingBridge />
  return <AppInner />
}

function AppInner() {
  const [user, setUser]     = useState<User | null>(() => {
    const saved = sessionStorage.getItem('user')
    return saved ? JSON.parse(saved) : null
  })
  const [screen, setScreen] = useState<Screen>('pos')
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 900)

  useEffect(() => {
    const handler = () => {
      if (window.innerWidth < 900) setCollapsed(true)
    }
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const handleLogin = async (u: User) => {
    setUser(u)
    sessionStorage.setItem('user', JSON.stringify(u))
    try {
      const register = unwrap(await window.api.cashRegister.getCurrent())
      if (!register) setScreen('cash')
    } catch {
      setScreen('cash')
    }
  }

  const handleLogout = () => {
    setUser(null)
    sessionStorage.removeItem('user')
  }

  if (!user) return (
    <ErrorBoundary>
      <ToastProvider>
        <LoginScreen onLogin={handleLogin} />
      </ToastProvider>
    </ErrorBoundary>
  )

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
    <ErrorBoundary>
      <ToastProvider>
        <ConfirmProvider>
          <div style={{
            display: 'flex', height: '100vh', background: T.bg,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
          }}>

            {/* ── Sidebar ── */}
            <nav
              aria-label="Navegación principal"
              style={{
                width: collapsed ? 56 : 220,
                background: T.sidebar,
                borderRight: `1px solid ${T.sidebarB}`,
                display: 'flex',
                flexDirection: 'column',
                flexShrink: 0,
                transition: 'width 200ms ease',
                overflow: 'hidden',
              }}
            >
              {/* Logo + hamburger */}
              <div style={{
                padding: collapsed ? '14px 0' : '14px 12px 12px',
                display: 'flex', alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'space-between',
                borderBottom: `1px solid ${T.sidebarB}`,
              }}>
                {!collapsed && (
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.text, paddingLeft: 4 }}>
                    KioscoApp
                  </div>
                )}
                <button
                  onClick={() => setCollapsed(c => !c)}
                  aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
                  title={collapsed ? 'Expandir' : 'Colapsar'}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: T.sub, padding: 6, borderRadius: 6,
                    display: 'flex', alignItems: 'center',
                    transition: 'color 120ms',
                  }}
                >
                  {collapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
                </button>
              </div>

              {/* Nav items */}
              <div style={{ flex: 1, padding: '6px 6px', display: 'flex', flexDirection: 'column', gap: 1 }}>
                {NAV_ITEMS.filter(item => item.id !== 'settings' || user.role === 'OWNER').map(item => {
                  const active = screen === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => setScreen(item.id)}
                      aria-current={active ? 'page' : undefined}
                      title={collapsed ? item.label : undefined}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        gap: collapsed ? 0 : 10,
                        padding: collapsed ? '10px 0' : '8px 10px',
                        borderRadius: 6,
                        border: 'none',
                        cursor: 'pointer',
                        background: active ? `${T.primary}18` : 'transparent',
                        color: active ? T.text : T.sub,
                        fontSize: 13,
                        fontWeight: active ? 600 : 500,
                        textAlign: 'left',
                        transition: 'background 120ms, color 120ms',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                      }}
                    >
                      {item.icon}
                      {!collapsed && item.label}
                    </button>
                  )
                })}
              </div>

              {/* Sync indicator */}
              <div style={{
                padding: collapsed ? '6px 4px' : '6px 8px',
                borderTop: `1px solid ${T.sidebarB}`,
              }}>
                <SyncIndicator collapsed={collapsed} />
              </div>

              {/* User info + logout */}
              <div style={{
                padding: collapsed ? '10px 6px' : '10px 12px',
                borderTop: `1px solid ${T.sidebarB}`,
              }}>
                {!collapsed && (
                  <>
                    <div style={{ fontSize: 12, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>
                      {user.name}
                    </div>
                    <div style={{ fontSize: 11, color: T.sub, marginBottom: 8 }}>
                      {roleLabel[user.role] ?? user.role}
                    </div>
                  </>
                )}
                <button
                  onClick={handleLogout}
                  title={collapsed ? 'Cambiar usuario' : undefined}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    gap: collapsed ? 0 : 8,
                    padding: '6px 4px',
                    border: 'none',
                    cursor: 'pointer',
                    background: 'transparent',
                    color: T.sub,
                    fontSize: 12,
                    borderRadius: 4,
                  }}
                >
                  <LogOut size={14} />
                  {!collapsed && 'Cambiar usuario'}
                </button>
              </div>
            </nav>

            {/* ── Main ── */}
            <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              {renderScreen()}
            </main>
          </div>
        </ConfirmProvider>
      </ToastProvider>
    </ErrorBoundary>
  )
}
