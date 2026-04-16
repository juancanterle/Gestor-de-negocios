import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // Redirigir usuarios no autenticados fuera de rutas protegidas
  if (!user && (pathname.startsWith('/dashboard') || pathname.startsWith('/admin'))) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Redirigir usuarios autenticados fuera del login
  if (user && pathname === '/') {
    const dest = user.email === process.env.SUPER_ADMIN_EMAIL ? '/admin' : '/dashboard'
    return NextResponse.redirect(new URL(dest, request.url))
  }

  // Bloquear /admin para no-admins
  if (pathname.startsWith('/admin') && user?.email !== process.env.SUPER_ADMIN_EMAIL) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/admin/:path*'],
}
