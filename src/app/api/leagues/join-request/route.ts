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

  const { leagueId, leagueName } = await req.json()
  if (!leagueId || !leagueName) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const { data: league } = await adminClient
    .from('leagues').select('ended_at').eq('id', leagueId).single()
  if (league?.ended_at) {
    return NextResponse.json({ error: 'Este torneo ya finalizó y no admite nuevos participantes' }, { status: 400 })
  }

  const { data: profile } = await adminClient
    .from('profiles').select('username').eq('id', user.id).single()

  // Obtener admins con service role (bypass RLS)
  const { data: admins } = await adminClient
    .from('league_members')
    .select('user_id')
    .eq('league_id', leagueId)
    .eq('role', 'admin')
    .is('left_at', null)

  if (!admins?.length) return NextResponse.json({ sent: 0 })

  await Promise.all(admins.map(a =>
    adminClient.from('notifications').insert({
      user_id: a.user_id,
      from_user_id: user.id,
      type: 'join_request',
      metadata: {
        league_id: leagueId,
        league_name: leagueName,
        requester_username: profile?.username ?? '',
      },
    })
  ))

  return NextResponse.json({ sent: admins.length })
}
