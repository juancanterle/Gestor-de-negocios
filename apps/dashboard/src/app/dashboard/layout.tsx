import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { LogoutButton } from '@/app/components/LogoutButton'
import { DashboardTabs } from './DashboardTabs'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: storeUser } = await supabase
    .from('store_users')
    .select('store_id, stores(name)')
    .eq('id', user.id)
    .single()

  if (!storeUser) redirect('/')

  const storeName = (storeUser.stores as { name?: string } | null)?.name ?? 'Mi local'

  return (
    <div className="page" style={{ background: 'var(--bg)' }}>
      <header style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: 16,
      }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Local</div>
          <h1 style={{
            margin: '2px 0 0', fontSize: 22, fontWeight: 700,
            color: 'var(--text-strong)', letterSpacing: '-0.2px',
          }}>
            <Link href="/dashboard" style={{ color: 'inherit', textDecoration: 'none' }}>
              {storeName}
            </Link>
          </h1>
        </div>
        <LogoutButton style={{
          fontSize: 12, color: 'var(--text-muted)', background: 'var(--surface)',
          border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px',
          cursor: 'pointer', fontWeight: 500,
        }} />
      </header>

      <DashboardTabs />

      <main style={{ marginTop: 20 }}>{children}</main>
    </div>
  )
}
