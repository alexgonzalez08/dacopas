'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { upsertPrediction, isPredictionLocked } from '@/lib/predictions'
import { Match, Prediction } from '@/types'
import { Lock, Clock, ChevronDown, ChevronRight } from 'lucide-react'
import TeamFlag from '@/components/team-flag'
import MatchTime from '@/components/match-time'
import PredictionsInfoModal from '@/components/predictions-info-modal'
import UnsavedChangesGuard from '@/components/unsaved-changes-guard'
import { useUnsavedChanges } from '@/lib/unsaved-changes-context'

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
  const { navigate } = useUnsavedChanges()
  const [, setTick] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60_000)
    return () => clearInterval(interval)
  }, [])

  const KNOCKOUT_STAGES = new Set(['round_of_32', 'round_of_16', 'quarter', 'semi', 'third_place', 'final'])

  const initScores = () => {
    const init: Record<number, { home: string; away: string }> = {}
    matches.forEach(m => {
      init[m.id] = m.prediction
        ? { home: String(m.prediction.home_score), away: String(m.prediction.away_score) }
        : { home: '', away: '' }
    })
    return init
  }
  const initPenalty = () => {
    const init: Record<number, 'home' | 'away' | null> = {}
    matches.forEach(m => { init[m.id] = m.prediction?.penalty_winner ?? null })
    return init
  }
  const [scores, setScores] = useState<Record<number, { home: string; away: string }>>(initScores)
  const [committed, setCommitted] = useState<Record<number, { home: string; away: string }>>(initScores)
  const [penaltyWinner, setPenaltyWinner] = useState<Record<number, 'home' | 'away' | null>>(initPenalty)
  const [committedPenalty, setCommittedPenalty] = useState<Record<number, 'home' | 'away' | null>>(initPenalty)
  const [saving, setSaving] = useState<Record<number, boolean>>({})
  const [saved, setSaved] = useState<Record<number, boolean>>({})
  const [errors, setErrors] = useState<Record<number, string>>({})
  const [hasPrediction, setHasPrediction] = useState<Record<number, boolean>>(() => {
    const init: Record<number, boolean> = {}
    matches.forEach(m => { init[m.id] = !!m.prediction })
    return init
  })

  const isDirty = matches.some(m => {
    if (isPredictionLocked(m)) return false
    const s = scores[m.id]
    const c = committed[m.id]
    if (s && c && (s.home !== c.home || s.away !== c.away)) return true
    if (penaltyWinner[m.id] !== committedPenalty[m.id]) return true
    return false
  })

  function handleCardNav(href: string) {
    navigate(href)
  }

  async function handleSave(match: Match) {
    const s = scores[match.id]
    const home = parseInt(s.home)
    const away = parseInt(s.away)
    if (isNaN(home) || isNaN(away) || home < 0 || away < 0) {
      setErrors(e => ({ ...e, [match.id]: 'Ingresá un resultado válido' }))
      return
    }
    const isKnockout = KNOCKOUT_STAGES.has(match.stage)
    const isDraw = home === away
    const pw = isKnockout && isDraw ? penaltyWinner[match.id] : null
    if (isKnockout && isDraw && !pw) {
      setErrors(e => ({ ...e, [match.id]: 'Seleccioná el ganador en penales' }))
      return
    }
    setSaving(v => ({ ...v, [match.id]: true }))
    setErrors(e => ({ ...e, [match.id]: '' }))
    try {
      await upsertPrediction(userId, match.id, home, away, pw)
      setCommitted(v => ({ ...v, [match.id]: { home: String(home), away: String(away) } }))
      setCommittedPenalty(v => ({ ...v, [match.id]: pw }))
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

  const STAGE_ORDER = ['group', 'round_of_32', 'round_of_16', 'quarter', 'semi', 'third_place', 'final']

  // Agrupar por fase, ordenados cronológicamente dentro de cada fase
  const sorted = [...matches].sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())
  const byStage = sorted.reduce<Record<string, MatchWithPrediction[]>>((acc, m) => {
    if (!acc[m.stage]) acc[m.stage] = []
    acc[m.stage].push(m)
    return acc
  }, {})

  const stages = STAGE_ORDER.filter(s => byStage[s])

  const todayStr = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD en timezone local
  const matchDay = (date: string) => new Date(date).toLocaleDateString('en-CA')

  // Fase activa: la que tiene partidos hoy, o la más próxima con partidos futuros
  const activeStage = (() => {
    const withToday = stages.find(s => byStage[s].some(m => matchDay(m.match_date) === todayStr))
    if (withToday) return withToday
    return stages.find(s => byStage[s].some(m => matchDay(m.match_date) >= todayStr)) ?? stages[stages.length - 1]
  })()

  const [openStages, setOpenStages] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(stages.map(s => [s, s === activeStage]))
  )
  function toggleStage(stage: string) {
    setOpenStages(v => ({ ...v, [stage]: !v[stage] }))
  }

  // Día activo por fase: el que tiene partidos hoy, o el más próximo con partidos futuros
  function getActiveDay(stageMatches: MatchWithPrediction[]) {
    const withToday = stageMatches.find(m => matchDay(m.match_date) === todayStr)
    if (withToday) return matchDay(withToday.match_date)
    const future = stageMatches.find(m => matchDay(m.match_date) > todayStr)
    if (future) return matchDay(future.match_date)
    return null
  }

  const [openDays, setOpenDays] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    stages.forEach(stage => {
      const activeDay = getActiveDay(byStage[stage])
      const days = [...new Set(byStage[stage].map(m => matchDay(m.match_date)))].sort()
      days.forEach(d => { init[d] = d === activeDay })
    })
    return init
  })
  function toggleDay(day: string) {
    setOpenDays(v => ({ ...v, [day]: !v[day] }))
  }

  // Primer partido próximo (hoy o futuro, no bloqueado)
  const nextMatch = sorted.find(m => matchDay(m.match_date) >= todayStr && m.status !== 'finished')
  const nextMatchId = nextMatch?.id ?? null

  const nextMatchRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (nextMatchRef.current) {
      setTimeout(() => {
        nextMatchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
    }
  }, [])

  return (
    <>
    <UnsavedChangesGuard isDirty={isDirty} id="predictions" />
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mis Predicciones</h1>
        <PredictionsInfoModal userId={userId} autoOpen={!predictionsInfoSeen} />
      </div>

      <div className="text-center">
        <Link href="/support" className="text-xs text-slate-500 hover:text-yellow-400 transition">
          ¿Tenés un problema? Reportalo aquí
        </Link>
      </div>

      {stages.map(stage => {
        const stageMatches = byStage[stage]
        const isOpen = openStages[stage]
        const total = stageMatches.length
        const done = stageMatches.filter(m => m.status === 'finished').length
        const hasPred = stageMatches.filter(m => hasPrediction[m.id]).length
        return (
        <div key={stage}>
          <button
            onClick={() => toggleStage(stage)}
            className="w-full flex items-center justify-between px-4 py-3 mb-3 rounded-xl bg-slate-800 hover:bg-slate-700 transition group"
          >
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-slate-200 group-hover:text-white transition">
                {STAGE_LABELS[stage] ?? stage}
              </h2>
              <span className="text-xs text-slate-500">{hasPred}/{total}</span>
              {done === total && <span className="text-xs text-green-500 font-medium">✓ Finalizada</span>}
            </div>
            {isOpen
              ? <ChevronDown className="w-4 h-4 text-slate-400" />
              : <ChevronRight className="w-4 h-4 text-slate-400" />
            }
          </button>
          {isOpen && <div className="space-y-5">
            {(() => {
              const byDay = stageMatches.reduce<Record<string, MatchWithPrediction[]>>((acc, m) => {
                const d = matchDay(m.match_date)
                if (!acc[d]) acc[d] = []
                acc[d].push(m)
                return acc
              }, {})
              const stageDays = Object.keys(byDay).sort()
              return stageDays.map(day => (
                <div key={day}>
                  <button
                    onClick={() => toggleDay(day)}
                    className="w-full flex items-center justify-between px-3 py-2 mb-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition group"
                  >
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider group-hover:text-slate-200 transition">
                      {new Date(day + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </span>
                    {openDays[day]
                      ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                      : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                    }
                  </button>
                  {openDays[day] && <div className="space-y-3">
                    {byDay[day].map(match => {
              const locked = isPredictionLocked(match)
              const s = scores[match.id] ?? { home: '', away: '' }
              const c = committed[match.id] ?? { home: '', away: '' }
              const isKnockout = KNOCKOUT_STAGES.has(match.stage)
              const homeNum = parseInt(s.home)
              const awayNum = parseInt(s.away)
              const showPenalty = isKnockout && !isNaN(homeNum) && !isNaN(awayNum) && homeNum === awayNum
              const pw = penaltyWinner[match.id]
              const matchDirty = !locked && (s.home !== c.home || s.away !== c.away || pw !== committedPenalty[match.id])
              const committedH = parseInt(c.home)
              const committedA = parseInt(c.away)
              const hasDrawWithoutPenalty = isKnockout && !locked && hasPrediction[match.id] &&
                committedPenalty[match.id] === null &&
                !isNaN(committedH) && !isNaN(committedA) && committedH === committedA
              return (
                <div key={match.id} ref={match.id === nextMatchId ? nextMatchRef : undefined} onClick={() => handleCardNav(`/matches/${match.id}`)} className={`rounded-xl p-4 cursor-pointer transition-colors ${hasDrawWithoutPenalty ? 'bg-red-500/10 border border-red-500/40' : matchDirty ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-slate-800 hover:bg-slate-750'}`}>
                  {hasDrawWithoutPenalty && (
                    <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-red-500/15 border border-red-500/30">
                      <span className="text-red-400 text-sm">⚠️</span>
                      <span className="text-xs text-red-300 font-medium">Predijiste empate pero no seleccionaste el ganador en penales. Corregí antes de que cierre.</span>
                    </div>
                  )}
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
                      {matchDirty && <span className="text-xs text-yellow-400 font-semibold">Sin guardar</span>}
                      {hasDrawWithoutPenalty && <span className="text-xs text-red-400 font-semibold">⚠️ Incompleta</span>}
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
                      <div className="flex flex-col items-center gap-1" onClick={e => e.stopPropagation()}>
                        {isKnockout && (
                          <div className="flex items-center gap-2 w-full">
                            <button
                              disabled={locked || !showPenalty}
                              onClick={() => setPenaltyWinner(v => ({ ...v, [match.id]: pw === 'home' ? null : 'home' }))}
                              className={`flex-1 flex items-center justify-center gap-1 py-0.5 rounded text-xs font-semibold transition
                                ${!showPenalty ? 'opacity-30 cursor-default text-slate-500' :
                                  locked ? (pw === 'home' ? 'text-yellow-400 cursor-default' : 'opacity-30 cursor-default text-slate-500') :
                                  pw === 'home' ? 'text-yellow-400' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                              <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition
                                ${pw === 'home' ? 'border-yellow-400 bg-yellow-400' : 'border-slate-500'}`}>
                                {pw === 'home' && <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />}
                              </span>
                              pen
                            </button>
                            <div className="w-2" />
                            <button
                              disabled={locked || !showPenalty}
                              onClick={() => setPenaltyWinner(v => ({ ...v, [match.id]: pw === 'away' ? null : 'away' }))}
                              className={`flex-1 flex items-center justify-center gap-1 py-0.5 rounded text-xs font-semibold transition
                                ${!showPenalty ? 'opacity-30 cursor-default text-slate-500' :
                                  locked ? (pw === 'away' ? 'text-yellow-400 cursor-default' : 'opacity-30 cursor-default text-slate-500') :
                                  pw === 'away' ? 'text-yellow-400' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                              pen
                              <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition
                                ${pw === 'away' ? 'border-yellow-400 bg-yellow-400' : 'border-slate-500'}`}>
                                {pw === 'away' && <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />}
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
                            value={s.home}
                            onChange={e => {
                              const val = e.target.value
                              setScores(v => ({ ...v, [match.id]: { ...v[match.id], home: val } }))
                              const h = parseInt(val), a = parseInt(s.away)
                              if (!isNaN(h) && !isNaN(a) && h !== a) setPenaltyWinner(v => ({ ...v, [match.id]: null }))
                            }}
                            className="w-12 text-center bg-slate-700 border border-slate-600 rounded-lg py-1.5 text-lg font-bold disabled:opacity-50 focus:outline-none focus:border-yellow-500"
                          />
                          <span className="text-slate-500 font-bold">-</span>
                          <input
                            type="number"
                            min="0"
                            max="20"
                            disabled={locked}
                            value={s.away}
                            onChange={e => {
                              const val = e.target.value
                              setScores(v => ({ ...v, [match.id]: { ...v[match.id], away: val } }))
                              const h = parseInt(s.home), a = parseInt(val)
                              if (!isNaN(h) && !isNaN(a) && h !== a) setPenaltyWinner(v => ({ ...v, [match.id]: null }))
                            }}
                            className="w-12 text-center bg-slate-700 border border-slate-600 rounded-lg py-1.5 text-lg font-bold disabled:opacity-50 focus:outline-none focus:border-yellow-500"
                          />
                        </div>
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
                          {match.penalty_home !== null && ` (pen. ${match.penalty_home}-${match.penalty_away})`}
                        </span>
                      )}
                      {locked && committedPenalty[match.id] && (
                        <p className="text-xs text-slate-400 text-center sm:text-right">
                          Penales: <span className="text-yellow-400 font-semibold">
                            {committedPenalty[match.id] === 'home' ? match.home_team : match.away_team}
                          </span>
                        </p>
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
                  </div>}
                </div>
              ))
            })()}
          </div>}
        </div>
      )
      })}
    </div>
    </>
  )
}
