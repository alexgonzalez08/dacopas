import { CompetitionFormat } from './competitions'

type LockMatch = { stage: string | null; matchday: number | null; match_date: string }

// Mismo criterio usado por el RPC sync_champion_predictions() para bloquear las predicciones
// de los usuarios — se usa acá también para saber cuándo el admin ya no puede togglear
// champion_prediction_enabled en la gestión del torneo.
export function isChampionLockPassed(matches: LockMatch[], format: CompetitionFormat): boolean {
  const now = Date.now()

  if (format === 'round_robin') {
    const matchdays = matches.map(m => m.matchday).filter((d): d is number => d != null)
    if (matchdays.length === 0) return false
    const maxMatchday = Math.max(...matchdays)
    const checkpoint = Math.ceil(maxMatchday / 2)
    const checkpointMatches = matches.filter(m => m.matchday === checkpoint)
    if (checkpointMatches.length === 0) return false
    const minDate = Math.min(...checkpointMatches.map(m => new Date(m.match_date).getTime()))
    return minDate <= now
  }

  // knockout: se bloquea 15 min antes de que arranque la primera semifinal
  const semis = matches.filter(m => m.stage === 'semi')
  if (semis.length < 2) return false
  const firstSemiDate = Math.min(...semis.map(m => new Date(m.match_date).getTime()))
  return firstSemiDate <= now + 15 * 60 * 1000
}
