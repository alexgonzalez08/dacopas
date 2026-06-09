import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await req.json()
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verificar que el usuario es admin del torneo
  const { data: member } = await admin
    .from('league_members')
    .select('role')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .single()

  if (member?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Obtener info del torneo
  const { data: league } = await admin
    .from('leagues')
    .select('id, name')
    .eq('id', leagueId)
    .single()

  if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 })
  if ((league as any).ended_at) return NextResponse.json({ error: 'Ya terminado' }, { status: 400 })

  // Terminar el torneo
  await admin.from('leagues').update({ ended_at: new Date().toISOString() }).eq('id', leagueId)

  // Obtener todos los miembros activos
  const { data: members } = await admin
    .from('league_members')
    .select('user_id, profiles(username, full_name, avatar_url)')
    .eq('league_id', leagueId)
    .is('left_at', null)

  // Obtener top 3 leaderboard
  const { data: points } = await admin
    .from('league_points')
    .select('user_id, points, exact_results, correct_winner, profiles(username, avatar_url)')
    .eq('league_id', leagueId)
    .order('points', { ascending: false })
    .limit(3)

  const top3 = (points ?? []).map((p, i) => ({
    rank: i + 1,
    user_id: p.user_id,
    username: (p.profiles as any)?.username ?? 'Usuario',
    avatar_url: (p.profiles as any)?.avatar_url ?? null,
    points: p.points,
    exact_results: p.exact_results,
    correct_winner: p.correct_winner,
  }))

  const memberIds = (members ?? []).map(m => m.user_id)

  // Notificaciones in-app + push a todos los miembros
  if (memberIds.length > 0) {
    await Promise.all(memberIds.map(memberId =>
      admin.from('notifications').insert({
        user_id: memberId,
        from_user_id: user.id,
        type: 'league_ended',
        metadata: {
          league_id: leagueId,
          league_name: league.name,
          top3,
        },
      })
    ))

    // Push notifications
    const { data: tokens } = await admin
      .from('push_tokens')
      .select('token, platform')
      .in('user_id', memberIds)

    if (tokens && tokens.length > 0) {
      const FCM_URL = 'https://fcm.googleapis.com/v1/projects/dacopas-app/messages:send'
      const accessToken = process.env.FCM_ACCESS_TOKEN ?? ''

      const winner = top3[0]
      const title = `🏆 Torneo "${league.name}" finalizado`
      const body = winner
        ? `¡${winner.username} ganó el torneo con ${winner.points} puntos!`
        : 'El torneo ha terminado. ¡Mirá los resultados finales!'

      await Promise.all(tokens.map(({ token, platform }) => {
        const message: any = {
          token,
          notification: { title, body },
          data: { url: `/leagues/${leagueId}`, type: 'league_ended' },
          android: {
            notification: {
              title, body,
              image: 'https://dacopas.com/logo.png',
              click_action: 'FLUTTER_NOTIFICATION_CLICK',
            },
          },
          apns: {
            headers: { 'apns-priority': '10' },
            payload: { aps: { alert: { title, body }, sound: 'default', badge: 1 } },
          },
        }
        return fetch(`${FCM_URL}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ message }),
        })
      }))
    }
  }

  // Feed event glamoroso para cada miembro
  if (memberIds.length > 0) {
    await Promise.all(memberIds.map(memberId =>
      admin.from('feed_events').insert({
        user_id: memberId,
        type: 'league_ended',
        league_id: leagueId,
        metadata: {
          league_name: league.name,
          top3,
        },
      })
    ))
  }

  return NextResponse.json({ ok: true, top3 })
}
