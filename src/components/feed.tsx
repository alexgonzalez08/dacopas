'use client'

import Link from 'next/link'
import { formatDistance, differenceInHours, differenceInMinutes, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CheckCircle2, Clock, Star, Trophy, UserPlus, ChevronRight } from 'lucide-react'
import PostInteractions from './post-interactions'
import UserPostCard from './user-post-card'
import UserAvatar from './user-avatar'

// ─── Types ───────────────────────────────────────────────────────────────────

type MatchPost = {
  kind: 'match'
  id: number
  home_team: string
  away_team: string
  home_team_flag: string | null
  away_team_flag: string | null
  match_date: string
  group_name: string | null
  stage: string
  prediction: { home_score: number; away_score: number } | null
  sortDate: Date
}

type ActivityPost = {
  kind: 'activity'
  id: string
  type: 'prediction' | 'result' | 'league_join'
  created_at: string
  user_id: string | null
  match_id: number | null
  league_id: string | null
  metadata: Record<string, any>
  profiles?: { username: string; avatar_url?: string | null } | null
  matches?: {
    id: number
    home_team: string
    away_team: string
    home_team_flag: string | null
    away_team_flag: string | null
    match_date: string
  } | null
  leagues?: { name: string } | null
  feed_reactions?: { id: string; emoji: string; user_id: string; profiles?: { username: string } }[]
  feed_comments?: { id: string; content: string; user_id: string; created_at: string; profiles?: { username: string } }[]
  sortDate: Date
}

type UserPostItem = {
  kind: 'user_post'
  id: string
  user_id: string
  content: string | null
  image_url: string | null
  created_at: string
  profiles?: { username: string; full_name?: string | null; avatar_url?: string | null } | null
  post_reactions?: { id: string; emoji: string; user_id: string }[]
  post_comments?: { id: string; content: string; user_id: string; created_at: string; profiles?: { username: string } }[]
  sortDate: Date
}

export type FeedItem = MatchPost | ActivityPost | UserPostItem

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(date: string, now: string) {
  return formatDistance(new Date(date), new Date(now), { addSuffix: true, locale: es })
}

function TeamCrest({ name, flagUrl }: { name: string; flagUrl: string | null }) {
  if (flagUrl?.startsWith('http')) {
    return <img src={flagUrl} alt={name} className="w-12 h-12 object-contain" />
  }
  return <span className="text-4xl">{flagUrl ?? '🏳️'}</span>
}

const STAGE_LABELS: Record<string, string> = {
  group: 'Fase de Grupos', round_of_32: 'Ronda de 32', round_of_16: 'Octavos',
  quarter: 'Cuartos', semi: 'Semifinal', third_place: '3er Puesto', final: 'Final',
}

function getUrgencyLabel(matchDate: Date, now: string): { label: string; accent: string } {
  const mins = differenceInMinutes(matchDate, new Date(now))
  const hours = differenceInHours(matchDate, new Date(now))
  if (mins <= 60) return { label: '⚠️ ¡Cierra en menos de 1 hora!', accent: 'text-red-400' }
  if (hours <= 24) return { label: '🔔 El partido es hoy', accent: 'text-orange-400' }
  if (hours <= 48) return { label: '📅 El partido es mañana', accent: 'text-yellow-400' }
  return {
    label: `📅 En ${formatDistance(matchDate, new Date(now), { locale: es })}`,
    accent: 'text-slate-400',
  }
}

// ─── Match Post ───────────────────────────────────────────────────────────────

function MatchPost({ item, now }: { item: MatchPost; now: string }) {
  const matchDate = new Date(item.match_date)
  const { label, accent } = getUrgencyLabel(matchDate, now)
  const hasPrediction = item.prediction !== null
  const stage = item.group_name ? `Grupo ${item.group_name}` : (STAGE_LABELS[item.stage] ?? item.stage)

  return (
    <div className="bg-slate-800 rounded-2xl overflow-hidden">
      {/* Header del post */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <div className="w-9 h-9 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0">
          <span className="text-lg">⚽</span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">MyScore FootApp</p>
          <p className={`text-xs ${accent}`}>{label}</p>
        </div>
      </div>

      {/* Cuerpo */}
      <div className="px-4 pb-2">
        <p className="text-sm text-slate-300 mb-4">
          ¡No te olvides de enviar tu predicción para el encuentro entre{' '}
          <span className="font-semibold text-white">{item.home_team}</span>
          {' '}y{' '}
          <span className="font-semibold text-white">{item.away_team}</span>!
        </p>

        {/* Card del partido */}
        <div className="bg-slate-700/50 rounded-xl p-4 mb-3">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs text-slate-400">{stage}</span>
            <span suppressHydrationWarning className="text-xs text-slate-400">
              {format(matchDate, "d MMM · HH:mm", { locale: es })}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-center gap-1 flex-1">
              <TeamCrest name={item.home_team} flagUrl={item.home_team_flag} />
              <span className="text-sm font-semibold text-center leading-tight">{item.home_team}</span>
            </div>
            <span className="text-slate-500 font-bold text-xl px-4">VS</span>
            <div className="flex flex-col items-center gap-1 flex-1">
              <TeamCrest name={item.away_team} flagUrl={item.away_team_flag} />
              <span className="text-sm font-semibold text-center leading-tight">{item.away_team}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer / CTA */}
      <Link
        href={`/matches/${item.id}`}
        className={`flex items-center justify-between px-4 py-3 border-t border-slate-700 hover:bg-slate-700/40 transition ${hasPrediction ? 'text-green-400' : 'text-yellow-400'}`}
      >
        <span className="text-sm font-semibold flex items-center gap-2">
          {hasPrediction
            ? <><CheckCircle2 className="w-4 h-4" /> Predicción enviada — editar</>
            : <><Clock className="w-4 h-4" /> Enviar predicción</>
          }
        </span>
        <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  )
}

