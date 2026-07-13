export type CompetitionFormat = 'knockout' | 'round_robin'

export type Competition = {
  id: number          // = matches.competition_id / leagues.competition_id, = league id de api-sports
  name: string
  apiLeagueId: number
  season: number
  format: CompetitionFormat
  // false solo para competencias round_robin cuyo campeón se define por liguilla/playoff
  // en vez de posición en tabla — la predicción de campeón round_robin asume "líder de tabla
  // = campeón" (add_round_robin_champion_support.sql), así que dar esto en falso hasta
  // implementar soporte de liguilla.
  championSupported?: boolean
}

export const COMPETITIONS: Competition[] = [
  { id: 1, name: 'FIFA World Cup', apiLeagueId: 1, season: 2026, format: 'knockout' },
  { id: 39, name: 'Premier League', apiLeagueId: 39, season: 2026, format: 'round_robin' },
  { id: 140, name: 'La Liga', apiLeagueId: 140, season: 2026, format: 'round_robin' },
  { id: 135, name: 'Serie A', apiLeagueId: 135, season: 2026, format: 'round_robin' },
  { id: 162, name: 'Primera División de Costa Rica', apiLeagueId: 162, season: 2026, format: 'round_robin', championSupported: false },
]

export function getCompetition(id: number | null | undefined): Competition | null {
  if (id == null) return null
  return COMPETITIONS.find(c => c.id === id) ?? null
}

// Ligas viejas sin competition_id seteado son todas del Mundial (único torneo antes de esta migración)
export function getCompetitionFormat(id: number | null | undefined): CompetitionFormat {
  return getCompetition(id)?.format ?? 'knockout'
}

export function isChampionSupported(id: number | null | undefined): boolean {
  return getCompetition(id)?.championSupported ?? true
}
