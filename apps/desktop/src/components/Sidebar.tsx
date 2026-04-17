import { useRef } from 'react'
import {
  ShoppingCart, Package, Truck, ShoppingBag,
  BarChart2, Settings, DollarSign, LogOut, Sparkles,
} from 'lucide-react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { color, radius, shadow, font } from '../ui'
import type { User } from '../types/api'

export type Screen =
  | 'pos' | 'products' | 'suppliers'
  | 'purchases' | 'cash' | 'reports' | 'settings'

type Section = 'op' | 'mg'
export const NAV: { id: Screen; label: string; icon: React.ReactNode; section: Section }[] = [
  { id: 'pos',       label: 'Vender',      icon: <ShoppingCart size={18} />, section: 'op' },
  { id: 'cash',      label: 'Caja',        icon: <DollarSign   size={18} />, section: 'op' },
  { id: 'products',  label: 'Productos',   icon: <Package      size={18} />, section: 'mg' },
  { id: 'purchases', label: 'Compras',     icon: <ShoppingBag  size={18} />, section: 'mg' },
  { id: 'suppliers', label: 'Proveedores', icon: <Truck        size={18} />, section: 'mg' },
  { id: 'reports',   label: 'Reportes',    icon: <BarChart2    size={18} />, section: 'mg' },
  { id: 'settings',  label: 'Config.',     icon: <Settings     size={18} />, section: 'mg' },
]

interface Props {
  user: User
  active: Screen
  onChange: (s: Screen) => void
  onLogout: () => void
}

const roleLabel = (r: User['role']) =>
  r === 'OWNER' ? 'Dueño' : r === 'MANAGER' ? 'Encargado' : 'Cajero'

const initials = (name: string) =>
  name.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '·'

export default function Sidebar({ user, active, onChange, onLogout }: Props) {
  const root = useRef<HTMLElement>(null)

  useGSAP(() => {
    const logo = root.current?.querySelector('[data-logo]')
    const items = root.current?.querySelectorAll('[data-nav-item]')
    if (logo) gsap.from(logo, { x: -16, opacity: 0, duration: 0.5, ease: 'power2.out' })
    if (items) gsap.from(items, {
      x: -10, opacity: 0, duration: 0.4, stagger: 0.04, ease: 'power2.out',
    })
  }, { scope: root })

  const opItems = NAV.filter(i => i.section === 'op')
  const mgItems = NAV.filter(i => i.section === 'mg')

  return (
    <nav ref={root} style={S.root}>
      <div data-logo style={S.head}>
        <div style={S.logo}>
          <Sparkles size={20} color="#fff" />
        </div>
        <div>
          <div style={S.brand}>KioscoApp</div>
          <div style={S.stamp}>Kiosco 04</div>
        </div>
      </div>

      <SectionLabel>Operación</SectionLabel>
      {opItems.map(item => (
        <NavItem
          key={item.id}
          item={item}
          active={active === item.id}
          onClick={() => onChange(item.id)}
        />
      ))}

      <SectionLabel>Gestión</SectionLabel>
      {mgItems.map(item => (
        <NavItem
          key={item.id}
          item={item}
          active={active === item.id}
          onClick={() => onChange(item.id)}
        />
      ))}

      <div style={{ flex: 1 }} />

      <div style={S.userCard}>
        <div style={S.avatar}>{initials(user.name)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={S.userName}>{user.name}</div>
          <div style={S.userRole}>{roleLabel(user.role)} · Tarde</div>
        </div>
        <button onClick={onLogout} title="Cerrar sesión" style={S.logoutBtn}>
          <LogOut size={16} />
        </button>
      </div>
    </nav>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={S.sectionLbl}>{children}</div>
  )
}

function NavItem({ item, active, onClick }: {
  item: { id: Screen; label: string; icon: React.ReactNode }
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      data-nav-item
      onClick={onClick}
      style={{
        ...S.navBtn,
        background: active ? color.activeGrad : 'transparent',
        color: active ? color.textStrong : color.mutedFaint,
        paddingLeft: active ? 8 : 10,
        borderLeft: active ? `2px solid ${color.brand}` : '2px solid transparent',
        fontWeight: active ? 600 : 500,
      }}
      onMouseEnter={e => {
        if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
      }}
      onMouseLeave={e => {
        if (!active) e.currentTarget.style.background = 'transparent'
      }}
    >
      <span style={{
        ...S.iconBox,
        color: active ? color.brand400 : color.mutedFaint,
      }}>
        {item.icon}
      </span>
      <span>{item.label}</span>
    </button>
  )
}

const S: Record<string, React.CSSProperties> = {
  root: {
    width: 232, flexShrink: 0,
    background: color.bgSidebar,
    borderRight: `1px solid ${color.border}`,
    display: 'flex', flexDirection: 'column',
    padding: '20px 14px',
  },
  head: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '6px 8px 22px',
  },
  logo: {
    width: 36, height: 36, borderRadius: radius.lg,
    background: color.logoGrad,
    display: 'grid', placeItems: 'center',
    boxShadow: shadow.glowBrand,
    flexShrink: 0,
  },
  brand: {
    color: color.textStrong, fontSize: 16, fontWeight: 700, letterSpacing: -0.2,
  },
  stamp: {
    color: color.mutedDeep, fontSize: 10, marginTop: 1,
    letterSpacing: 1.3, textTransform: 'uppercase', fontWeight: 700,
    fontFamily: font.mono,
  },
  sectionLbl: {
    fontSize: 10, color: color.mutedFaint,
    textTransform: 'uppercase', fontWeight: 700, letterSpacing: 1.5,
    padding: '14px 10px 6px',
  },
  navBtn: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '9px 10px',
    borderRadius: radius.md,
    border: 'none', cursor: 'pointer',
    fontSize: 13, textAlign: 'left',
    fontFamily: 'inherit',
    transition: 'background 0.15s, color 0.15s, padding-left 0.15s, border-color 0.15s',
  },
  iconBox: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 20, height: 20,
    transition: 'color 0.15s',
  },

  userCard: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 8px',
    borderTop: `1px solid ${color.border}`,
    marginTop: 12, paddingTop: 14,
  },
  avatar: {
    width: 32, height: 32, borderRadius: '50%',
    background: 'linear-gradient(135deg, #6366f1, #818cf8)',
    display: 'grid', placeItems: 'center',
    fontSize: 12, fontWeight: 700, color: '#fff',
    flexShrink: 0,
  },
  userName: {
    fontSize: 13, color: color.text, fontWeight: 500,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  userRole: {
    fontSize: 10, color: color.mutedDeep, marginTop: 1,
    fontFamily: font.mono, letterSpacing: 0.2, textTransform: 'uppercase',
  },
  logoutBtn: {
    background: 'transparent', border: 'none', cursor: 'pointer',
    color: color.mutedDeep, padding: 6, borderRadius: radius.sm,
    display: 'flex', alignItems: 'center',
    flexShrink: 0,
  },
}