// ─── Activity Posts ───────────────────────────────────────────────────────────

function PredictionPost({ item, userId, now }: { item: ActivityPost; userId: string; now: string }) {
  const match = item.matches
  const nowDate = new Date(now)
  const isLocked = match
    ? nowDate >= new Date(new Date(match.match_date).getTime() - 15 * 60 * 1000)
    : true
  const score = item.metadata?.home_score !== undefined && isLocked
    ? `${item.metadata.home_score} - ${item.metadata.away_score}`
    : null

  return (
    <div className="bg-slate-800 rounded-2xl p-4">
      <div className="flex gap-3">
        <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
          <Star className="w-4 h-4 text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <UserAvatar
                username={item.profiles?.username ?? ''}
                avatarUrl={item.profiles?.avatar_url}
                size="sm"
                linkable={false}
              />
              <span className="font-semibold text-white truncate">{item.profiles?.username ?? 'Usuario'}</span>
            </div>
            <span className="text-slate-400">envió su predicción para</span>
            {match
              ? <Link href={`/matches/${match.id}`} className="text-yellow-400 hover:underline font-medium min-w-0 truncate">{match.home_team} vs {match.away_team}</Link>
              : <span className="text-slate-300">un partido</span>
            }
            {score && <span className="text-slate-400">· <span className="text-white font-bold">{score}</span></span>}
            {!score && isLocked === false && <span className="text-xs text-slate-500">(oculto hasta el inicio)</span>}
          </div>
          <p suppressHydrationWarning className="text-xs text-slate-500 mt-1">{timeAgo(item.created_at, now)}</p>
        </div>
      </div>
      <PostInteractions
        eventId={item.id}
        userId={userId}
        initialReactions={item.feed_reactions ?? []}
        initialComments={item.feed_comments ?? []}
      />
    </div>
  )
}

function ResultPost({ item, userId, now }: { item: ActivityPost; userId: string; now: string }) {
  const m = item.metadata
  const match = item.matches
  return (
    <div className="bg-slate-800 rounded-2xl p-4">
      <div className="flex gap-3">
        <div className="w-9 h-9 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
          <Trophy className="w-4 h-4 text-green-400" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-slate-400 mb-2">Resultado final</p>
          <div className="flex items-center gap-3">
            {match && <img src={match.home_team_flag ?? ''} alt="" className="w-6 h-6 object-contain" />}
            <span className="text-sm font-medium">{m.home_team}</span>
            <span className="text-xl font-black text-yellow-400">{m.home_score} - {m.away_score}</span>
            <span className="text-sm font-medium">{m.away_team}</span>
            {match && <img src={match.away_team_flag ?? ''} alt="" className="w-6 h-6 object-contain" />}
          </div>
          <p suppressHydrationWarning className="text-xs text-slate-500 mt-1">{timeAgo(item.created_at, now)}</p>
        </div>
      </div>
      <PostInteractions
        eventId={item.id}
        userId={userId}
        initialReactions={item.feed_reactions ?? []}
        initialComments={item.feed_comments ?? []}
      />
    </div>
  )
}

function LeagueJoinPost({ item, userId, now }: { item: ActivityPost; userId: string; now: string }) {
  return (
    <div className="bg-slate-800 rounded-2xl p-4">
      <div className="flex gap-3">
        <div className="w-9 h-9 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
          <UserPlus className="w-4 h-4 text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <UserAvatar
                username={item.profiles?.username ?? ''}
                avatarUrl={item.profiles?.avatar_url}
                size="sm"
                linkable={false}
              />
              <span className="font-semibold text-white truncate">{item.profiles?.username ?? 'Usuario'}</span>
            </div>
            <span className="text-slate-400">se unió a la liga</span>
            {item.leagues
              ? <Link href={`/leagues/${item.league_id}`} className="text-yellow-400 hover:underline font-medium min-w-0 truncate">{item.leagues.name}</Link>
              : <span className="text-slate-300">una liga</span>
            }
          </div>
          <p suppressHydrationWarning className="text-xs text-slate-500 mt-1">{timeAgo(item.created_at, now)}</p>
        </div>
      </div>
      <PostInteractions
        eventId={item.id}
        userId={userId}
        initialReactions={item.feed_reactions ?? []}
        initialComments={item.feed_comments ?? []}
      />
    </div>
  )
}

// ─── Feed principal ───────────────────────────────────────────────────────────

export default function Feed({
  items,
  userId,
  onDeletePost,
  serverNow,
}: {
  items: FeedItem[]
  userId: string
  onDeletePost?: (id: string) => void
  serverNow: string
}) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <p className="text-4xl mb-3">⚽</p>
        <p className="text-sm">El feed está vacío. Unite a una liga para ver actividad.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map(item => {
        if (item.kind === 'match') return <MatchPost key={`match-${item.id}`} item={item} now={serverNow} />
        if (item.kind === 'user_post') return (
          <UserPostCard
            key={item.id}
            post={item as any}
            userId={userId}
            onDelete={onDeletePost ?? (() => {})}
          />
        )
        if (item.kind === 'activity') {
          const a = item as ActivityPost
          if (a.type === 'prediction') return <PredictionPost key={a.id} item={a} userId={userId} now={serverNow} />
          if (a.type === 'result') return <ResultPost key={a.id} item={a} userId={userId} now={serverNow} />
          if (a.type === 'league_join') return <LeagueJoinPost key={a.id} item={a} userId={userId} now={serverNow} />
        }
        return null
      })}
    </div>
  )
}
