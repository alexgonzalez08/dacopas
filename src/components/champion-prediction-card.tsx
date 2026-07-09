'use client'
import { useState } from 'react'
import { upsertChampionPrediction } from '@/lib/champion-predictions'
import { ChampionPrediction, Match } from '@/types'
import TeamFlag from '@/components/team-flag'
import { Lock } from 'lucide-react'

type Team = { name: string; flag: string | null }

function computeChampionResult(finalMatch: Match) {
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

function computePoints(pred: ChampionPrediction, actual: NonNullable<ReturnType<typeof computeChampionResult>>) {
  const { champion, runnerUp, championScore, runnerUpScore, wentToPenalties } = actual
  const scoreExact = pred.champion_score === championScore && pred.runner_up_score === runnerUpScore
  const finalistsCorrect = pred.champion_team === champion && pred.finalist_team === runnerUp

  if (finalistsCorrect && scoreExact && (!wentToPenalties || pred.penalty_winner === 'champion')) {
    return { points: 12, label: 'Campeón, marcador y penales exactos' }
  }
  if (finalistsCorrect && scoreExact) {
    return { points: 10, label: 'Campeón, marcador exacto y finalistas correctos' }
  }
  if (finalistsCorrect) {
    return { points: 8, label: 'Acertaste campeón y finalistas, marcador inexacto' }
  }
  if (pred.champion_team === champion) {
    return { points: 5, label: 'Acertaste el campeón' }
  }
  if (pred.finalist_team === champion && pred.champion_team === runnerUp) {
    return { points: 1, label: 'Acertaste los 2 finalistas, pero invertidos' }
  }
  return { points: 0, label: 'Sin aciertos' }
}

export default function ChampionPredictionCard({
  userId,
  competitionName,
  teams,
  finalMatch,
  prediction,
}: {
  userId: string
  competitionName: string
  teams: Team[]
  finalMatch: Match | null
  prediction: ChampionPrediction | null
}) {
  const sortedTeams = [...teams].sort((a, b) => a.name.localeCompare(b.name))

  const [championTeam, setChampionTeam] = useState(prediction?.champion_team ?? '')
  const [finalistTeam, setFinalistTeam] = useState(prediction?.finalist_team ?? '')
  const [championScore, setChampionScore] = useState(prediction ? String(prediction.champion_score) : '')
  const [runnerUpScore, setRunnerUpScore] = useState(prediction ? String(prediction.runner_up_score) : '')
  const [penaltyWinner, setPenaltyWinner] = useState<'champion' | 'runner_up' | null>(prediction?.penalty_winner ?? null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [hasPrediction, setHasPrediction] = useState(!!prediction)

  const locked = prediction?.status === 'locked'
  const actualResult = finalMatch && finalMatch.status === 'finished' ? computeChampionResult(finalMatch) : null

  const champNum = parseInt(championScore)
  const runnerNum = parseInt(runnerUpScore)
  const showPenalty = !isNaN(champNum) && !isNaN(runnerNum) && champNum === runnerNum && !!championTeam && !!finalistTeam

  async function handleSave() {
    if (!championTeam || !finalistTeam) {
      setError('Elegí campeón y finalista')
      return
    }
    const cs = parseInt(championScore)
    const rs = parseInt(runnerUpScore)
    if (isNaN(cs) || isNaN(rs) || cs < 0 || rs < 0) {
      setError('Ingresá un marcador válido')
      return
    }
    if (cs === rs && !penaltyWinner) {
      setError('Seleccioná el ganador en penales')
      return
    }
    setSaving(true)
    setError('')
    try {
      await upsertChampionPrediction(
        userId, competitionName, championTeam, finalistTeam, cs, rs, cs === rs ? penaltyWinner : null
      )
      setHasPrediction(true)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const result = actualResult && prediction ? computePoints(prediction, actualResult) : null

  return (
    <div className="mx-3 mb-3 rounded-xl p-4 bg-slate-800 border border-yellow-500/35">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">🏆</span>
        <span className="text-sm font-semibold text-yellow-400">Predicción Campeón del Mundial</span>
      </div>

      {actualResult && (
        <div className="mb-3 p-2.5 rounded-lg bg-green-500/10 border border-green-500/30">
          <p className="text-xs font-semibold text-green-400">
            Campeón real: {actualResult.champion} ({actualResult.championScore}-{actualResult.runnerUpScore} {actualResult.runnerUp}{actualResult.wentToPenalties ? ', penales' : ''})
          </p>
          {result && (
            <p className="text-xs text-green-300 mt-0.5">
              {result.label} <span className="text-yellow-400 font-bold">+{result.points} pts</span>
            </p>
          )}
          {!prediction && (
            <p className="text-xs text-slate-400 mt-0.5">No hiciste esta predicción</p>
          )}
        </div>
      )}

      {!actualResult && locked && (
        <div className="flex items-center gap-2 mb-3 px-2.5 py-2 rounded-lg bg-slate-700/40">
          <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-xs text-slate-400">Bloqueado: está por comenzar la primera semifinal</span>
        </div>
      )}

      {!actualResult && (
        <>
          <div className="flex gap-2 mb-3">
            <div className="flex-1">
              <label className="text-[10px] text-slate-500 block mb-1">Campeón</label>
              <select
                disabled={locked}
                value={championTeam}
                onChange={e => setChampionTeam(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-xs text-white disabled:opacity-50"
              >
                <option value="">Elegí un equipo</option>
                {sortedTeams.filter(t => t.name !== finalistTeam).map(t => (
                  <option key={t.name} value={t.name}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-slate-500 block mb-1">Otro finalista</label>
              <select
                disabled={locked}
                value={finalistTeam}
                onChange={e => setFinalistTeam(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-xs text-white disabled:opacity-50"
              >
                <option value="">Elegí un equipo</option>
                {sortedTeams.filter(t => t.name !== championTeam).map(t => (
                  <option key={t.name} value={t.name}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          {championTeam && finalistTeam && (
            <div className="flex items-center justify-center gap-3 mb-2">
              <TeamFlag name={championTeam} size="sm" showName={false} />
              <div className="flex items-center gap-2">
                <input
                  type="number" min="0" max="20" disabled={locked}
                  value={championScore}
                  onChange={e => setChampionScore(e.target.value)}
                  className="w-11 text-center bg-slate-700 border border-slate-600 rounded-lg py-1.5 text-sm font-bold text-white disabled:opacity-50"
                />
                <span className="text-slate-500 font-bold">-</span>
                <input
                  type="number" min="0" max="20" disabled={locked}
                  value={runnerUpScore}
                  onChange={e => setRunnerUpScore(e.target.value)}
                  className="w-11 text-center bg-slate-700 border border-slate-600 rounded-lg py-1.5 text-sm font-bold text-white disabled:opacity-50"
                />
              </div>
              <TeamFlag name={finalistTeam} size="sm" showName={false} />
            </div>
          )}

          {showPenalty && (
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="text-[10px] text-slate-500">Penales:</span>
              <button
                type="button" disabled={locked}
                onClick={() => setPenaltyWinner('champion')}
                className={`flex items-center justify-center px-2 py-1 rounded-md border transition ${penaltyWinner === 'champion' ? 'border-yellow-500' : 'border-slate-600 opacity-60'}`}
              >
                <TeamFlag name={championTeam} size="sm" showName={false} />
              </button>
              <button
                type="button" disabled={locked}
                onClick={() => setPenaltyWinner('runner_up')}
                className={`flex items-center justify-center px-2 py-1 rounded-md border transition ${penaltyWinner === 'runner_up' ? 'border-yellow-500' : 'border-slate-600 opacity-60'}`}
              >
                <TeamFlag name={finalistTeam} size="sm" showName={false} />
              </button>
            </div>
          )}

          {error && <p className="text-xs text-red-400 text-center mb-2">{error}</p>}

          <button
            onClick={!locked ? handleSave : undefined}
            disabled={locked || saving}
            className={`w-full py-1.5 text-sm font-semibold rounded-lg transition ${locked ? 'bg-slate-600 text-slate-400 cursor-default' : 'bg-yellow-500 text-slate-900 hover:bg-yellow-400 disabled:opacity-50'}`}
          >
            {locked ? 'Enviado' : saving ? 'Guardando...' : saved ? '✓ Guardado' : hasPrediction ? 'Modificar' : 'Guardar'}
          </button>
        </>
      )}
    </div>
  )
}
