import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { email, password } = await request.json()
  const cookieStore = await cookies()

  // Buffer para capturar las cookies que Supabase quiere setear
  const cookiesToSetBuffer: Array<{ name: string; value: string; options: CookieOptions }> = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cs: { name: string; value: string; options: CookieOptions }[]) { cookiesToSetBuffer.push(...cs) },
      },
    }
  )

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.user) {
    return NextResponse.json({ error: 'Email o contraseña incorrectos' }, { status: 401 })
  }

  const superAdmins = (process.env.SUPER_ADMIN_EMAILS ?? process.env.SUPER_ADMIN_EMAIL ?? '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  const isAdmin = superAdmins.includes((data.user.email ?? '').toLowerCase())

  // Verificar que el usuario tenga un local asignado (si no es admin)
  if (!isAdmin) {
    const { data: storeUser } = await supabase
      .from('store_users')
      .select('store_id')
      .eq('id', data.user.id)
      .single()

    if (!storeUser) {
      await supabase.auth.signOut()
      return NextResponse.json({ error: 'Tu cuenta no tiene un local asignado. Contactá al administrador.' }, { status: 403 })
    }
  }

  const response = NextResponse.json({ ok: true, isAdmin })
  cookiesToSetBuffer.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
  )
  return response
}
