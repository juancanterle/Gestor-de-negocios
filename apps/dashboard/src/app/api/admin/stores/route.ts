import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('stores')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const { storeName, email, password } = await request.json()

  // 1. Crear el local
  const { data: store, error: storeError } = await supabaseAdmin
    .from('stores')
    .insert({ name: storeName })
    .select()
    .single()

  if (storeError) return NextResponse.json({ error: storeError.message }, { status: 500 })

  // 2. Crear usuario en Supabase Auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) {
    // Rollback: eliminar el local recién creado
    await supabaseAdmin.from('stores').delete().eq('id', store.id)
    return NextResponse.json({ error: authError.message }, { status: 500 })
  }

  // 3. Vincular usuario con el local
  const { error: linkError } = await supabaseAdmin.from('store_users').insert({
    id: authData.user.id,
    store_id: store.id,
    role: 'owner',
  })

  if (linkError) {
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
    await supabaseAdmin.from('stores').delete().eq('id', store.id)
    return NextResponse.json({ error: linkError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, store })
}
