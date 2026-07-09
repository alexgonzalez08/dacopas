import { Match } from '@/types'

export type ChampionMatchLike = Pick<Match,
  'home_team' | 'away_team' | 'home_team_flag' | 'away_team_flag' | 'match_date' |
  'stage' | 'status' | 'home_score' | 'away_score' | 'penalty_home' | 'penalty_away' | 'competition_name'
>

const TEAM_SOURCE_STAGES = ['quarter', 'round_of_16', 'round_of_32', 'group'] as const

function compKey(m: Pick<ChampionMatchLike, 'competition_name'>) {
  return m.competition_name ?? 'FIFA World Cup'
}

export function getActiveCompetition(matches: ChampionMatchLike[]): string | null {
  const byCompetition = new Map<string, ChampionMatchLike[]>()
  matches.forEach(m => {
    const key = compKey(m)
    if (!byCompetition.has(key)) byCompetition.set(key, [])
    byCompetition.get(key)!.push(m)
  })
  const competitionList = [...byCompetition.keys()]
  if (competitionList.length === 0) return null

  const todayStr = new Date().toLocaleDateString('en-CA')
  const matchDay = (date: string) => new Date(date).toLocaleDateString('en-CA')
  return competitionList.find(c => byCompetition.get(c)!.some(m => matchDay(m.match_date) >= todayStr))
    ?? competitionList[competitionList.length - 1]
}

// Equipos de la fase más avanzada que ya tenga partidos cargados para esa competición
export function getTeamsForCompetition(matches: ChampionMatchLike[], competitionName: string) {
  const compMatches = matches.filter(m => compKey(m) === competitionName)
  for (const stage of TEAM_SOURCE_STAGES) {
    const stageMatches = compMatches.filter(m => m.stage === stage)
    if (stageMatches.length === 0) continue
    const teamMap = new Map<string, string | null>()
    stageMatches.forEach(m => {
      teamMap.set(m.home_team, m.home_team_flag)
      teamMap.set(m.away_team, m.away_team_flag)
    })
    return [...teamMap.entries()].map(([name, flag]) => ({ name, flag }))
  }
  return []
}

export function getFinalMatch(matches: ChampionMatchLike[], competitionName: string): ChampionMatchLike | null {
  return matches.find(m => compKey(m) === competitionName && m.stage === 'final') ?? null
}
