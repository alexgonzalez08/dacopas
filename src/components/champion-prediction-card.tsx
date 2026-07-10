'use client'
import { useState } from 'react'
import { upsertChampionPrediction } from '@/lib/champion-predictions'
import { ChampionPrediction } from '@/types'
import { ChampionMatchLike } from '@/lib/champion-teams'
import { computeChampionResult, computePoints } from '@/lib/champion-scoring'
import TeamFlag from '@/components/team-flag'
import ChampionVsFinalInfoModal from '@/components/champion-vs-final-info-modal'
import ChampionRulesModal from '@/components/champion-rules-modal'
import { Lock } from 'lucide-react'

type Team = { name: string; flag: string | null }

export default function ChampionPredictionCard({
  userId,
  competitionName,
  teams,
  finalMatch,
  prediction,
  className = 'mx-3 mb-3',
}: {
  userId: string
  competitionName: string
  teams: Team[]
  finalMatch: ChampionMatchLike | null
  prediction: ChampionPrediction | null
  className?: string
}) {
  // Asegura que el equipo ya guardado en la predicción aparezca como opción,
  // aunque la lista de equipos disponible en esta pantalla no lo incluya
  const teamMap = new Map(teams.map(t => [t.name, t.flag]))
  if (prediction?.champion_team && !teamMap.has(prediction.champion_team)) teamMap.set(prediction.champion_team, null)
  if (prediction?.finalist_team && !teamMap.has(prediction.finalist_team)) teamMap.set(prediction.finalist_team, null)
  const sortedTeams = [...teamMap.entries()].map(([name, flag]) => ({ name, flag })).sort((a, b) => a.name.localeCompare(b.name))

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
      setError('Elegí los 2 finalistas')
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

  // Nada útil que mostrar todavía (ni resultado real, ni predicción, ni equipos para elegir)
  if (!actualResult && !prediction && sortedTeams.length === 0) return null

  return (
    <div id="champion-prediction" className={`${className} rounded-xl p-4 bg-slate-800 border border-yellow-500/35 scroll-mt-20`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">🏆</span>
        <span className="text-sm font-semibold text-yellow-400">Predicción Campeón del Mundial</span>
        <ChampionRulesModal />
        <ChampionVsFinalInfoModal userId={userId} />
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
          <div className="flex items-end gap-1.5 mb-3">
            <div className="flex-1 min-w-0">
              <label className="text-xs text-slate-500 block mb-1">Finalista 1</label>
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
            <input
              type="number" min="0" max="20" disabled={locked}
              value={championScore}
              onChange={e => setChampionScore(e.target.value)}
              className="w-10 shrink-0 text-center bg-slate-700 border border-slate-600 rounded-lg py-1.5 text-sm font-bold text-white disabled:opacity-50"
            />
            <span className="text-slate-500 font-bold shrink-0 pb-1.5">-</span>
            <input
              type="number" min="0" max="20" disabled={locked}
              value={runnerUpScore}
              onChange={e => setRunnerUpScore(e.target.value)}
              className="w-10 shrink-0 text-center bg-slate-700 border border-slate-600 rounded-lg py-1.5 text-sm font-bold text-white disabled:opacity-50"
            />
            <div className="flex-1 min-w-0">
              <label className="text-xs text-slate-500 block mb-1">Finalista 2</label>
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

          {showPenalty && (
            <div className="flex flex-col items-center gap-1.5 mb-3">
              <span className="text-xs text-slate-500">Ganador en penales:</span>
              <div className="flex items-center gap-3">
                <button
                  type="button" disabled={locked}
                  onClick={() => setPenaltyWinner('champion')}
                  className={`flex items-center justify-center p-2.5 rounded-lg border-2 transition ${penaltyWinner === 'champion' ? 'border-yellow-500' : 'border-slate-600 opacity-60'}`}
                >
                  <TeamFlag name={championTeam} size="lg" showName={false} />
                </button>
                <button
                  type="button" disabled={locked}
                  onClick={() => setPenaltyWinner('runner_up')}
                  className={`flex items-center justify-center p-2.5 rounded-lg border-2 transition ${penaltyWinner === 'runner_up' ? 'border-yellow-500' : 'border-slate-600 opacity-60'}`}
                >
                  <TeamFlag name={finalistTeam} size="lg" showName={false} />
                </button>
              </div>
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
