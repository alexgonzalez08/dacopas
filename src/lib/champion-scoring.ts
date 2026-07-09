import { ChampionPrediction } from '@/types'
import { ChampionMatchLike } from '@/lib/champion-teams'

export type ChampionPredictionLike = Pick<ChampionPrediction,
  'champion_team' | 'finalist_team' | 'champion_score' | 'runner_up_score' | 'penalty_winner'
>

export function computeChampionResult(finalMatch: ChampionMatchLike) {
  const { home_team, away_team, home_score, away_score, penalty_home, penalty_away } = finalMatch
  if (home_score === null || away_score === null) return null

  let champion: string, runnerUp: string, championScore: number, runnerUpScore: number, wentToPenalties = false

  if (home_score > away_score) {
    champion = home_team; runnerUp = away_team
    championScore = home_score; runnerUpScore = away_score
  } else if (away_score > home_score) {
    champion = away_team; runnerUp = home_team
    championScore = away_score; runnerUpScore = home_score
  } else {
    wentToPenalties = true
    championScore = home_score; runnerUpScore = away_score
    if ((penalty_home ?? 0) > (penalty_away ?? 0)) {
      champion = home_team; runnerUp = away_team
    } else {
      champion = away_team; runnerUp = home_team
    }
  }
  return { champion, runnerUp, championScore, runnerUpScore, wentToPenalties }
}

export function computePoints(pred: ChampionPredictionLike, actual: NonNullable<ReturnType<typeof computeChampionResult>>) {
  const { champion, runnerUp, championScore, runnerUpScore, wentToPenalties } = actual

  // El ganador pronosticado se deriva siempre del marcador (como en cualquier partido).
  // Solo si predijo empate se usa penalty_winner para desempatar quién es el campeón.
  const predictedTie = pred.champion_score === pred.runner_up_score
  let predChampion: string, predRunnerUp: string
  if (predictedTie) {
    const flipped = pred.penalty_winner === 'runner_up'
    predChampion = flipped ? pred.finalist_team : pred.champion_team
    predRunnerUp = flipped ? pred.champion_team : pred.finalist_team
  } else if (pred.champion_score > pred.runner_up_score) {
    predChampion = pred.champion_team; predRunnerUp = pred.finalist_team
  } else {
    predChampion = pred.finalist_team; predRunnerUp = pred.champion_team
  }

  const championCorrect = predChampion === champion
  const finalistsCorrect = championCorrect && predRunnerUp === runnerUp
  const scoreExact = pred.champion_score === championScore && pred.runner_up_score === runnerUpScore
  const penaltyBonus = championCorrect && wentToPenalties && predictedTie

  if (!championCorrect) return { points: 0, label: 'No acertaste el campeón' }
  if (finalistsCorrect && scoreExact && penaltyBonus) return { points: 15, label: 'Campeón, finalistas y marcador exactos, y ganador en penales correcto' }
  if (finalistsCorrect && scoreExact) return { points: 12, label: 'Campeón, finalistas y marcador exactos' }
  if (finalistsCorrect && penaltyBonus) return { points: 10, label: 'Campeón y finalistas correctos, ganador en penales correcto' }
  if (finalistsCorrect) return { points: 8, label: 'Acertaste campeón y finalistas, marcador inexacto' }
  if (scoreExact && penaltyBonus) return { points: 5, label: 'Campeón y marcador exactos, y ganador en penales correcto' }
  if (scoreExact) return { points: 3, label: 'Campeón y marcador exactos' }
  if (penaltyBonus) return { points: 2, label: 'Campeón correcto y ganador en penales correcto' }
  return { points: 1, label: 'Acertaste el campeón' }
}
