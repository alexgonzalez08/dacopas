import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const { token, password } = await req.json()
  if (!token || !password) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
  if (password.length < 6) return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })

  const supabase = createAdminClient()

  // Verificar token
  const { data: row, error: fetchError } = await supabase
    .from('password_reset_tokens')
    .select('*')
    .eq('token', token)
    .single()

  if (fetchError || !row) return NextResponse.json({ error: 'Link inválido o expirado' }, { status: 400 })
  if (new Date(row.expires_at) < new Date()) {
    await supabase.from('password_reset_tokens').delete().eq('token', token)
    return NextResponse.json({ error: 'El link expiró, solicitá uno nuevo' }, { status: 400 })
  }

  // Buscar usuario por email (paginado para no perder usuarios)
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (listError) console.error('Error buscando usuario:', listError)
  const user = users?.find(u => u.email === row.email)
  if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  // Actualizar contraseña
  const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, { password })
  if (updateError) {
    console.error('Error actualizando contraseña:', updateError)
    return NextResponse.json({ error: 'Error al actualizar contraseña' }, { status: 500 })
  }

  // Eliminar token usado
  await supabase.from('password_reset_tokens').delete().eq('token', token)

  return NextResponse.json({ ok: true })
}
