'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/dashboard',           label: 'Resumen' },
  { href: '/dashboard/products',  label: 'Productos' },
  { href: '/dashboard/purchases', label: 'Compras' },
  { href: '/dashboard/cash',      label: 'Caja' },
  { href: '/dashboard/reports',   label: 'Reportes' },
]

export function DashboardTabs() {
  const pathname = usePathname()
  return (
    <nav style={{
      display: 'flex', gap: 4, borderBottom: '1px solid var(--border)',
      overflowX: 'auto',
    }}>
      {TABS.map(t => {
        const active = pathname === t.href
        return (
          <Link
            key={t.href}
            href={t.href}
            style={{
              padding: '10px 14px',
              fontSize: 13,
              fontWeight: active ? 700 : 500,
              color: active ? 'var(--text-strong)' : 'var(--text-muted)',
              borderBottom: active ? '2px solid var(--brand-500)' : '2px solid transparent',
              textDecoration: 'none',
              marginBottom: -1,
              transition: 'color 0.12s',
              whiteSpace: 'nowrap',
            }}
          >
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}
