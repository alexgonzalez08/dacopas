'use client'
import { useState, useEffect } from 'react'
import { upsertPrediction, isPredictionLocked } from '@/lib/predictions'
import { Match, Prediction } from '@/types'
import { Lock, Clock, ChevronDown } from 'lucide-react'
import TeamFlag from '@/components/team-flag'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import PredictionsInfoModal from '@/components/predictions-info-modal'

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
  const [hasPrediction, setHasPrediction] = useState<Record<number, boolean>>(() => {
    const init: Record<number, boolean> = {}
    matches.forEach(m => { init[m.id] = !!m.prediction })
    return init
  })

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
      setHasPrediction(v => ({ ...v, [match.id]: true }))
      setSaved(v => ({ ...v, [match.id]: true }))
      setTimeout(() => setSaved(v => ({ ...v, [match.id]: false })), 2000)
    } catch {
      setErrors(e => ({ ...e, [match.id]: 'Error al guardar' }))
    } finally {
      setSaving(v => ({ ...v, [match.id]: false }))
    }
  }

  const stageOrder = ['group_A','group_B','group_C','group_D','group_E','group_F','group_G','group_H','group_I','group_J','group_K','group_L','round_of_32','round_of_16','quarter','semi','third_place','final']
  const knockoutStages = new Set(['round_of_32','round_of_16','quarter','semi','third_place','final'])

  const [openTournaments, setOpenTournaments] = useState<Record<string, boolean>>({})
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})

  function toggleTournament(t: string) {
    setOpenTournaments(v => ({ ...v, [t]: !v[t] }))
  }
  function toggleSection(key: string) {
    setOpenSections(v => ({ ...v, [key]: !v[key] }))
  }

  const byTournament = matches.reduce<Record<string, MatchWithPrediction[]>>((acc, m) => {
    const t = m.tournament ?? 'FIFA World Cup 2026'
    if (!acc[t]) acc[t] = []
    acc[t].push(m)
    return acc
  }, {})

  const tournaments = Object.keys(byTournament).sort()

  function groupByStage(tournamentMatches: MatchWithPrediction[]) {
    const grouped = tournamentMatches.reduce<Record<string, MatchWithPrediction[]>>((acc, m) => {
      const key = m.group_name ? `group_${m.group_name}` : m.stage
      if (!acc[key]) acc[key] = []
      acc[key].push(m)
      return acc
    }, {})
    // Knockout matches get merged into a single "Fase Eliminatoria" bucket
    const knockoutMatches: MatchWithPrediction[] = []
    const result: { key: string; label: string; matches: MatchWithPrediction[] }[] = []
    Object.keys(grouped)
      .sort((a, b) => {
        const ai = stageOrder.indexOf(a)
        const bi = stageOrder.indexOf(b)
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
      })
      .forEach(key => {
        if (knockoutStages.has(key)) {
          knockoutMatches.push(...grouped[key])
        } else {
          const label = key.startsWith('group_') ? `Grupo ${key.replace('group_', '')}` : STAGE_LABELS[key] ?? key
          result.push({ key, label, matches: grouped[key] })
        }
      })
    if (knockoutMatches.length > 0) {
      result.push({ key: 'knockout', label: 'Fase Eliminatoria', matches: knockoutMatches })
    }
    return result
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mis Pronósticos</h1>
        <PredictionsInfoModal userId={userId} autoOpen={!predictionsInfoSeen} />
      </div>
      {tournaments.map(tournament => (
        <div key={tournament} className="border border-slate-700 rounded-2xl overflow-hidden">
          {/* Tournament accordion header */}
          <button
            onClick={() => toggleTournament(tournament)}
            className="w-full flex items-center justify-between px-5 py-4 bg-slate-800 hover:bg-slate-750 transition-colors"
          >
            <span className="text-base font-bold text-yellow-400">{tournament}</span>
            <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${openTournaments[tournament] ? 'rotate-180' : ''}`} />
          </button>

          {openTournaments[tournament] && (
            <div className="divide-y divide-slate-700">
              {groupByStage(byTournament[tournament]).map(({ key, label, matches: stageMatches }) => {
                const sectionKey = `${tournament}__${key}`
                const isOpen = openSections[sectionKey]
                return (
                  <div key={key}>
                    {/* Section accordion header */}
                    <button
                      onClick={() => toggleSection(sectionKey)}
                      className="w-full flex items-center justify-between px-5 py-3 bg-slate-800/50 hover:bg-slate-800 transition-colors"
                    >
                      <span className="font-semibold text-slate-300 text-sm">{label}</span>
                      <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isOpen && (
                      <div className="space-y-3 p-4">
                        {stageMatches.map(match => {
                          const locked = isPredictionLocked(match)
                          const s = scores[match.id] ?? { home: '', away: '' }
                          return (
                            <div key={match.id} onClick={() => router.push(`/matches/${match.id}`)} className="bg-slate-800 rounded-xl p-4 cursor-pointer hover:bg-slate-750 transition-colors">
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
                                    <TeamFlag name={match.away_team} flagUrl={match.away_team_flag} size="lg" showName={false} />
                                  </span>
                                </div>
                                <div className="mt-3 sm:mt-0 flex flex-col items-stretch sm:items-end gap-1">
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
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
