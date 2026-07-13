export type CompetitionFormat = 'knockout' | 'round_robin'

export type Competition = {
  id: number          // = matches.competition_id / leagues.competition_id, = league id de api-sports
  name: string
  apiLeagueId: number
  season: number
  format: CompetitionFormat
}

export const COMPETITIONS: Competition[] = [
  { id: 1, name: 'FIFA World Cup', apiLeagueId: 1, season: 2026, format: 'knockout' },
  { id: 39, name: 'Premier League', apiLeagueId: 39, season: 2026, format: 'round_robin' },
  { id: 140, name: 'La Liga', apiLeagueId: 140, season: 2026, format: 'round_robin' },
]

export function getCompetition(id: number | null | undefined): Competition | null {
  if (id == null) return null
  return COMPETITIONS.find(c => c.id === id) ?? null
}

// Ligas viejas sin competition_id seteado son todas del Mundial (único torneo antes de esta migración)
export function getCompetitionFormat(id: number | null | undefined): CompetitionFormat {
  return getCompetition(id)?.format ?? 'knockout'
}
