'use client'
import { useState, useTransition } from 'react'
import { upsertPrediction, isPredictionLocked } from '@/lib/predictions'
import { Match, Prediction } from '@/types'
import { Lock, Clock } from 'lucide-react'
import TeamFlag from '@/components/team-flag'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

type MatchWithPrediction = Match & { prediction: Prediction | null }

const STAGE_LABELS: Record<string, string> = {
  group: 'Fase de Grupos',
  round_of_32: 'Ronda de 32',
  round_of_16: 'Octavos de Final',
  quarter: 'Cuartos de Final',
  semi: 'Semifinales',
  third_place: 'Tercer Puesto',
  final: 'Final',
}

export default function PredictionsClient({
  userId,
  matches,
}: {
  userId: string
  matches: MatchWithPrediction[]
}) {
  const [scores, setScores] = useState<Record<number, { home: string; away: string }>>(() => {
    const init: Record<number, { home: string; away: string }> = {}
    matches.forEach(m => {
      if (m.prediction) {
        init[m.id] = { home: String(m.prediction.home_score), away: String(m.prediction.away_score) }
      } else {
        init[m.id] = { home: '', away: '' }
      }
    })
    return init
  })
  const [saving, setSaving] = useState<Record<number, boolean>>({})
  const [saved, setSaved] = useState<Record<number, boolean>>({})
  const [errors, setErrors] = useState<Record<number, string>>({})

  async function handleSave(match: Match) {
    const s = scores[match.id]
    const home = parseInt(s.home)
    const away = parseInt(s.away)
    if (isNaN(home) || isNaN(away) || home < 0 || away < 0) {
      setErrors(e => ({ ...e, [match.id]: 'Ingresá un resultado válido' }))
      return
    }
    setSaving(v => ({ ...v, [match.id]: true }))
    setErrors(e => ({ ...e, [match.id]: '' }))
    try {
      await upsertPrediction(userId, match.id, home, away)
      setSaved(v => ({ ...v, [match.id]: true }))
      setTimeout(() => setSaved(v => ({ ...v, [match.id]: false })), 2000)
    } catch {
      setErrors(e => ({ ...e, [match.id]: 'Error al guardar' }))
    } finally {
      setSaving(v => ({ ...v, [match.id]: false }))
    }
  }

  // Group by stage
  const grouped = matches.reduce<Record<string, MatchWithPrediction[]>>((acc, m) => {
    const key = m.group_name ? `group_${m.group_name}` : m.stage
    if (!acc[key]) acc[key] = []
    acc[key].push(m)
    return acc
  }, {})

  const stageOrder = ['group_A','group_B','group_C','group_D','group_E','group_F','group_G','group_H','group_I','group_J','group_K','group_L','round_of_32','round_of_16','quarter','semi','third_place','final']
  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    const ai = stageOrder.indexOf(a)
    const bi = stageOrder.indexOf(b)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Mis Pronósticos</h1>
      <div className="flex items-center gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Guardado</span>
        <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> Bloqueado (1h antes)</span>
        <span className="flex items-center gap-1">3 pts = resultado exacto · 1 pt = ganador/empate</span>
      </div>
      {sortedKeys.map(key => (
        <div key={key}>
          <h2 className="font-semibold text-slate-300 mb-3">
            {key.startsWith('group_') ? `Grupo ${key.replace('group_', '')}` : STAGE_LABELS[key] ?? key}
          </h2>
          <div className="space-y-3">
            {grouped[key].map(match => {
              const locked = isPredictionLocked(match)
              const s = scores[match.id] ?? { home: '', away: '' }
              return (
                <div key={match.id} className="bg-slate-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(match.match_date), "d 'de' MMM · HH:mm", { locale: es })}
                    </span>
                    {locked && <span className="flex items-center gap-1 text-xs text-amber-400"><Lock className="w-3 h-3" /> Bloqueado</span>}
                    {match.status === 'finished' && (
                      <span className="text-xs text-green-400 font-semibold">
                        Resultado: {match.home_score} - {match.away_score}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="flex-1 flex justify-end">
                        <TeamFlag name={match.home_team} flagUrl={match.home_team_flag} size="lg" showName={false} />
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="20"
                          disabled={locked}
                          value={s.home}
                          onChange={e => setScores(v => ({ ...v, [match.id]: { ...v[match.id], home: e.target.value } }))}
                          className="w-12 text-center bg-slate-700 border border-slate-600 rounded-lg py-1.5 text-lg font-bold disabled:opacity-50 focus:outline-none focus:border-yellow-500"
                        />
                        <span className="text-slate-500 font-bold">-</span>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          disabled={locked}
                          value={s.away}
                          onChange={e => setScores(v => ({ ...v, [match.id]: { ...v[match.id], away: e.target.value } }))}
                          className="w-12 text-center bg-slate-700 border border-slate-600 rounded-lg py-1.5 text-lg font-bold disabled:opacity-50 focus:outline-none focus:border-yellow-500"
                        />
                      </div>
                      <span className="flex-1 flex justify-start">
                        <TeamFlag name={match.away_team} flagUrl={match.away_team_flag} size="lg" showName={false} />
                      </span>
                    </div>
                    {!locked && (
                      <div className="mt-3 sm:mt-0 flex flex-col items-stretch sm:items-end gap-1">
                        {errors[match.id] && <span className="text-xs text-red-400 sm:text-right">{errors[match.id]}</span>}
                        <button
                          onClick={() => handleSave(match)}
                          disabled={saving[match.id]}
                          className="w-full sm:w-auto px-6 py-1.5 text-sm bg-yellow-500 text-slate-900 font-semibold rounded-lg hover:bg-yellow-400 disabled:opacity-50 transition"
                        >
                          {saving[match.id] ? 'Guardando...' : saved[match.id] ? '✓ Guardado' : 'Guardar'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
