'use client'
import { useState } from 'react'
import { Match, Prediction } from '@/types'
import { upsertPrediction, isPredictionLocked } from '@/lib/predictions'
import TeamFlag from '@/components/team-flag'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Lock, Clock, CheckCircle, Info, ChevronRight } from 'lucide-react'
import Link from 'next/link'

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
        <h2 className="font-semibold text-lg flex items-center gap-2">
          ⚽ Próximos Partidos
        </h2>
        <div className="relative group">
          <Info className="w-4 h-4 text-slate-400 cursor-pointer hover:text-white transition" />
          <div className="absolute right-0 top-6 w-56 bg-slate-700 text-slate-200 text-xs rounded-xl p-3 shadow-lg hidden group-hover:block z-10 leading-relaxed">
            <p className="font-semibold mb-1">Sistema de puntos:</p>
            <p>🎯 Resultado exacto → <span className="text-yellow-400 font-bold">3 pts</span></p>
            <p>✅ Ganador / empate → <span className="text-yellow-400 font-bold">1 pt</span></p>
            <p className="mt-2 text-slate-400">Los marcadores se bloquean <span className="text-white font-semibold">15 minutos</span> antes de cada partido.</p>
          </div>
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
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(match.match_date), "HH:mm", { locale: es })}
                      </span>
                      {match.group_name && (
                        <span className="text-xs text-slate-500">
                          Fase de Grupos · Grupo {match.group_name}
                        </span>
                      )}
                      {!match.group_name && (
                        <span className="text-xs text-slate-500">
                          {STAGE_LABELS[match.stage] ?? match.stage}
                        </span>
                      )}
                    </div>
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

                  {/* Botón guardar + ver más */}
                  <div className="mt-3 flex items-center justify-between">
                    <Link
                      href={`/matches/${match.id}`}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-yellow-400 transition"
                    >
                      Ver más <ChevronRight className="w-3 h-3" />
                    </Link>
                    {!locked && (
                      <div className="flex items-center gap-2">
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
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
