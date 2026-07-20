import { SupabaseClient } from '@supabase/supabase-js'
import { sendPushToUsers } from '@/lib/push-server'

// Termina un torneo: marca ended_at, notifica (in-app + push + feed) a los miembros con el top 3.
// `excludeUserId` es quien lo terminó manualmente (no se notifica a sí mismo) — null cuando lo
// termina el sistema automáticamente (ej. al terminar la final del Mundial), en cuyo caso se
// notifica a todos los miembros.
export async function endLeague(admin: SupabaseClient, leagueId: string, excludeUserId: string | null = null) {
  const { data: league } = await admin
    .from('leagues')
    .select('id, name')
    .eq('id', leagueId)
    .single()

  if (!league) return null

  await admin.from('leagues').update({ ended_at: new Date().toISOString() }).eq('id', leagueId)

  const { data: members } = await admin
    .from('league_members')
    .select('user_id')
    .eq('league_id', leagueId)
    .is('left_at', null)

  const { data: points } = await admin
    .from('league_points')
    .select('user_id, points, champion_points, exact_results, correct_winner, profiles(username, avatar_url)')
    .eq('league_id', leagueId)

  const top3 = (points ?? [])
    .map(p => ({ ...p, total: p.points + (p.champion_points ?? 0) }))
    .sort((a, b) => b.total - a.total || b.exact_results - a.exact_results || b.correct_winner - a.correct_winner)
    .slice(0, 3)
    .map((p, i) => ({
      rank: i + 1,
      user_id: p.user_id,
      username: (p.profiles as any)?.username ?? 'Usuario',
      avatar_url: (p.profiles as any)?.avatar_url ?? null,
      points: p.total,
      exact_results: p.exact_results,
      correct_winner: p.correct_winner,
    }))

  const memberIds = (members ?? []).map(m => m.user_id).filter(id => id !== excludeUserId)

  if (memberIds.length > 0) {
    await Promise.all(memberIds.map(memberId =>
      admin.from('notifications').insert({
        user_id: memberId,
        from_user_id: excludeUserId,
        type: 'league_ended',
        metadata: { league_id: leagueId, league_name: league.name, top3 },
      })
    ))

    const winner = top3[0]
    await sendPushToUsers({
      userIds: memberIds,
      title: `🏆 Torneo "${league.name}" finalizado`,
      body: winner
        ? `¡${winner.username} ganó con ${winner.points} puntos!`
        : 'El torneo ha terminado. ¡Mirá los resultados finales!',
      data: { url: `/leagues/${leagueId}`, tag: `league-ended-${leagueId}`, image: 'https://www.dacopas.com/og-image.png' },
    })

    await Promise.all(memberIds.map(memberId =>
      admin.from('feed_events').insert({
        user_id: memberId,
        type: 'league_ended',
        league_id: leagueId,
        metadata: { league_name: league.name, top3 },
      })
    ))
  }

  return top3
}
