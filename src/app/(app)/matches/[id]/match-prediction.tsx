'use client'
import { useState, useEffect } from 'react'
import { Match, Prediction } from '@/types'
import { upsertPrediction, isPredictionLocked } from '@/lib/predictions'
import { Lock } from 'lucide-react'

export default function MatchPrediction({
  userId,
  match,
  prediction,
}: {
  userId: string
  match: Match
  prediction: Prediction | null
}) {
  const [home, setHome] = useState(prediction ? String(prediction.home_score) : '')
  const [away, setAway] = useState(prediction ? String(prediction.away_score) : '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [, setTick] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60_000)
    return () => clearInterval(interval)
  }, [])
  const locked = isPredictionLocked(match)

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
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-slate-800 rounded-2xl p-5">
      <h2 className="font-semibold mb-4 text-slate-300">Tu predicción</h2>

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
        {locked && (
          <span className="text-xs text-amber-400 flex items-center gap-1">
            <Lock className="w-3 h-3" />
            {match.status === 'finished' ? 'El partido ya terminó' : 'Bloqueado (15 min antes)'}
          </span>
        )}
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
  )
}
