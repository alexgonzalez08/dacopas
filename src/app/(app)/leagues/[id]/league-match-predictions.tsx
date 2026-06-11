'use client'
import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import MatchTime from '@/components/match-time'
import { ChevronDown, ChevronUp } from 'lucide-react'

type MatchPrediction = {
  user_id: string
  username: string
  home_score: number | null
  away_score: number | null
  points: number | null
}

type MatchWithPredictions = {
  id: string
  home_team: string
  away_team: string
  home_team_flag: string | null
  away_team_flag: string | null
  match_date: string
  status: string
  home_score: number | null
  away_score: number | null
  predictions: MatchPrediction[]
}

function TeamFlag({ flag, name }: { flag: string | null; name: string }) {
  if (!flag) return <span className="text-2xl">🏳️</span>
  if (flag.startsWith('http')) return <img src={flag} alt={name} className="w-8 h-8 object-contain" />
  return <span className="text-2xl">{flag}</span>
}

function MatchCard({ match, currentUserId }: { match: MatchWithPredictions; currentUserId: string }) {
  const [open, setOpen] = useState(false)
  const isFinished = match.status === 'finished'
  const isLive = match.status === 'live'
  const isPending = !isFinished && !isLive

  const date = new Date(match.match_date)

  return (
    <div className="bg-slate-800 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-700/50 transition"
      >
        {/* Fecha */}
        <div className="text-left shrink-0 w-16">
          <p className="text-xs text-slate-500">{format(date, 'd MMM', { locale: es })}</p>
          <p className="text-xs text-slate-400 font-medium"><MatchTime matchDate={date} /></p>
        </div>

        {/* Equipos y marcador */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <TeamFlag flag={match.home_team_flag} name={match.home_team} />
          <span className="text-sm font-medium truncate">{match.home_team}</span>
          <div className="shrink-0 px-2">
            {isFinished ? (
              <span className="text-sm font-bold text-yellow-400">{match.home_score} - {match.away_score}</span>
            ) : isLive ? (
              <span className="text-sm font-bold text-green-400 animate-pulse">{match.home_score} - {match.away_score}</span>
            ) : (
              <span className="text-xs text-slate-500">vs</span>
            )}
          </div>
          <span className="text-sm font-medium truncate">{match.away_team}</span>
          <TeamFlag flag={match.away_team_flag} name={match.away_team} />
        </div>

        {/* Estado */}
        <div className="shrink-0 flex items-center gap-2">
          {isFinished && <span className="text-xs text-green-400 hidden sm:block">Finalizado</span>}
          {isLive && <span className="text-xs text-green-400 animate-pulse hidden sm:block">En curso</span>}
          {isPending && <span className="text-xs text-slate-500 hidden sm:block">Programado</span>}
          {open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-700 px-4 py-3">
          {isPending ? (
            <p className="text-sm text-slate-500 text-center py-2">⏳ Partido por jugarse</p>
          ) : (
            <div className="space-y-2">
              {match.predictions.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-2">Sin pronósticos registrados</p>
              ) : (
                match.predictions.map(pred => {
                  const isMe = pred.user_id === currentUserId
                  const hasPred = pred.home_score !== null && pred.away_score !== null
                  return (
                    <div
                      key={pred.user_id}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl ${isMe ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-slate-700/40'}`}
                    >
                      <span className={`text-sm font-medium flex-1 truncate ${isMe ? 'text-yellow-400' : 'text-slate-300'}`}>
                        @{pred.username}
                      </span>
                      {hasPred ? (
                        <span className="text-sm font-bold text-white shrink-0">
                          {pred.home_score} - {pred.away_score}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500 shrink-0">Sin pronóstico</span>
                      )}
                      {isFinished && (
                        <span className={`text-xs font-bold shrink-0 w-12 text-right ${
                          pred.points === 3 ? 'text-yellow-400' :
                          pred.points === 1 ? 'text-green-400' :
                          pred.points === 0 ? 'text-slate-500' : 'text-slate-600'
                        }`}>
                          {pred.points !== null ? `${pred.points} pts` : '— pts'}
                        </span>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function LeagueMatchPredictions({
  matches,
  currentUserId,
}: {
  matches: MatchWithPredictions[]
  currentUserId: string
}) {
  if (matches.length === 0) return null

  return (
    <div>
      <h2 className="font-semibold mb-3 text-slate-300">Pronósticos por partido</h2>
      <div className="space-y-2">
        {matches.map(match => (
          <MatchCard key={match.id} match={match} currentUserId={currentUserId} />
        ))}
      </div>
    </div>
  )
}
