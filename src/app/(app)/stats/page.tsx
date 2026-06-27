export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import StatsClient from './stats-client'

function calcPoints(
  pred: { home_score: number; away_score: number; penalty_winner: string | null },
  match: { home_score: number; away_score: number; penalty_home: number | null; penalty_away: number | null }
) {
  const ph = pred.home_score, pa = pred.away_score
  const mh = match.home_score, ma = match.away_score
  const penaltyWinner = match.penalty_home != null && match.penalty_away != null
    ? (match.penalty_home > match.penalty_away ? 'home' : 'away') : null
  const exactScore = ph === mh && pa === ma
  const predWinner = ph > pa ? 'home' : pa > ph ? 'away' : 'draw'
  const realWinner = mh > ma ? 'home' : ma > mh ? 'away' : 'draw'
  const correctPenalty = penaltyWinner !== null && pred.penalty_winner === penaltyWinner
  if (exactScore && correctPenalty) return 5
  if (exactScore) return 3
  if (correctPenalty) return 3
  if (predWinner === realWinner) return 1
  return 0
}

export default async function StatsPage() {
  const supabase = await createClient()
  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { data: matches } = await supabase
    .from('matches')
    .select('id, home_score, away_score, penalty_home, penalty_away')
    .eq('status', 'finished')

  const matchMap = new Map((matches ?? []).map(m => [m.id, m]))
  const finishedIds = [...matchMap.keys()]

  if (finishedIds.length === 0) {
    return (
      <div className="max-w-lg mx-auto space-y-6 pb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Estadísticas Globales</h1>
          <p className="text-sm text-slate-400 mt-1">Aún no hay partidos finalizados.</p>
        </div>
      </div>
    )
  }

  // Predicciones paginadas
  const PAGE = 1000
  let offset = 0
  const allPreds: any[] = []
  while (true) {
    const { data } = await adminSupabase
      .from('predictions')
      .select('user_id, match_id, home_score, away_score, penalty_winner')
      .in('match_id', finishedIds)
      .eq('status', 'locked')
      .order('user_id')
      .order('match_id')
      .range(offset, offset + PAGE - 1)
    if (!data || data.length === 0) break
    allPreds.push(...data)
    if (data.length < PAGE) break
    offset += PAGE
  }

  // Calcular puntos por usuario
  const userStats = new Map<string, { points: number; exact: number; winner: number; played: number }>()
  for (const pred of allPreds) {
    const match = matchMap.get(pred.match_id)
    if (!match || match.home_score == null) continue
    const pts = calcPoints(pred, match)
    const exact = pred.home_score === match.home_score && pred.away_score === match.away_score ? 1 : 0
    const predWinner = pred.home_score > pred.away_score ? 'home' : pred.away_score > pred.home_score ? 'away' : 'draw'
    const realWinner = match.home_score > match.away_score ? 'home' : match.away_score > match.home_score ? 'away' : 'draw'
    const winner = !exact && predWinner === realWinner ? 1 : 0
    const prev = userStats.get(pred.user_id) ?? { points: 0, exact: 0, winner: 0, played: 0 }
    userStats.set(pred.user_id, {
      points: prev.points + pts,
      exact: prev.exact + exact,
      winner: prev.winner + winner,
      played: prev.played + 1,
    })
  }

  const userIds = [...userStats.keys()]
  const { data: profiles } = await adminSupabase
    .from('profiles')
    .select('id, username, full_name, avatar_url')
    .in('id', userIds)

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))

  const leaderboard = [...userStats.entries()]
    .map(([uid, stats]) => {
      const profile = profileMap.get(uid)
      if (!profile) return null
      return { uid, ...stats, username: profile.username, full_name: profile.full_name, avatar_url: profile.avatar_url }
    })
    .filter(Boolean)
    .sort((a, b) => b!.points - a!.points || b!.exact - a!.exact || b!.winner - a!.winner)
    .map((e, i) => ({ ...e!, rank: i })) as any[]

  return (
    <div className="max-w-lg mx-auto space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Estadísticas Globales</h1>
        <p className="text-sm text-slate-400 mt-1">{leaderboard.length} jugadores · {finishedIds.length} partidos finalizados</p>
      </div>
      <StatsClient leaderboard={leaderboard} currentUserId={user!.id} />
    </div>
  )
}
