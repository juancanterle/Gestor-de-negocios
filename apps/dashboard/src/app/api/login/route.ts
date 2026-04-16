import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { pin } = await req.json()
  if (pin === process.env.DASHBOARD_PIN) {
    const res = NextResponse.json({ ok: true })
    res.cookies.set('dashboard_auth', 'true', {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 días
    })
    return res
  }
  return NextResponse.json({ error: 'PIN incorrecto' }, { status: 401 })
}
