export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import StatsClient from './stats-client'
import { COMPETITIONS } from '@/lib/competitions'
import { getFinalMatch, ChampionMatchLike } from '@/lib/champion-teams'
import { computeChampionResult, computePoints, ChampionPredictionLike } from '@/lib/champion-scoring'
import { calcStandings } from '@/lib/standings'

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

  // Solo mostrar competencias donde el usuario tiene al menos un torneo activo
  const { data: myMemberships } = await supabase
    .from('league_members')
    .select('leagues(competition_name)')
    .eq('user_id', user!.id)
    .is('left_at', null)
  const myCompetitionNames = new Set(
    (myMemberships ?? []).map(m => (m.leagues as any)?.competition_name ?? 'FIFA World Cup')
  )

  // Competencias = todas las que tienen al menos un torneo (activo o terminado) — así aparecen
  // aunque la temporada recién empiece, y no desaparecen cuando el torneo termina.
  const { data: allLeagues } = await adminSupabase
    .from('leagues')
    .select('id, competition_name')

  const leagueIdsByCompetition = new Map<string, string[]>()
  for (const l of allLeagues ?? []) {
    const key = l.competition_name ?? 'FIFA World Cup'
    if (!leagueIdsByCompetition.has(key)) leagueIdsByCompetition.set(key, [])
    leagueIdsByCompetition.get(key)!.push(l.id)
  }

  const allLeagueIds = (allLeagues ?? []).map(l => l.id)
  const { data: allMembers } = allLeagueIds.length > 0
    ? await adminSupabase
        .from('league_members')
        .select('league_id, user_id')
        .in('league_id', allLeagueIds)
        .is('left_at', null)
    : { data: [] }

  const membersByLeagueId = new Map<string, string[]>()
  for (const m of allMembers ?? []) {
    if (!membersByLeagueId.has(m.league_id)) membersByLeagueId.set(m.league_id, [])
    membersByLeagueId.get(m.league_id)!.push(m.user_id)
  }

  // Unión de todos los usuarios con torneo activo en cada competencia
  const userIdsByCompetition = new Map<string, Set<string>>()
  for (const [compName, leagueIds] of leagueIdsByCompetition) {
    const users = new Set<string>()
    for (const lid of leagueIds) {
      for (const uid of membersByLeagueId.get(lid) ?? []) users.add(uid)
    }
    userIdsByCompetition.set(compName, users)
  }

  if (myCompetitionNames.size === 0) {
    return (
      <div className="max-w-lg mx-auto space-y-6 pb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Estadísticas Globales</h1>
          <p className="text-sm text-slate-400 mt-1">Todavía no hay torneos activos.</p>
        </div>
      </div>
    )
  }

  const { data: allMatchesRaw } = await supabase
    .from('matches')
    .select('id, home_team, away_team, home_team_flag, away_team_flag, match_date, home_score, away_score, penalty_home, penalty_away, status, stage, competition_name')

  const matches = (allMatchesRaw ?? []).filter(m => m.status === 'finished')
  const matchMap = new Map(matches.map(m => [m.id, m]))
  const finishedIds = [...matchMap.keys()]

  const allMatchesByCompetition = new Map<string, ChampionMatchLike[]>()
  for (const m of allMatchesRaw ?? []) {
    const key = m.competition_name ?? 'FIFA World Cup'
    if (!allMatchesByCompetition.has(key)) allMatchesByCompetition.set(key, [])
    allMatchesByCompetition.get(key)!.push(m)
  }

  // Predicciones paginadas
  const PAGE = 1000
  let offset = 0
  const allPreds: any[] = []
  if (finishedIds.length > 0) {
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
  }

  // Agrupar partidos finalizados por competición
  const matchesByCompetition = new Map<string, typeof matches>()
  for (const m of matches ?? []) {
    const key = m.competition_name ?? 'FIFA World Cup'
    if (!matchesByCompetition.has(key)) matchesByCompetition.set(key, [])
    matchesByCompetition.get(key)!.push(m)
  }

  // Calcular stats por competición (puede quedar vacío si la competencia no tiene partidos finalizados todavía)
  const statsByCompetition = new Map<string, Map<string, { points: number; exact: number; winner: number; played: number }>>()

  for (const [compName, compMatches] of matchesByCompetition) {
    const compMatchIds = new Set(compMatches!.map(m => m.id))
    const userStats = new Map<string, { points: number; exact: number; winner: number; played: number }>()

    for (const pred of allPreds) {
      if (!compMatchIds.has(pred.match_id)) continue
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
    statsByCompetition.set(compName, userStats)
  }

  const allUserIds = new Set<string>()
  for (const users of userIdsByCompetition.values()) {
    for (const uid of users) allUserIds.add(uid)
  }

  // Bonus de predicción de campeón — mismo criterio que en el torneo (champion-scoring.ts),
  // sumado al puntaje base para que el número global no quede desalineado con lo que ve
  // el usuario en sus torneos.
  const { data: champPreds } = await adminSupabase
    .from('champion_predictions')
    .select('user_id, competition_name, champion_team, finalist_team, champion_score, runner_up_score, penalty_winner')
    .in('user_id', [...allUserIds])

  const champPredsByCompetition = new Map<string, typeof champPreds>()
  for (const cp of champPreds ?? []) {
    const key = cp.competition_name ?? 'FIFA World Cup'
    if (!champPredsByCompetition.has(key)) champPredsByCompetition.set(key, [])
    champPredsByCompetition.get(key)!.push(cp)
  }

  for (const [compName, userIds] of userIdsByCompetition) {
    if (!myCompetitionNames.has(compName)) continue
    const competition = COMPETITIONS.find(c => c.name === compName)
    if (competition?.championSupported === false) continue

    const compAllMatches = allMatchesByCompetition.get(compName) ?? []
    const compChampPreds = new Map((champPredsByCompetition.get(compName) ?? []).map(cp => [cp.user_id, cp]))
    if (compChampPreds.size === 0) continue

    const format = competition?.format ?? 'knockout'
    let championResult: ReturnType<typeof computeChampionResult> = null
    let standingsChampion: string | null = null

    if (format === 'knockout') {
      const finalMatch = getFinalMatch(compAllMatches, compName)
      if (finalMatch && finalMatch.status === 'finished') {
        championResult = computeChampionResult(finalMatch)
      }
    } else {
      const seasonFinished = compAllMatches.length > 0 && compAllMatches.every(m => m.status === 'finished')
      if (seasonFinished) {
        standingsChampion = calcStandings(compAllMatches)[0]?.team ?? null
      }
    }

    if (!championResult && !standingsChampion) continue

    const userStats = statsByCompetition.get(compName) ?? new Map()
    for (const uid of userIds) {
      const cp = compChampPreds.get(uid)
      if (!cp) continue
      const predLike: ChampionPredictionLike = {
        champion_team: cp.champion_team,
        finalist_team: cp.finalist_team,
        champion_score: cp.champion_score,
        runner_up_score: cp.runner_up_score,
        penalty_winner: cp.penalty_winner as 'champion' | 'runner_up' | null,
      }
      const bonus = championResult
        ? computePoints(predLike, championResult).points
        : (cp.champion_team === standingsChampion ? 8 : 0)
      if (bonus === 0) continue
      const prev = userStats.get(uid) ?? { points: 0, exact: 0, winner: 0, played: 0 }
      userStats.set(uid, { ...prev, points: prev.points + bonus })
    }
    statsByCompetition.set(compName, userStats)
  }

  const { data: profiles } = await adminSupabase
    .from('profiles')
    .select('id, username, full_name, avatar_url')
    .in('id', [...allUserIds])

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))

  function buildLeaderboard(
    userIds: Set<string>,
    userStats: Map<string, { points: number; exact: number; winner: number; played: number }>
  ) {
    return [...userIds]
      .map(uid => {
        const profile = profileMap.get(uid)
        if (!profile) return null
        const stats = userStats.get(uid) ?? { points: 0, exact: 0, winner: 0, played: 0 }
        return { uid, ...stats, username: profile.username, full_name: profile.full_name, avatar_url: profile.avatar_url }
      })
      .filter(Boolean)
      .sort((a, b) => b!.points - a!.points || b!.exact - a!.exact || b!.winner - a!.winner)
      .map((e, i) => ({ ...e!, rank: i })) as any[]
  }

  const competitions = [...userIdsByCompetition.entries()]
    .filter(([name]) => myCompetitionNames.has(name))
    .map(([name, userIds]) => ({
      name,
      matchCount: matchesByCompetition.get(name)?.length ?? 0,
      leaderboard: buildLeaderboard(userIds, statsByCompetition.get(name) ?? new Map()),
    }))

  return (
    <div className="max-w-lg mx-auto space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Estadísticas Globales</h1>
        <p className="text-sm text-slate-400 mt-1">{allUserIds.size} jugadores · {finishedIds.length} partidos finalizados</p>
      </div>
      <StatsClient competitions={competitions} currentUserId={user!.id} />
    </div>
  )
}
