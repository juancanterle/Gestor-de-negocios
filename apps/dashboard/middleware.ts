import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const isProd = process.env.NODE_ENV === 'production'

  const hardenCookie = (o: CookieOptions): CookieOptions => ({
    ...o,
    httpOnly: true,
    sameSite: 'strict',
    secure: isProd,
    path: '/',
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(
              name,
              value,
              hardenCookie(options) as Parameters<typeof supabaseResponse.cookies.set>[2]
            )
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  if (!user && (pathname.startsWith('/dashboard') || pathname.startsWith('/admin'))) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (user && pathname === '/') {
    const dest = user.email === process.env.SUPER_ADMIN_EMAIL ? '/admin' : '/dashboard'
    return NextResponse.redirect(new URL(dest, request.url))
  }

  if (pathname.startsWith('/admin') && user?.email !== process.env.SUPER_ADMIN_EMAIL) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Security headers generales
  supabaseResponse.headers.set('X-Frame-Options', 'DENY')
  supabaseResponse.headers.set('X-Content-Type-Options', 'nosniff')
  supabaseResponse.headers.set('Referrer-Policy', 'same-origin')

  return supabaseResponse
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/admin/:path*'],
}
