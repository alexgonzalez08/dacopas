'use client'

import Link from 'next/link'
import { formatDistance, differenceInHours, differenceInMinutes, format, isToday, isTomorrow, startOfDay, addDays } from 'date-fns'
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
  type: 'prediction' | 'result' | 'league_join' | 'league_create' | 'league_ended'
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
  const nowDate = new Date(now)
  const mins = differenceInMinutes(matchDate, nowDate)
  if (mins <= 60) return { label: '⚠️ ¡Cierra en menos de 1 hora!', accent: 'text-red-400' }
  if (isToday(matchDate)) return { label: '🔔 El partido es hoy', accent: 'text-orange-400' }
  if (isTomorrow(matchDate)) return { label: '📅 El partido es mañana', accent: 'text-yellow-400' }
  const dayName = format(matchDate, 'EEEE', { locale: es })
  const daysUntil = Math.ceil(differenceInHours(startOfDay(matchDate), startOfDay(nowDate)) / 24)
  return {
    label: `📅 El partido es el ${dayName}${daysUntil <= 7 ? '' : ` (en ${formatDistance(matchDate, nowDate, { locale: es })})`}`,
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
          <p className="text-sm font-semibold text-white">Dacopas</p>
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

function ActivityHeader({ item, now }: { item: ActivityPost; now: string }) {
  return (
    <div className="flex items-center gap-3 mb-2">
      <UserAvatar
        username={item.profiles?.username ?? ''}
        avatarUrl={item.profiles?.avatar_url}
        size="md"
      />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white leading-tight truncate">
          {item.profiles?.username ?? 'Usuario'}
        </p>
        <p suppressHydrationWarning className="text-xs text-slate-500">
          {timeAgo(item.created_at, now)}
        </p>
      </div>
    </div>
  )
}

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
      <ActivityHeader item={item} now={now} />
      <p className="text-sm text-slate-300 mb-1">
        <span className="text-slate-400">Envió su predicción para </span>
        {match
          ? <Link href={`/matches/${match.id}`} className="text-yellow-400 hover:underline font-medium">{match.home_team} vs {match.away_team}</Link>
          : <span>un partido</span>
        }
        {score && <span className="text-slate-400"> · <span className="text-white font-bold">{score}</span></span>}
        {!score && !isLocked && <span className="text-xs text-slate-500 ml-1">(oculto hasta el inicio)</span>}
      </p>
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
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
          <Trophy className="w-4 h-4 text-green-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Resultado final</p>
          <p suppressHydrationWarning className="text-xs text-slate-500">{timeAgo(item.created_at, now)}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm">
        {match?.home_team_flag?.startsWith('http') && <img src={match.home_team_flag} alt="" className="w-5 h-5 object-contain shrink-0" />}
        <span className="font-medium truncate">{m.home_team}</span>
        <span className="text-lg font-black text-yellow-400 shrink-0">{m.home_score} - {m.away_score}</span>
        <span className="font-medium truncate">{m.away_team}</span>
        {match?.away_team_flag?.startsWith('http') && <img src={match.away_team_flag} alt="" className="w-5 h-5 object-contain shrink-0" />}
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
      <ActivityHeader item={item} now={now} />
      <p className="text-sm text-slate-300 mb-1">
        <span className="text-slate-400">Se unió al torneo </span>
        {item.leagues
          ? <Link href={`/leagues/${item.league_id}`} className="text-yellow-400 hover:underline font-medium">{item.leagues.name}</Link>
          : <span>un torneo</span>
        }
      </p>
      <PostInteractions eventId={item.id} userId={userId} initialReactions={item.feed_reactions ?? []} initialComments={item.feed_comments ?? []} />
    </div>
  )
}

const RANK_STYLES = [
  { bg: 'from-yellow-500/30 to-yellow-600/10', border: 'border-yellow-500/40', medal: '🥇', text: 'text-yellow-400' },
  { bg: 'from-slate-400/20 to-slate-500/10', border: 'border-slate-400/40', medal: '🥈', text: 'text-slate-300' },
  { bg: 'from-amber-700/20 to-amber-800/10', border: 'border-amber-600/40', medal: '🥉', text: 'text-amber-500' },
]

