import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const auth = request.cookies.get('dashboard_auth')
  if (!auth && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/', request.url))
  }
}

export const config = { matcher: ['/dashboard/:path*'] }
