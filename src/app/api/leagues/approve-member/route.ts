import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId, targetUserId } = await req.json()
  if (!leagueId || !targetUserId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  // Verificar que quien aprueba es admin
  const { data: adminCheck } = await adminClient
    .from('league_members').select('role')
    .eq('league_id', leagueId).eq('user_id', user.id).is('left_at', null).single()

  if (adminCheck?.role !== 'admin') {
    return NextResponse.json({ error: 'Solo los admins pueden aprobar solicitudes' }, { status: 403 })
  }

  // Verificar si ya es miembro activo
  const { data: existing } = await adminClient
    .from('league_members').select('user_id, left_at')
    .eq('league_id', leagueId).eq('user_id', targetUserId).maybeSingle()

  if (existing && !existing.left_at) {
    return NextResponse.json({ alreadyMember: true })
  }

  if (existing?.left_at) {
    // Reactivar membresía
    await adminClient.from('league_members')
      .update({ left_at: null, role: 'participant' })
      .eq('league_id', leagueId).eq('user_id', targetUserId)
  } else {
    // Nuevo miembro
    await adminClient.from('league_members')
      .insert({ league_id: leagueId, user_id: targetUserId, role: 'participant' })
  }

  return NextResponse.json({ ok: true, alreadyMember: false })
}
