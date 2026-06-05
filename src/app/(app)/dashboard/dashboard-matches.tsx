'use client'
import { useState } from 'react'
import { Match, Prediction } from '@/types'
import { upsertPrediction, isPredictionLocked } from '@/lib/predictions'
import TeamFlag from '@/components/team-flag'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Lock, Clock, CheckCircle } from 'lucide-react'

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

export default function DashboardMatches({
  userId,
  matches,
}: {
  userId: string
  matches: MatchWithPrediction[]
}) {
  const [scores, setScores] = useState<Record<number, { home: string; away: string }>>(() => {
    const init: Record<number, { home: string; away: string }> = {}
    matches.forEach(m => {
      init[m.id] = {
        home: m.prediction ? String(m.prediction.home_score) : '',
        away: m.prediction ? String(m.prediction.away_score) : '',
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

  // Solo partidos que no estén bloqueados ni finalizados
  const available = matches.filter(m => !isPredictionLocked(m) && m.status !== 'finished')

  // Día más próximo con partidos disponibles
  const nextDay = available.length > 0
    ? format(new Date(available[0].match_date), 'yyyy-MM-dd')
    : null

  const dayMatches = nextDay
    ? available.filter(m => format(new Date(m.match_date), 'yyyy-MM-dd') === nextDay)
    : []

  const grouped: Record<string, MatchWithPrediction[]> = nextDay ? { [nextDay]: dayMatches } : {}
  const sortedKeys = nextDay ? [nextDay] : []

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg">Partidos</h2>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span>3 pts = exacto</span>
          <span>1 pt = ganador</span>
        </div>
      </div>

      {sortedKeys.length === 0 && (
        <p className="text-slate-400 text-sm">No hay partidos disponibles para predecir próximamente.</p>
      )}

      {sortedKeys.map(key => (
        <div key={key}>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
            {format(new Date(key + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es })}
          </h3>
          <div className="space-y-3">
            {grouped[key].map(match => {
              const locked = isPredictionLocked(match)
              const s = scores[match.id] ?? { home: '', away: '' }
              const hasPrediction = match.prediction !== null

              return (
                <div key={match.id} className="bg-slate-800 rounded-xl p-4">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(match.match_date), "d MMM · HH:mm", { locale: es })}
                    </span>
                    <div className="flex items-center gap-2">
                      {match.status === 'finished' && (
                        <span className="text-xs text-green-400 font-semibold">
                          {match.home_score} - {match.away_score}
                        </span>
                      )}
                      {locked && match.status === 'scheduled' && (
                        <span className="flex items-center gap-1 text-xs text-amber-400">
                          <Lock className="w-3 h-3" /> Bloqueado
                        </span>
                      )}
                      {hasPrediction && !locked && (
                        <span className="flex items-center gap-1 text-xs text-green-400">
                          <CheckCircle className="w-3 h-3" /> Guardado
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Equipos e inputs */}
                  <div className="flex items-center gap-2">
                    <span className="flex-1 text-right text-sm font-medium">
                      <TeamFlag name={match.home_team} flagUrl={match.home_team_flag} />
                    </span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        max="20"
                        disabled={locked}
                        value={s.home}
                        onChange={e => setScores(v => ({ ...v, [match.id]: { ...v[match.id], home: e.target.value } }))}
                        className="w-11 text-center bg-slate-700 border border-slate-600 rounded-lg py-1.5 text-lg font-bold disabled:opacity-50 focus:outline-none focus:border-yellow-500"
                      />
                      <span className="text-slate-500 font-bold">-</span>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        disabled={locked}
                        value={s.away}
                        onChange={e => setScores(v => ({ ...v, [match.id]: { ...v[match.id], away: e.target.value } }))}
                        className="w-11 text-center bg-slate-700 border border-slate-600 rounded-lg py-1.5 text-lg font-bold disabled:opacity-50 focus:outline-none focus:border-yellow-500"
                      />
                    </div>
                    <span className="flex-1 text-left text-sm font-medium">
                      <TeamFlag name={match.away_team} flagUrl={match.away_team_flag} />
                    </span>
                  </div>

                  {/* Botón guardar */}
                  {!locked && (
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-red-400">{errors[match.id]}</span>
                      <button
                        onClick={() => handleSave(match)}
                        disabled={saving[match.id]}
                        className="px-4 py-1.5 text-sm bg-yellow-500 text-slate-900 font-semibold rounded-lg hover:bg-yellow-400 disabled:opacity-50 transition"
                      >
                        {saving[match.id] ? 'Guardando...' : saved[match.id] ? '✓ Guardado' : 'Guardar'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
