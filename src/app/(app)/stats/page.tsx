export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import UserAvatar from '@/components/user-avatar'

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

  // Partidos finished
  const { data: matches } = await supabase
    .from('matches')
    .select('id, home_score, away_score, penalty_home, penalty_away')
    .eq('status', 'finished')

  const matchMap = new Map((matches ?? []).map(m => [m.id, m]))
  const finishedIds = [...matchMap.keys()]

  if (finishedIds.length === 0) {
    return (
      <div className="max-w-lg mx-auto pt-12 text-center text-slate-500 text-sm">
        Aún no hay partidos finalizados.
      </div>
    )
  }

  // Predicciones locked de partidos finished — paginado
  const PAGE = 1000
  let offset = 0
  const allPreds: any[] = []
  while (true) {
    const { data } = await adminSupabase
      .from('predictions')
      .select('user_id, match_id, home_score, away_score, penalty_winner')
      .in('match_id', finishedIds)
      .eq('status', 'locked')
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

  // Perfiles
  const userIds = [...userStats.keys()]
  const { data: profiles } = await adminSupabase
    .from('profiles')
    .select('id, username, full_name, avatar_url')
    .in('id', userIds)

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))

  const leaderboard = [...userStats.entries()]
    .map(([uid, stats]) => ({ uid, ...stats, profile: profileMap.get(uid) }))
    .filter(e => e.profile)
    .sort((a, b) => b.points - a.points || b.exact - a.exact || b.winner - a.winner)

  const MEDAL_STYLES = [
    { medal: '🥇', bg: 'bg-yellow-500/10 border-yellow-500/30' },
    { medal: '🥈', bg: 'bg-slate-700/50 border-slate-600/30' },
    { medal: '🥉', bg: 'bg-amber-700/10 border-amber-600/30' },
  ]

  return (
    <div className="max-w-lg mx-auto space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Estadísticas</h1>
        <p className="text-sm text-slate-400 mt-1">Tabla de posiciones global · {leaderboard.length} jugadores</p>
      </div>

      <div className="space-y-2">
        {leaderboard.map((entry, i) => {
          const style = MEDAL_STYLES[i] ?? { medal: null, bg: 'bg-slate-800 border-slate-700/50' }
          return (
            <div key={entry.uid} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${style.bg}`}>
              <span className="w-6 text-center shrink-0">
                {style.medal ?? <span className="text-xs text-slate-500 font-bold">#{i + 1}</span>}
              </span>
              <UserAvatar
                username={entry.profile!.username}
                avatarUrl={entry.profile!.avatar_url}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {entry.profile!.full_name || entry.profile!.username}
                </p>
                <p className="text-xs text-slate-500">
                  {entry.exact} exactos · {entry.winner} ganador · {entry.played} jugados
                </p>
              </div>
              <span className="text-lg font-bold text-yellow-400 shrink-0">{entry.points} pts</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
