'use client'
import Link from 'next/link'
import { formatDistanceToNow, differenceInHours, differenceInMinutes } from 'date-fns'
import { es } from 'date-fns/locale'
import { CheckCircle2, Clock, ChevronRight } from 'lucide-react'
import TeamFlag from './team-flag'

type Match = {
  id: number
  home_team: string
  away_team: string
  home_team_flag: string | null
  away_team_flag: string | null
  match_date: string
  group_name: string | null
  stage: string
  prediction: { home_score: number; away_score: number } | null
}

function getUrgency(matchDate: Date): { label: string; color: string; bg: string } {
  const now = new Date()
  const mins = differenceInMinutes(matchDate, now)
  const hours = differenceInHours(matchDate, now)

  if (mins <= 60) return { label: '¡Cierra pronto!', color: 'text-red-400', bg: 'border-red-500/40 bg-red-500/5' }
  if (hours <= 24) return { label: 'Hoy', color: 'text-orange-400', bg: 'border-orange-500/40 bg-orange-500/5' }
  if (hours <= 48) return { label: 'Mañana', color: 'text-yellow-400', bg: 'border-yellow-500/30 bg-yellow-500/5' }
  return {
    label: formatDistanceToNow(matchDate, { locale: es, addSuffix: false }),
    color: 'text-slate-400',
    bg: 'border-slate-700 bg-slate-800/50',
  }
}

const STAGE_LABELS: Record<string, string> = {
  group: 'Fase de Grupos',
  round_of_32: 'Ronda de 32',
  round_of_16: 'Octavos',
  quarter: 'Cuartos',
  semi: 'Semifinal',
  third_place: '3er Puesto',
  final: 'Final',
}

export default function MatchTile({ match }: { match: Match }) {
  const matchDate = new Date(match.match_date)
  const urgency = getUrgency(matchDate)
  const hasPrediction = match.prediction !== null

  return (
    <Link href={`/matches/${match.id}`} className={`block rounded-2xl border p-4 transition hover:brightness-110 ${urgency.bg}`}>
      {/* Top row */}
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs font-semibold ${urgency.color}`}>
          {urgency.label}
        </span>
        <div className="flex items-center gap-1.5">
          {hasPrediction ? (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> Predicción enviada
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Clock className="w-3.5 h-3.5" /> Sin predicción
            </span>
          )}
        </div>
      </div>

      {/* Teams */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 flex flex-col items-center gap-1.5 text-center">
          <div className="text-3xl">
            {match.home_team_flag?.startsWith('http')
              ? <img src={match.home_team_flag} alt={match.home_team} className="w-10 h-10 object-contain mx-auto" />
              : <span>{match.home_team_flag ?? '🏳️'}</span>
            }
          </div>
          <span className="text-sm font-semibold leading-tight">{match.home_team}</span>
        </div>

        <div className="text-center px-2">
          <div className="text-slate-500 font-bold text-lg">vs</div>
          <div className="text-xs text-slate-500 mt-1">
            {matchDate.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center gap-1.5 text-center">
          <div className="text-3xl">
            {match.away_team_flag?.startsWith('http')
              ? <img src={match.away_team_flag} alt={match.away_team} className="w-10 h-10 object-contain mx-auto" />
              : <span>{match.away_team_flag ?? '🏳️'}</span>
            }
          </div>
          <span className="text-sm font-semibold leading-tight">{match.away_team}</span>
        </div>
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
        <span className="text-xs text-slate-500">
          {match.group_name ? `Grupo ${match.group_name}` : (STAGE_LABELS[match.stage] ?? match.stage)}
        </span>
        <span className="flex items-center gap-0.5 text-xs text-slate-400">
          {hasPrediction ? 'Editar' : 'Predecir'} <ChevronRight className="w-3 h-3" />
        </span>
      </div>
    </Link>
  )
}
