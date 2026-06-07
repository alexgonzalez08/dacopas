import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const adminClient = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId, targetUserId } = await req.json()
  if (!leagueId || !targetUserId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  // Verificar que quien hace el request es admin
  const { data: adminCheck } = await adminClient
    .from('league_members')
    .select('role')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .is('left_at', null)
    .single()

  if (adminCheck?.role !== 'admin') {
    return NextResponse.json({ error: 'Solo los admins pueden eliminar miembros' }, { status: 403 })
  }

  // No permitir eliminar a otro admin
  const { data: targetCheck } = await adminClient
    .from('league_members')
    .select('role')
    .eq('league_id', leagueId)
    .eq('user_id', targetUserId)
    .is('left_at', null)
    .single()

  if (targetCheck?.role === 'admin') {
    return NextResponse.json({ error: 'No podés eliminar a otro admin' }, { status: 403 })
  }

  // Soft delete: marcar left_at
  const { error } = await adminClient
    .from('league_members')
    .update({ left_at: new Date().toISOString() })
    .eq('league_id', leagueId)
    .eq('user_id', targetUserId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
