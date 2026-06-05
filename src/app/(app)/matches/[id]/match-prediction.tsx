'use client'
import { useState } from 'react'
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

      {locked ? (
        <div className="flex items-center gap-2 text-amber-400 text-sm">
          <Lock className="w-4 h-4" />
          {match.status === 'finished'
            ? 'El partido ya terminó'
            : 'Las predicciones están bloqueadas (15 min antes del partido)'}
          {prediction && (
            <span className="ml-2 text-slate-300">
              — Tu pronóstico: <span className="font-bold text-yellow-400">{prediction.home_score} - {prediction.away_score}</span>
            </span>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-400 flex-1 text-right">{match.home_team}</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="20"
              value={home}
              onChange={e => setHome(e.target.value)}
              className="w-14 text-center bg-slate-700 border border-slate-600 rounded-xl py-2 text-2xl font-black focus:outline-none focus:border-yellow-500"
            />
            <span className="text-slate-500 font-bold text-xl">-</span>
            <input
              type="number"
              min="0"
              max="20"
              value={away}
              onChange={e => setAway(e.target.value)}
              className="w-14 text-center bg-slate-700 border border-slate-600 rounded-xl py-2 text-2xl font-black focus:outline-none focus:border-yellow-500"
            />
          </div>
          <span className="text-sm text-slate-400 flex-1">{match.away_team}</span>
        </div>
      )}

      {!locked && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-red-400">{error}</span>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-yellow-500 text-slate-900 font-semibold rounded-xl hover:bg-yellow-400 disabled:opacity-50 transition"
          >
            {saving ? 'Guardando...' : saved ? '✓ Guardado' : prediction ? 'Actualizar' : 'Guardar predicción'}
          </button>
        </div>
      )}
    </div>
  )
}
