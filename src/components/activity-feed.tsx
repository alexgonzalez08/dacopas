import { formatDistanceToNow, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Trophy, UserPlus, Star } from 'lucide-react'
import Link from 'next/link'
import TeamFlag from './team-flag'

type FeedEvent = {
  id: string
  type: 'prediction' | 'result' | 'league_join' | 'league_create'
  created_at: string
  user_id: string | null
  match_id: number | null
  league_id: string | null
  metadata: Record<string, any>
  profiles?: { username: string } | null
  matches?: {
    id: number
    home_team: string
    away_team: string
    home_team_flag: string | null
    away_team_flag: string | null
    home_score: number | null
    away_score: number | null
    match_date: string
  } | null
  leagues?: { name: string } | null
}

function timeAgo(date: string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es })
}

function PredictionEvent({ event }: { event: FeedEvent }) {
  const match = event.matches
  // Mostrar marcador solo si el plazo ya cerró (15 min antes del partido)
  const isLocked = match
    ? new Date() >= new Date(new Date(match.match_date).getTime() - 15 * 60 * 1000)
    : true
  const score = event.metadata?.home_score !== undefined && isLocked
    ? `${event.metadata.home_score} - ${event.metadata.away_score}`
    : null

  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
        <Star className="w-4 h-4 text-blue-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="font-semibold text-white">{event.profiles?.username}</span>
          <span className="text-slate-400"> predijo </span>
          {match ? (
            <Link href={`/matches/${match.id}`} className="text-yellow-400 hover:underline">
              {match.home_team} vs {match.away_team}
            </Link>
          ) : 'un partido'}
          {score && <span className="text-slate-400"> → <span className="text-white font-semibold">{score}</span></span>}
        </p>
        <p className="text-xs text-slate-500 mt-0.5">{timeAgo(event.created_at)}</p>
      </div>
    </div>
  )
}

function ResultEvent({ event }: { event: FeedEvent }) {
  const m = event.metadata
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
        <Trophy className="w-4 h-4 text-green-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-400">Resultado final</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm font-medium text-white">
            <TeamFlag name={m.home_team} flagUrl={event.matches?.home_team_flag} />
          </span>
          <span className="text-lg font-black text-yellow-400">{m.home_score} - {m.away_score}</span>
          <span className="text-sm font-medium text-white">
            <TeamFlag name={m.away_team} flagUrl={event.matches?.away_team_flag} />
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{timeAgo(event.created_at)}</p>
      </div>
    </div>
  )
}

function LeagueJoinEvent({ event }: { event: FeedEvent }) {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
        <UserPlus className="w-4 h-4 text-purple-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="font-semibold text-white">{event.profiles?.username}</span>
          <span className="text-slate-400"> se unió a </span>
          {event.leagues ? (
            <Link href={`/leagues/${event.league_id}`} className="text-yellow-400 hover:underline">
              {event.leagues.name}
            </Link>
          ) : 'un torneo'}
        </p>
        <p className="text-xs text-slate-500 mt-0.5">{timeAgo(event.created_at)}</p>
      </div>
    </div>
  )
}

function LeagueCreateEvent({ event }: { event: FeedEvent }) {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0">
        <Trophy className="w-4 h-4 text-yellow-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="font-semibold text-white">{event.profiles?.username}</span>
          <span className="text-slate-400"> creó el torneo </span>
          {event.leagues ? (
            <Link href={`/leagues/${event.league_id}`} className="text-yellow-400 hover:underline">
              {event.leagues.name}
            </Link>
          ) : 'un torneo'}
          <span className="text-slate-400"> para el </span>
          <span className="text-white font-medium">Mundial 2026</span>
        </p>
        <p className="text-xs text-slate-500 mt-0.5">{timeAgo(event.created_at)}</p>
      </div>
    </div>
  )
}

export default function ActivityFeed({ events }: { events: FeedEvent[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
        Los Temas Actuales
      </h3>
      {events.length === 0 ? (
        <p className="text-slate-500 text-sm">No hay actividad reciente de tus seguidores.</p>
      ) : (
        <div className="space-y-4">
          {events.map(event => (
            <div key={event.id}>
              {event.type === 'prediction' && <PredictionEvent event={event} />}
              {event.type === 'result' && <ResultEvent event={event} />}
              {event.type === 'league_join' && <LeagueJoinEvent event={event} />}
              {event.type === 'league_create' && <LeagueCreateEvent event={event} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
