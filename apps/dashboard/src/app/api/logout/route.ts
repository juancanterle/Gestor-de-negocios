import { NextResponse } from 'next/server'

export async function POST() {
  const res = NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost:3000'))
  res.cookies.delete('dashboard_auth')
  return res
}
