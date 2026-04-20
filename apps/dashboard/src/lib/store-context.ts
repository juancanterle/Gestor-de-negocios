import { createClient } from './supabase-server'
import { redirect } from 'next/navigation'

export async function requireStoreContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: storeUser } = await supabase
    .from('store_users')
    .select('store_id, stores(name)')
    .eq('id', user.id)
    .single()

  if (!storeUser) redirect('/')

  return {
    supabase,
    user,
    storeId: storeUser.store_id as string,
    storeName: ((storeUser.stores as { name?: string } | null)?.name ?? 'Mi local') as string,
  }
}

export const fmt = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`
export const fmtDate = (s: string) => new Date(s).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