function LeagueEndedPost({ item }: { item: ActivityPost }) {
  const leagueName = item.metadata?.league_name ?? 'el torneo'
  const top3: { rank: number; username: string; points: number; exact_results: number }[] = item.metadata?.top3 ?? []

  return (
    <div className="rounded-2xl overflow-hidden border border-yellow-500/20 bg-gradient-to-b from-slate-800 to-slate-900">
      {/* Banner */}
      <div className="bg-gradient-to-r from-yellow-600/20 via-yellow-500/10 to-slate-800 px-4 py-4 flex items-center gap-3 border-b border-yellow-500/20">
        <div className="text-3xl">🏆</div>
        <div>
          <p className="text-xs text-yellow-400 font-semibold uppercase tracking-wider">Torneo Finalizado</p>
          <p className="font-bold text-white text-lg leading-tight">{leagueName}</p>
        </div>
      </div>

      {/* Top 3 */}
      {top3.length > 0 && (
        <div className="px-4 py-4 space-y-2">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-3">Podio final</p>
          {top3.map((entry, i) => {
            const style = RANK_STYLES[i]
            return (
              <div key={entry.username} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gradient-to-r ${style.bg} border ${style.border}`}>
                <span className="text-xl">{style.medal}</span>
                <Link href={`/profile/${entry.username}`} className={`flex-1 font-bold hover:underline ${style.text}`}>
                  @{entry.username}
                </Link>
                <div className="text-right">
                  <p className={`font-bold text-sm ${style.text}`}>{entry.points} pts</p>
                  <p className="text-xs text-slate-500">{entry.exact_results} exactos</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="px-4 pb-4">
        <Link
          href={`/leagues/${item.league_id}`}
          className="block text-center text-xs text-slate-500 hover:text-yellow-400 transition"
        >
          Ver tabla final →
        </Link>
      </div>
    </div>
  )
}

function LeagueCreatePost({ item, userId, now }: { item: ActivityPost; userId: string; now: string }) {
  return (
    <div className="bg-slate-800 rounded-2xl p-4">
      <ActivityHeader item={item} now={now} />
      <p className="text-sm text-slate-300 mb-1">
        <span className="text-slate-400">Creó el torneo </span>
        {item.leagues
          ? <Link href={`/leagues/${item.league_id}`} className="text-yellow-400 hover:underline font-medium">{item.leagues.name}</Link>
          : <span>un torneo</span>
        }
        <span className="text-slate-400"> para el </span>
        <span className="font-medium text-white">Mundial 2026</span>
      </p>
      <PostInteractions eventId={item.id} userId={userId} initialReactions={item.feed_reactions ?? []} initialComments={item.feed_comments ?? []} />
    </div>
  )
}

// ─── Feed principal ───────────────────────────────────────────────────────────

export default function Feed({
  items,
  userId,
  userAvatarUrl,
  onDeletePost,
  serverNow,
}: {
  items: FeedItem[]
  userId: string
  userAvatarUrl?: string | null
  onDeletePost?: (id: string) => void
  serverNow: string
}) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <p className="text-4xl mb-3">⚽</p>
        <p className="text-sm">El feed está vacío. Unite a un torneo para ver actividad.</p>
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
            userAvatarUrl={userAvatarUrl}
            onDelete={onDeletePost ?? (() => {})}
          />
        )
        if (item.kind === 'activity') {
          const a = item as ActivityPost
          if (a.type === 'prediction') return <PredictionPost key={a.id} item={a} userId={userId} now={serverNow} />
          if (a.type === 'result') return <ResultPost key={a.id} item={a} userId={userId} now={serverNow} />
          if (a.type === 'league_join') return <LeagueJoinPost key={a.id} item={a} userId={userId} now={serverNow} />
          if (a.type === 'league_create') return <LeagueCreatePost key={a.id} item={a} userId={userId} now={serverNow} />
          if (a.type === 'league_ended') return <LeagueEndedPost key={a.id} item={a} />
        }
        return null
      })}
    </div>
  )
}
