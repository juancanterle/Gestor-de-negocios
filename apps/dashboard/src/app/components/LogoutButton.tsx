'use client'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

export function LogoutButton({ style }: { style?: React.CSSProperties }) {
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <button onClick={handleLogout} style={style}>
      Salir
    </button>
  )
}
