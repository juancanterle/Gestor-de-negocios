import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { checkRateLimit, clientIp } from '@/lib/rate-limit'
import { verifySameOrigin } from '@/lib/csrf'

const LOGIN_WINDOW_MS = 15 * 60 * 1000
const LOGIN_MAX_ATTEMPTS = 5

export async function POST(request: Request) {
  if (!verifySameOrigin(request)) {
    return NextResponse.json({ error: 'Origen no permitido' }, { status: 403 })
  }

  const ip = clientIp(request)
  const rl = checkRateLimit(`login:${ip}`, { windowMs: LOGIN_WINDOW_MS, max: LOGIN_MAX_ATTEMPTS })
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Demasiados intentos. Probá de nuevo en ${Math.ceil(rl.retryAfterSec / 60)} min.` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    )
  }

  const { email, password } = await request.json().catch(() => ({}))
  if (!email || !password) {
    return NextResponse.json({ error: 'Email y contraseña son requeridos' }, { status: 400 })
  }

  const cookieStore = await cookies()
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

  if (!isAdmin) {
    const { data: storeUser } = await supabase
      .from('store_users')
      .select('store_id')
      .eq('id', data.user.id)
      .single()

    if (!storeUser) {
      await supabase.auth.signOut()
      return NextResponse.json(
        { error: 'Tu cuenta no tiene un local asignado. Contactá al administrador.' },
        { status: 403 }
      )
    }
  }

  const response = NextResponse.json({ ok: true, isAdmin })
  const isProd = process.env.NODE_ENV === 'production'
  cookiesToSetBuffer.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, {
      ...(options as Parameters<typeof response.cookies.set>[2]),
      httpOnly: true,
      sameSite: 'strict',
      secure: isProd,
      path: '/',
    })
  )
  return response
}
