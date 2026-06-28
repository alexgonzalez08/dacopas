'use client'

import Link from 'next/link'
import { formatDistance, differenceInHours, differenceInMinutes, format, isToday, isTomorrow, startOfDay, addDays } from 'date-fns'
import MatchTime from '@/components/match-time'
import { es } from 'date-fns/locale'
import { CheckCircle2, Clock, Star, Trophy, UserPlus, ChevronRight, Save, CheckCircle } from 'lucide-react'
import PostInteractions from './post-interactions'
import UserPostCard from './user-post-card'
import StatsPostCard from './stats-post-card'
import BracketPostCard from './bracket-post-card'
import UserAvatar from './user-avatar'
import { useState, useEffect, useCallback, useRef } from 'react'
import { upsertPrediction } from '@/lib/predictions'
import UnsavedChangesGuard from './unsaved-changes-guard'
import { useUnsavedChanges } from '@/lib/unsaved-changes-context'

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
  is_system?: boolean
  post_type?: string | null
  metadata?: Record<string, any> | null
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

function MatchPost({ item, userId, now, onDirtyChange, onNavigate }: {
  item: MatchPost
  userId: string
  now: string
  onDirtyChange: (id: number, dirty: boolean) => void
  onNavigate: (href: string) => void
}) {
  const matchDate = new Date(item.match_date)
  const { label, accent } = getUrgencyLabel(matchDate, now)
  const stage = item.group_name ? `Grupo ${item.group_name}` : (STAGE_LABELS[item.stage] ?? item.stage)

  const initialHome = item.prediction ? String(item.prediction.home_score) : ''
  const initialAway = item.prediction ? String(item.prediction.away_score) : ''

  const [home, setHome] = useState(initialHome)
  const [away, setAway] = useState(initialAway)
  const [committedHome, setCommittedHome] = useState(initialHome)
  const [committedAway, setCommittedAway] = useState(initialAway)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const isDirty = home !== committedHome || away !== committedAway

  useEffect(() => {
    onDirtyChange(item.id, isDirty)
  }, [isDirty, item.id, onDirtyChange])

  // Limpiar al desmontar
  useEffect(() => () => onDirtyChange(item.id, false), [item.id, onDirtyChange])

  async function handleSave() {
    const h = parseInt(home)
    const a = parseInt(away)
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) {
      setError('Ingresá un resultado válido')
      return
    }
    setSaving(true)
    setError('')
    try {
      await upsertPrediction(userId, item.id, h, a)
      setCommittedHome(String(h))
      setCommittedAway(String(a))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const hasPrediction = saved || item.prediction !== null

  return (
    <div className="bg-slate-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <div className="w-9 h-9 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0">
          <span className="text-lg">⚽</span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">Dacopas</p>
          <p className={`text-xs ${accent}`}>{label}</p>
        </div>
      </div>

      {/* Predicción inline */}
      <div className="px-4 pb-4">
        <div className="bg-slate-700/50 rounded-xl p-4">
          <div className="flex items-center justify-between gap-2 mb-4">
            <span className="text-xs text-slate-400">{stage}</span>
            <span suppressHydrationWarning className="text-xs text-slate-400">
              {format(matchDate, "d MMM · ", { locale: es })}<MatchTime matchDate={matchDate} />
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1 flex-1">
              <TeamCrest name={item.home_team} flagUrl={item.home_team_flag} />
              <span className="text-xs font-semibold text-center leading-tight">{item.home_team}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="number" min="0" max="20"
                value={home}
                onChange={e => setHome(e.target.value)}
                className="w-11 text-center bg-slate-600 border border-slate-500 rounded-lg py-1.5 text-lg font-bold focus:outline-none focus:border-yellow-500"
              />
              <span className="text-slate-500 font-bold">-</span>
              <input
                type="number" min="0" max="20"
                value={away}
                onChange={e => setAway(e.target.value)}
                className="w-11 text-center bg-slate-600 border border-slate-500 rounded-lg py-1.5 text-lg font-bold focus:outline-none focus:border-yellow-500"
              />
            </div>
            <div className="flex flex-col items-center gap-1 flex-1">
              <TeamCrest name={item.away_team} flagUrl={item.away_team_flag} />
              <span className="text-xs font-semibold text-center leading-tight">{item.away_team}</span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-red-400">{error}</span>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500 text-slate-900 text-xs font-semibold rounded-lg hover:bg-yellow-400 disabled:opacity-50 transition"
            >
              {saving
                ? <span className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                : saved || hasPrediction
                  ? <><CheckCircle className="w-3.5 h-3.5" /> {saved ? 'Guardado' : 'Actualizar'}</>
                  : <><Save className="w-3.5 h-3.5" /> Guardar</>
              }
            </button>
          </div>
        </div>
      </div>

      {/* Footer — ver detalles */}
      <button
        onClick={() => onNavigate(`/matches/${item.id}`)}
        className="w-full flex items-center justify-between px-4 py-3 border-t border-slate-700 hover:bg-slate-700/40 transition text-slate-400 hover:text-white"
      >
        <span className="text-xs flex items-center gap-2">
          Ver detalles del partido
          {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block" />}
        </span>
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
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
      <p className="text-sm text-slate-400 mb-1">
        Está enviando sus pronósticos para el <span className="text-white font-medium">Mundial 2026</span> ⚽
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
  const dirtyRef = useRef<Set<number>>(new Set())
  const [hasAnyDirty, setHasAnyDirty] = useState(false)
  const { navigate } = useUnsavedChanges()

  const handleDirtyChange = useCallback((id: number, dirty: boolean) => {
    if (dirty) dirtyRef.current.add(id)
    else dirtyRef.current.delete(id)
    setHasAnyDirty(dirtyRef.current.size > 0)
  }, [])

  const handleNavigate = useCallback((href: string) => {
    navigate(href)
  }, [navigate])

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <p className="text-4xl mb-3">⚽</p>
        <p className="text-sm">El feed está vacío. Unite a un torneo para ver actividad.</p>
      </div>
    )
  }

  return (
    <>
    <UnsavedChangesGuard isDirty={hasAnyDirty} id="feed" />
    <div className="space-y-3">
      {items.map(item => {
        if (item.kind === 'match') return <MatchPost key={`match-${item.id}`} item={item} userId={userId} now={serverNow} onDirtyChange={handleDirtyChange} onNavigate={handleNavigate} />
        if (item.kind === 'user_post') {
          if ((item as any).post_type === 'stats') return (
            <StatsPostCard
              key={item.id}
              post={item as any}
              userId={userId}
              userAvatarUrl={userAvatarUrl}
            />
          )
          if ((item as any).post_type === 'bracket_announcement') return (
            <BracketPostCard
              key={item.id}
              post={item as any}
              userId={userId}
              userAvatarUrl={userAvatarUrl}
            />
          )
          return (
            <UserPostCard
              key={item.id}
              post={item as any}
              userId={userId}
              userAvatarUrl={userAvatarUrl}
              onDelete={onDeletePost ?? (() => {})}
            />
          )
        }
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
    </>
  )
}
