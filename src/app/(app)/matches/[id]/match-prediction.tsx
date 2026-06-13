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
  const initialHome = prediction ? String(prediction.home_score) : ''
  const initialAway = prediction ? String(prediction.away_score) : ''

  const [home, setHome] = useState(initialHome)
  const [away, setAway] = useState(initialAway)
  const [committedHome, setCommittedHome] = useState(initialHome)
  const [committedAway, setCommittedAway] = useState(initialAway)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [, setTick] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60_000)
    return () => clearInterval(interval)
  }, [])
  const locked = isPredictionLocked(match)
  const isDirty = !locked && (home !== committedHome || away !== committedAway)

  async function handleSave() {
    const h = parseInt(home)
    const a = parseInt(away)
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) {
      setError('Ingresá un resultado válido')
      return
    }
    setSaving(true)
    setError('')
    try {
      await upsertPrediction(userId, match.id, h, a)
      setCommittedHome(String(h))
      setCommittedAway(String(a))
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
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            max="20"
            disabled={locked}
            value={home}
            onChange={e => setHome(e.target.value)}
            className="w-14 text-center bg-slate-700 border border-slate-600 rounded-xl py-2 text-2xl font-black focus:outline-none focus:border-yellow-500 disabled:opacity-50"
          />
          <span className="text-slate-500 font-bold text-xl">-</span>
          <input
            type="number"
            min="0"
            max="20"
            disabled={locked}
            value={away}
            onChange={e => setAway(e.target.value)}
            className="w-14 text-center bg-slate-700 border border-slate-600 rounded-xl py-2 text-2xl font-black focus:outline-none focus:border-yellow-500 disabled:opacity-50"
          />
        </div>
        <span className="text-sm text-slate-400 flex-1">{match.away_team}</span>
      </div>

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
