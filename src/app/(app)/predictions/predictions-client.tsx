'use client'
import { useState, useEffect } from 'react'
import { upsertPrediction, isPredictionLocked } from '@/lib/predictions'
import { Match, Prediction } from '@/types'
import { Lock, Clock } from 'lucide-react'
import TeamFlag from '@/components/team-flag'
import { format } from 'date-fns'
import MatchTime from '@/components/match-time'
import { es } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import PredictionsInfoModal from '@/components/predictions-info-modal'
import UnsavedChangesGuard from '@/components/unsaved-changes-guard'

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
  predictionsInfoSeen,
}: {
  userId: string
  matches: MatchWithPrediction[]
  predictionsInfoSeen: boolean
}) {
  const router = useRouter()
  const [, setTick] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60_000)
    return () => clearInterval(interval)
  }, [])

  const initScores = () => {
    const init: Record<number, { home: string; away: string }> = {}
    matches.forEach(m => {
      init[m.id] = m.prediction
        ? { home: String(m.prediction.home_score), away: String(m.prediction.away_score) }
        : { home: '', away: '' }
    })
    return init
  }
  const [scores, setScores] = useState<Record<number, { home: string; away: string }>>(initScores)
  const [committed, setCommitted] = useState<Record<number, { home: string; away: string }>>(initScores)
  const [saving, setSaving] = useState<Record<number, boolean>>({})
  const [saved, setSaved] = useState<Record<number, boolean>>({})
  const [errors, setErrors] = useState<Record<number, string>>({})
  const [hasPrediction, setHasPrediction] = useState<Record<number, boolean>>(() => {
    const init: Record<number, boolean> = {}
    matches.forEach(m => { init[m.id] = !!m.prediction })
    return init
  })
  const [pendingNav, setPendingNav] = useState<string | null>(null)

  const isDirty = matches.some(m => {
    if (isPredictionLocked(m)) return false
    const s = scores[m.id]
    const c = committed[m.id]
    return s && c && (s.home !== c.home || s.away !== c.away)
  })

  function navigate(href: string) {
    if (isDirty) { setPendingNav(href); return }
    router.push(href)
  }

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
      setCommitted(v => ({ ...v, [match.id]: { home: String(home), away: String(away) } }))
      setHasPrediction(v => ({ ...v, [match.id]: true }))
      setSaved(v => ({ ...v, [match.id]: true }))
      setTimeout(() => setSaved(v => ({ ...v, [match.id]: false })), 2000)
    } catch {
      setErrors(e => ({ ...e, [match.id]: 'Error al guardar' }))
    } finally {
      setSaving(v => ({ ...v, [match.id]: false }))
    }
  }

  function getGroupLabel(match: MatchWithPrediction) {
    if (match.group_name) return `Grupo ${match.group_name}`
    return STAGE_LABELS[match.stage] ?? match.stage
  }

  // Ordenar por fecha+hora y agrupar por día
  const sorted = [...matches].sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())
  const byDate = sorted.reduce<Record<string, MatchWithPrediction[]>>((acc, m) => {
    const d = new Date(m.match_date)
    const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (!acc[day]) acc[day] = []
    acc[day].push(m)
    return acc
  }, {})
  const days = Object.keys(byDate).sort()

  return (
    <>
    <UnsavedChangesGuard isDirty={isDirty} />
    {pendingNav && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
        <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
          <p className="text-white font-semibold text-base mb-1">Cambios sin guardar</p>
          <p className="text-slate-400 text-sm mb-6">Tenés predicciones modificadas que no fueron guardadas. ¿Querés salir igual?</p>
          <div className="flex gap-3">
            <button
              onClick={() => setPendingNav(null)}
              className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-300 text-sm font-semibold hover:bg-slate-700 transition"
            >
              Cancelar
            </button>
            <button
              onClick={() => { setPendingNav(null); router.push(pendingNav) }}
              className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-400 transition"
            >
              Salir sin guardar
            </button>
          </div>
        </div>
      </div>
    )}
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mis Predicciones</h1>
        <PredictionsInfoModal userId={userId} autoOpen={!predictionsInfoSeen} />
      </div>

      {days.map(day => (
        <div key={day}>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider px-1 mb-3">
            {format(new Date(day + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es })}
          </h2>
          <div className="space-y-3">
            {byDate[day].map(match => {
              const locked = isPredictionLocked(match)
              const s = scores[match.id] ?? { home: '', away: '' }
              return (
                <div key={match.id} onClick={() => navigate(`/matches/${match.id}`)} className="bg-slate-800 rounded-xl p-4 cursor-pointer hover:bg-slate-750 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <MatchTime matchDate={match.match_date} />
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-400 font-medium">
                        {getGroupLabel(match)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {locked && <Lock className="w-3.5 h-3.5 text-amber-400" />}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="flex-1 flex justify-end">
                        <div className="flex flex-col items-center gap-1">
                          <TeamFlag name={match.home_team} flagUrl={match.home_team_flag} size="lg" showName={false} />
                          <span className="text-xs text-slate-300 text-center max-w-[80px] leading-tight">{match.home_team}</span>
                        </div>
                      </span>
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
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
                        <div className="flex flex-col items-center gap-1">
                          <TeamFlag name={match.away_team} flagUrl={match.away_team_flag} size="lg" showName={false} />
                          <span className="text-xs text-slate-300 text-center max-w-[80px] leading-tight">{match.away_team}</span>
                        </div>
                      </span>
                    </div>
                    <div className="mt-3 sm:mt-0 flex flex-col items-stretch sm:items-end gap-1">
                      {match.status === 'finished' && match.home_score !== null && (
                        <span className="text-xs text-green-400 font-semibold text-center sm:text-right">
                          Resultado: {match.home_score} - {match.away_score}
                        </span>
                      )}
                      {!locked && errors[match.id] && <span className="text-xs text-red-400 sm:text-right">{errors[match.id]}</span>}
                      <button
                        onClick={!locked ? (e) => { e.stopPropagation(); handleSave(match) } : (e) => e.stopPropagation()}
                        disabled={locked || saving[match.id]}
                        className={`w-full sm:w-auto px-6 py-1.5 text-sm font-semibold rounded-lg transition ${locked ? 'bg-slate-600 text-slate-400 cursor-default' : 'bg-yellow-500 text-slate-900 hover:bg-yellow-400 disabled:opacity-50'}`}
                      >
                        {locked
                          ? 'Enviado'
                          : saving[match.id]
                          ? 'Guardando...'
                          : saved[match.id]
                          ? '✓ Guardado'
                          : hasPrediction[match.id]
                          ? 'Modificar'
                          : 'Guardar'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
    </>
  )
}
