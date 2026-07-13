'use client'
import { useState, useEffect } from 'react'
import { Match, Prediction } from '@/types'
import { upsertPrediction, isPredictionLocked } from '@/lib/predictions'
import { Lock } from 'lucide-react'
import UnsavedChangesGuard from '@/components/unsaved-changes-guard'

export default function MatchPrediction({
  userId,
  match,
  prediction,
}: {
  userId: string
  match: Match
  prediction: Prediction | null
}) {
  const KNOCKOUT_STAGES = new Set(['round_of_32', 'round_of_16', 'quarter', 'semi', 'third_place', 'final'])

  const initialHome = prediction ? String(prediction.home_score) : ''
  const initialAway = prediction ? String(prediction.away_score) : ''
  const initialPenalty = prediction?.penalty_winner ?? null

  const [home, setHome] = useState(initialHome)
  const [away, setAway] = useState(initialAway)
  const [committedHome, setCommittedHome] = useState(initialHome)
  const [committedAway, setCommittedAway] = useState(initialAway)
  const [penaltyWinner, setPenaltyWinner] = useState<'home' | 'away' | null>(initialPenalty)
  const [committedPenalty, setCommittedPenalty] = useState<'home' | 'away' | null>(initialPenalty)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [, setTick] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60_000)
    return () => clearInterval(interval)
  }, [])
  const locked = isPredictionLocked(match)
  const isKnockout = !!match.stage && KNOCKOUT_STAGES.has(match.stage)
  const homeNum = parseInt(home)
  const awayNum = parseInt(away)
  const showPenalty = isKnockout && !isNaN(homeNum) && !isNaN(awayNum) && homeNum === awayNum
  const isDirty = !locked && (home !== committedHome || away !== committedAway || penaltyWinner !== committedPenalty)

  async function handleSave() {
    const h = parseInt(home)
    const a = parseInt(away)
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) {
      setError('Ingresá un resultado válido')
      return
    }
    const pw = isKnockout && h === a ? penaltyWinner : null
    if (isKnockout && h === a && !pw) {
      setError('Seleccioná el ganador en penales')
      return
    }
    setSaving(true)
    setError('')
    try {
      await upsertPrediction(userId, match.id, h, a, pw)
      setCommittedHome(String(h))
      setCommittedAway(String(a))
      setCommittedPenalty(pw)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const isFinished = match.status === 'finished'

  return (
    <>
    <UnsavedChangesGuard isDirty={isDirty} id="match-prediction" />
    <div className="bg-slate-800 rounded-2xl p-5">
      <h2 className="font-semibold mb-4 text-slate-300">Tu predicción</h2>

      {isFinished && match.home_score !== null && match.away_score !== null && (
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="text-xs text-slate-400">Resultado final</span>
          <span className="text-sm font-black text-yellow-400">
            {match.home_score} - {match.away_score}
          </span>
        </div>
      )}

      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-400 flex-1 text-right">{match.home_team}</span>
        <div className="flex flex-col items-center gap-1">
          {isKnockout && (
            <div className="flex items-center gap-2 w-full">
              <button
                disabled={locked || !showPenalty}
                onClick={() => setPenaltyWinner(v => v === 'home' ? null : 'home')}
                className={`flex-1 flex items-center justify-center gap-1 py-0.5 rounded text-xs font-semibold transition
                  ${!showPenalty || locked ? 'opacity-30 cursor-default text-slate-500' :
                    penaltyWinner === 'home' ? 'text-yellow-400' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition
                  ${penaltyWinner === 'home' ? 'border-yellow-400 bg-yellow-400' : 'border-slate-500'}`}>
                  {penaltyWinner === 'home' && <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />}
                </span>
                pen
              </button>
              <div className="w-2" />
              <button
                disabled={locked || !showPenalty}
                onClick={() => setPenaltyWinner(v => v === 'away' ? null : 'away')}
                className={`flex-1 flex items-center justify-center gap-1 py-0.5 rounded text-xs font-semibold transition
                  ${!showPenalty || locked ? 'opacity-30 cursor-default text-slate-500' :
                    penaltyWinner === 'away' ? 'text-yellow-400' : 'text-slate-500 hover:text-slate-300'}`}
              >
                pen
                <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition
                  ${penaltyWinner === 'away' ? 'border-yellow-400 bg-yellow-400' : 'border-slate-500'}`}>
                  {penaltyWinner === 'away' && <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />}
                </span>
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="20"
              disabled={locked}
              value={home}
              onChange={e => {
                const val = e.target.value
                setHome(val)
                const h = parseInt(val), a = parseInt(away)
                if (!isNaN(h) && !isNaN(a) && h !== a) setPenaltyWinner(null)
              }}
              className="w-14 text-center bg-slate-700 border border-slate-600 rounded-xl py-2 text-2xl font-black focus:outline-none focus:border-yellow-500 disabled:opacity-50"
            />
            <span className="text-slate-500 font-bold text-xl">-</span>
            <input
              type="number"
              min="0"
              max="20"
              disabled={locked}
              value={away}
              onChange={e => {
                const val = e.target.value
                setAway(val)
                const h = parseInt(home), a = parseInt(val)
                if (!isNaN(h) && !isNaN(a) && h !== a) setPenaltyWinner(null)
              }}
              className="w-14 text-center bg-slate-700 border border-slate-600 rounded-xl py-2 text-2xl font-black focus:outline-none focus:border-yellow-500 disabled:opacity-50"
            />
          </div>
        </div>
        <span className="text-sm text-slate-400 flex-1">{match.away_team}</span>
      </div>
      {locked && prediction?.penalty_winner && (
        <p className="text-xs text-slate-400 text-center mt-2">
          Penales: <span className="text-yellow-400 font-semibold">
            {prediction.penalty_winner === 'home' ? match.home_team : match.away_team}
          </span>
        </p>
      )}

      <div className="mt-4 flex items-center justify-between">
        {!locked && <span className="text-xs text-red-400">{error}</span>}
        {locked && <Lock className="w-3.5 h-3.5 text-amber-400" />}
        <button
          onClick={!locked ? handleSave : undefined}
          disabled={locked || saving}
          className={`px-6 py-2 font-semibold rounded-xl transition ${locked ? 'bg-slate-600 text-slate-400 cursor-default' : 'bg-yellow-500 text-slate-900 hover:bg-yellow-400 disabled:opacity-50'}`}
        >
          {locked
            ? 'Enviado'
            : saving
            ? 'Guardando...'
            : saved
            ? '✓ Guardado'
            : prediction
            ? 'Modificar'
            : 'Guardar predicción'}
        </button>
      </div>
    </div>
    </>
  )
}
