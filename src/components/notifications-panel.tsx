'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UserCheck, Check, Loader2, Users, Trash2, X, UserX, Shield, LogOut, ExternalLink, Trophy, MessageCircle, Heart, FileText, Clock } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import UserAvatar from '@/components/user-avatar'
import WhistleIcon from '@/components/whistle-icon'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { joinLeague } from '@/lib/leagues'
import { sendPushNotification } from '@/lib/push'

type Profile = { id: string; username: string; full_name: string | null; avatar_url: string | null }
export type Notification = {
  id: string
  type: string
  read: boolean
  created_at: string
  from_user: Profile | null
  from_user_id: string | null
  metadata: Record<string, any>
  alreadyJoined?: boolean
  alreadyAccepted?: boolean
  alreadyDeclined?: boolean
  accepted?: boolean
  declined?: boolean
  joined?: boolean
}

function timeAgo(date: string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es })
}

function NotificationIcon({ type }: { type: string }) {
  const wrap = (bg: string, el: React.ReactNode) => (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${bg}`}>{el}</div>
  )
  if (type === 'follow_request') return wrap('bg-yellow-500/20', <WhistleIcon className="w-4 h-4 text-yellow-400" />)
  if (type === 'follow_accepted') return wrap('bg-green-500/20', <UserCheck className="w-4 h-4 text-green-400" />)
  if (type === 'league_invite' || type === 'league_added') return wrap('bg-blue-500/20', <Users className="w-4 h-4 text-blue-400" />)
  if (type === 'league_invite_accepted') return wrap('bg-green-500/20', <Check className="w-4 h-4 text-green-400" />)
  if (type === 'mod_invite_request') return wrap('bg-purple-500/20', <Shield className="w-4 h-4 text-purple-400" />)
  if (type === 'mod_invite_approved') return wrap('bg-green-500/20', <Check className="w-4 h-4 text-green-400" />)
  if (type === 'mod_invite_declined') return wrap('bg-red-500/20', <X className="w-4 h-4 text-red-400" />)
  if (type === 'member_left') return wrap('bg-slate-700', <LogOut className="w-4 h-4 text-slate-400" />)
  if (type === 'league_created') return wrap('bg-yellow-500/20', <Trophy className="w-4 h-4 text-yellow-400" />)
  if (type === 'league_ended') return wrap('bg-yellow-500/30', <Trophy className="w-4 h-4 text-yellow-300" />)
  if (type === 'join_request') return wrap('bg-purple-500/20', <Users className="w-4 h-4 text-purple-400" />)
  if (type === 'friend_post') return wrap('bg-blue-500/20', <FileText className="w-4 h-4 text-blue-400" />)
  if (type === 'post_reaction') return wrap('bg-pink-500/20', <Heart className="w-4 h-4 text-pink-400" />)
  if (type === 'post_comment') return wrap('bg-green-500/20', <MessageCircle className="w-4 h-4 text-green-400" />)
  if (type === 'match_starting_soon') return wrap('bg-orange-500/20', <Clock className="w-4 h-4 text-orange-400" />)
  if (type === 'match_started') return wrap('bg-green-500/20', <Clock className="w-4 h-4 text-green-400" />)
  if (type === 'welcome_blast') return wrap('bg-yellow-500/20', <Trophy className="w-4 h-4 text-yellow-400" />)
  if (type === 'match_finished') return wrap('bg-slate-700', <Trophy className="w-4 h-4 text-green-400" />)
  return wrap('bg-slate-700', <WhistleIcon className="w-4 h-4 text-slate-400" />)
}

function NotificationItem({
  notif, userId, onAccept, onDecline, accepting, declining,
  onJoin, joining, joinError, onApproveModInvite, onDeclineModInvite,
  onRequestJoin, onApproveJoinRequest, onDeclineJoinRequest,
  onDelete, deleting,
}: {
  notif: Notification
  userId: string
  onAccept: (n: Notification) => void
  onDecline: (n: Notification) => void
  accepting: string | null
  declining: string | null
  onJoin: (n: Notification) => void
  joining: string | null
  joinError: string | null
  onApproveModInvite: (n: Notification) => void
  onDeclineModInvite: (n: Notification) => void
  onRequestJoin: (n: Notification) => void
  onApproveJoinRequest: (n: Notification) => void
  onDeclineJoinRequest: (n: Notification) => void
  onDelete: (id: string) => void
  deleting: string | null
}) {
  const user = notif.from_user
  const name = user?.username ?? 'Alguien'
  const isJoined = notif.alreadyJoined || notif.joined
  const isAccepted = notif.alreadyAccepted || notif.accepted
  const isDeclined = notif.alreadyDeclined || notif.declined

  const btnYellow = 'flex items-center gap-1.5 text-xs px-3 py-1.5 bg-yellow-500 text-slate-900 font-semibold rounded-lg hover:bg-yellow-400 disabled:opacity-50 transition'
  const btnGray = 'flex items-center gap-1.5 text-xs px-3 py-1.5 bg-slate-700 text-slate-300 font-semibold rounded-lg hover:bg-slate-600 disabled:opacity-50 transition'

  return (
    <div className={`flex items-start gap-3 px-3 py-3 rounded-xl transition ${!notif.read ? 'bg-slate-800 border border-slate-700' : 'bg-slate-800/40'}`}>
      <NotificationIcon type={notif.type} />
      <div className="flex-1 min-w-0 space-y-1.5">
        {user && <UserAvatar username={user.username} fullName={user.full_name} avatarUrl={user.avatar_url} size="sm" />}

        {notif.type === 'follow_request' && (
          <>
            <p className="text-sm text-slate-200">
              <Link href={`/profile/${name}`} className="font-semibold text-white hover:text-yellow-400">@{name}</Link>
              <span className="text-slate-400"> te envió una solicitud de amistad</span>
            </p>
            {isAccepted ? <span className="inline-flex items-center gap-1.5 text-xs text-green-400"><UserCheck className="w-3.5 h-3.5" /> Ya son amigos</span>
              : isDeclined ? <span className="inline-flex items-center gap-1.5 text-xs text-slate-500"><UserX className="w-3.5 h-3.5" /> Solicitud declinada</span>
              : <div className="flex gap-2">
                  <button onClick={() => onAccept(notif)} disabled={accepting === notif.id || declining === notif.id} className={btnYellow}>
                    {accepting === notif.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Aceptar
                  </button>
                  <button onClick={() => onDecline(notif)} disabled={accepting === notif.id || declining === notif.id} className={btnGray}>
                    {declining === notif.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />} Declinar
                  </button>
                </div>}
          </>
        )}

        {notif.type === 'follow_accepted' && (
          <p className="text-sm text-slate-200">
            <Link href={`/profile/${name}`} className="font-semibold text-white hover:text-yellow-400">@{name}</Link>
            <span className="text-slate-400"> aceptó tu solicitud de amistad</span>
          </p>
        )}

        {notif.type === 'league_invite' && (
          <div className="space-y-1.5">
            <p className="text-sm text-slate-200">
              <Link href={`/profile/${name}`} className="font-semibold text-white hover:text-yellow-400">@{name}</Link>
              <span className="text-slate-400"> te invitó al torneo </span>
              <Link href={`/leagues/${notif.metadata?.league_id}`} className="font-semibold text-yellow-400 hover:underline">"{notif.metadata?.league_name}"</Link>
            </p>
            {isJoined ? <span className="inline-flex items-center gap-1.5 text-xs text-green-400"><Check className="w-3.5 h-3.5" /> Te uniste al torneo</span>
              : isDeclined ? <span className="inline-flex items-center gap-1.5 text-xs text-slate-500"><X className="w-3.5 h-3.5" /> Invitación declinada</span>
              : <div className="flex gap-2">
                  <button onClick={() => onJoin(notif)} disabled={joining === notif.id || declining === notif.id} className={btnYellow}>
                    {joining === notif.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Aceptar
                  </button>
                  <button onClick={() => onDecline(notif)} disabled={joining === notif.id || declining === notif.id} className={btnGray}>
                    {declining === notif.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />} Declinar
                  </button>
                  {joinError && joining !== notif.id && <p className="text-xs text-red-400">{joinError}</p>}
                </div>}
          </div>
        )}

        {notif.type === 'league_invite_accepted' && (
          <div className="space-y-1">
            <p className="text-sm text-slate-200">
              <Link href={`/profile/${notif.metadata?.username}`} className="font-semibold text-white hover:text-yellow-400">@{notif.metadata?.username}</Link>
              <span className="text-slate-400"> aceptó tu invitación y se unió a </span>
              <Link href={`/leagues/${notif.metadata?.league_id}`} className="font-semibold text-yellow-400 hover:underline">"{notif.metadata?.league_name}"</Link>
            </p>
          </div>
        )}

        {notif.type === 'league_added' && (
          <div className="space-y-1.5">
            <p className="text-sm text-slate-200">
              <span className="text-slate-400">Fuiste agregado al torneo </span>
              <Link href={`/leagues/${notif.metadata?.league_id}`} className="font-semibold text-yellow-400 hover:underline">"{notif.metadata?.league_name}"</Link>
            </p>
            <Link href={`/leagues/${notif.metadata?.league_id}`} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-400 transition">
              <ExternalLink className="w-3.5 h-3.5" /> Ver torneo
            </Link>
          </div>
        )}

        {notif.type === 'mod_invite_request' && (
          <div className="space-y-1.5">
            <p className="text-sm text-slate-200">
              <Link href={`/profile/${notif.metadata?.mod_username}`} className="font-semibold text-white hover:text-yellow-400">@{notif.metadata?.mod_username}</Link>
              <span className="text-slate-400"> quiere invitar a </span>
              <span className="font-semibold text-white">@{notif.metadata?.target_username}</span>
              <span className="text-slate-400"> al torneo </span>
              <Link href={`/leagues/${notif.metadata?.league_id}`} className="font-semibold text-yellow-400 hover:underline">"{notif.metadata?.league_name}"</Link>
            </p>
            {isAccepted ? <span className="inline-flex items-center gap-1.5 text-xs text-green-400"><Check className="w-3.5 h-3.5" /> Aprobado</span>
              : isDeclined ? <span className="inline-flex items-center gap-1.5 text-xs text-slate-500"><X className="w-3.5 h-3.5" /> Declinado</span>
              : <div className="flex gap-2">
                  <button onClick={() => onApproveModInvite(notif)} disabled={accepting === notif.id || declining === notif.id} className={btnYellow}>
                    {accepting === notif.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Aprobar
                  </button>
                  <button onClick={() => onDeclineModInvite(notif)} disabled={accepting === notif.id || declining === notif.id} className={btnGray}>
                    {declining === notif.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />} Declinar
                  </button>
                </div>}
          </div>
        )}

        {notif.type === 'mod_invite_approved' && (
          <p className="text-sm text-slate-200">
            <span className="text-slate-400">Tu solicitud para invitar a </span>
            <span className="font-semibold text-white">@{notif.metadata?.target_username}</span>
            <span className="text-slate-400"> al torneo </span>
            <span className="font-semibold text-white">"{notif.metadata?.league_name}"</span>
            <span className="text-green-400"> fue aprobada</span>
          </p>
        )}

        {notif.type === 'mod_invite_declined' && (
          <p className="text-sm text-slate-200">
            <span className="text-slate-400">Tu solicitud para invitar a </span>
            <span className="font-semibold text-white">@{notif.metadata?.target_username}</span>
            <span className="text-slate-400"> al torneo </span>
            <span className="font-semibold text-white">"{notif.metadata?.league_name}"</span>
            <span className="text-red-400"> fue declinada</span>
          </p>
        )}

        {notif.type === 'league_created' && (
          <div className="space-y-1.5">
            <p className="text-sm text-slate-200">
              <Link href={`/profile/${notif.metadata?.creator_username}`} className="font-semibold text-white hover:text-yellow-400">@{notif.metadata?.creator_username}</Link>
              <span className="text-slate-400"> creó el torneo </span>
              <Link href={`/leagues/${notif.metadata?.league_id}`} className="font-semibold text-yellow-400 hover:underline">"{notif.metadata?.league_name}"</Link>
              <span className="text-slate-400"> para el </span>
              <span className="font-medium text-white">{notif.metadata?.competition ?? 'Mundial 2026'}</span>
            </p>
            {isAccepted
              ? <span className="inline-flex items-center gap-1.5 text-xs text-blue-400"><Check className="w-3.5 h-3.5" /> Solicitud enviada</span>
              : <button onClick={() => onRequestJoin(notif)} disabled={accepting === notif.id} className={btnYellow}>
                  {accepting === notif.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Users className="w-3.5 h-3.5" />} Solicitar unirse
                </button>}
          </div>
        )}

        {notif.type === 'league_ended' && (
          <div className="space-y-1">
            <p className="text-sm text-slate-200">
              🏆 El torneo <Link href={`/leagues/${notif.metadata?.league_id}`} className="font-semibold text-yellow-400 hover:underline">"{notif.metadata?.league_name}"</Link> ha finalizado.
            </p>
            {notif.metadata?.top3?.[0] && (
              <p className="text-xs text-slate-400">
                Ganador: <span className="text-yellow-400 font-semibold">@{notif.metadata.top3[0].username}</span> con {notif.metadata.top3[0].points} puntos
              </p>
            )}
            <Link href={`/leagues/${notif.metadata?.league_id}`} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-yellow-400 transition">
              Ver tabla final →
            </Link>
          </div>
        )}

        {notif.type === 'join_request' && (
          <div className="space-y-1.5">
            <p className="text-sm text-slate-200">
              <Link href={`/profile/${notif.from_user?.username}`} className="font-semibold text-white hover:text-yellow-400">@{name}</Link>
              <span className="text-slate-400"> quiere unirse al torneo </span>
              <Link href={`/leagues/${notif.metadata?.league_id}`} className="font-semibold text-yellow-400 hover:underline">"{notif.metadata?.league_name}"</Link>
            </p>
            {isAccepted ? <span className="inline-flex items-center gap-1.5 text-xs text-green-400"><Check className="w-3.5 h-3.5" /> Aprobado</span>
              : isDeclined ? <span className="inline-flex items-center gap-1.5 text-xs text-slate-500"><X className="w-3.5 h-3.5" /> Declinado</span>
              : <div className="flex gap-2">
                  <button onClick={() => onApproveJoinRequest(notif)} disabled={accepting === notif.id || declining === notif.id} className={btnYellow}>
                    {accepting === notif.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Aprobar
                  </button>
                  <button onClick={() => onDeclineJoinRequest(notif)} disabled={accepting === notif.id || declining === notif.id} className={btnGray}>
                    {declining === notif.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />} Declinar
                  </button>
                </div>}
          </div>
        )}

        {notif.type === 'join_request_declined' && (
          <p className="text-sm text-slate-200">
            <span className="text-slate-400">Tu solicitud para unirte al torneo </span>
            <Link href={`/leagues/${notif.metadata?.league_id}`} className="font-semibold text-yellow-400 hover:underline">"{notif.metadata?.league_name}"</Link>
            <span className="text-red-400"> fue declinada</span>
          </p>
        )}

        {notif.type === 'friend_post' && (
          <div className="space-y-1.5">
            <p className="text-sm text-slate-200">
              <Link href={`/profile/${notif.metadata?.author_username}`} className="font-semibold text-white hover:text-yellow-400">@{notif.metadata?.author_username}</Link>
              <span className="text-slate-400"> hizo una nueva publicación</span>
            </p>
            {notif.metadata?.preview && <p className="text-xs text-slate-400 italic line-clamp-2">"{notif.metadata.preview}"</p>}
            <Link href={`/dashboard#post-${notif.metadata?.post_id}`} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-500/20 text-blue-300 font-semibold rounded-lg hover:bg-blue-500/30 transition">
              <ExternalLink className="w-3 h-3" /> Ver publicación
            </Link>
          </div>
        )}

        {notif.type === 'post_reaction' && (
          <div className="space-y-1.5">
            <p className="text-sm text-slate-200">
              <Link href={`/profile/${notif.metadata?.reactor_username}`} className="font-semibold text-white hover:text-yellow-400">@{notif.metadata?.reactor_username}</Link>
              <span className="text-slate-400"> reaccionó </span>
              <span>{notif.metadata?.emoji}</span>
              <span className="text-slate-400"> a tu publicación</span>
            </p>
            <Link href={`/dashboard#post-${notif.metadata?.post_id}`} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-pink-500/20 text-pink-300 font-semibold rounded-lg hover:bg-pink-500/30 transition">
              <ExternalLink className="w-3 h-3" /> Ver publicación
            </Link>
          </div>
        )}

        {notif.type === 'post_comment' && (
          <div className="space-y-1.5">
            <p className="text-sm text-slate-200">
              <Link href={`/profile/${notif.metadata?.commenter_username}`} className="font-semibold text-white hover:text-yellow-400">@{notif.metadata?.commenter_username}</Link>
              <span className="text-slate-400"> comentó tu publicación</span>
            </p>
            {notif.metadata?.comment && <p className="text-xs text-slate-400 italic line-clamp-2">"{notif.metadata.comment}"</p>}
            <Link href={`/dashboard#post-${notif.metadata?.post_id}`} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-green-500/20 text-green-300 font-semibold rounded-lg hover:bg-green-500/30 transition">
              <ExternalLink className="w-3 h-3" /> Ver publicación
            </Link>
          </div>
        )}

        {notif.type === 'match_finished' && (
          <div className="space-y-1.5">
            <p className="text-sm text-slate-200">
              <span className="font-semibold text-white">🏁 Resultado final: </span>
              <span className="text-white font-bold">
                {notif.metadata?.home_team} {notif.metadata?.home_score} - {notif.metadata?.away_score} {notif.metadata?.away_team}
              </span>
            </p>
            <Link href={notif.metadata?.url ?? '/predictions'} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-slate-600 text-slate-200 font-semibold rounded-lg hover:bg-slate-500 transition">
              <ExternalLink className="w-3 h-3" /> Ver puntos
            </Link>
          </div>
        )}

        {notif.type === 'welcome_blast' && (
          <p className="text-sm text-slate-200">
            🌍 <span className="font-semibold text-white">¡Bienvenidos a Dacopas!</span>
            <span className="text-slate-400"> La emoción del Mundial está cerca. ¡No olvides preparar tus pronósticos!</span>
          </p>
        )}

        {notif.type === 'match_starting_soon' && (
          <div className="space-y-1.5">
            <p className="text-sm text-slate-200">
              <span className="font-semibold text-white">⚽ {notif.metadata?.home_team} vs {notif.metadata?.away_team}</span>
              <span className="text-slate-400"> — ¡No olvides registrar tu pronóstico!</span>
            </p>
            <Link href={notif.metadata?.url ?? '/predictions'} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-orange-500/20 text-orange-300 font-semibold rounded-lg hover:bg-orange-500/30 transition">
              <ExternalLink className="w-3 h-3" /> Ver partido
            </Link>
          </div>
        )}

        {notif.type === 'match_started' && (
          <div className="space-y-1.5">
            <p className="text-sm text-slate-200">
              <span className="font-semibold text-white">🟢 {notif.metadata?.home_team} vs {notif.metadata?.away_team}</span>
              <span className="text-slate-400"> está comenzando</span>
            </p>
            <Link href={notif.metadata?.url ?? '/predictions'} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-green-500/20 text-green-300 font-semibold rounded-lg hover:bg-green-500/30 transition">
              <ExternalLink className="w-3 h-3" /> Ver partido
            </Link>
          </div>
        )}

        {notif.type === 'member_left' && (
          <p className="text-sm text-slate-200">
            <span className="font-semibold text-white">@{notif.metadata?.username}</span>
            <span className="text-slate-400"> abandonó el torneo </span>
            <span className="font-semibold text-white">"{notif.metadata?.league_name}"</span>
          </p>
        )}

        <p className="text-xs text-slate-500">{timeAgo(notif.created_at)}</p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {!notif.read && <div className="w-2 h-2 rounded-full bg-yellow-400" />}
        <button onClick={() => onDelete(notif.id)} disabled={deleting === notif.id}
          className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-slate-700 rounded-lg transition">
          {deleting === notif.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  )
}

export default function NotificationsPanel({
  userId,
  initialNotifications,
}: {
  userId: string
  initialNotifications?: Notification[]
}) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications ?? [])
  const [loading, setLoading] = useState(!initialNotifications)
  const [accepting, setAccepting] = useState<string | null>(null)
  const [declining, setDeclining] = useState<string | null>(null)
  const [joining, setJoining] = useState<string | null>(null)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [clearingAll, setClearingAll] = useState(false)
  const router = useRouter()

  const fetchNotifications = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('notifications')
      .select('*, from_user:from_user_id(id, username, full_name, avatar_url)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
    setNotifications((data ?? []).map(n => ({ ...n, alreadyJoined: false, alreadyAccepted: false, alreadyDeclined: false })))
    setLoading(false)
    // Marcar todas como leídas
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
  }, [userId])

  useEffect(() => {
    if (!initialNotifications) fetchNotifications()
    const supabase = createClient()
    const channel = supabase
      .channel('notifications-panel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        async (payload) => {
          const { data } = await supabase
            .from('notifications')
            .select('*, from_user:from_user_id(id, username, full_name, avatar_url)')
            .eq('id', payload.new.id).single()
          if (data) {
            setNotifications(n => [{ ...data, alreadyJoined: false, alreadyAccepted: false, alreadyDeclined: false }, ...n])
            await supabase.from('notifications').update({ read: true }).eq('id', data.id)
          }
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId, initialNotifications, fetchNotifications])

  async function handleAccept(notif: Notification) {
    if (!notif.from_user) return
    setAccepting(notif.id)
    const supabase = createClient()
    const { data: friendship } = await supabase.from('friendships').select('id')
      .eq('requester_id', notif.from_user.id).eq('addressee_id', userId).eq('status', 'pending').single()
    if (friendship) {
      await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendship.id)
      await supabase.from('notifications').insert({ user_id: notif.from_user.id, from_user_id: userId, type: 'follow_accepted' })
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, accepted: true, alreadyAccepted: true } : n))
    }
    setAccepting(null)
  }

  async function handleDecline(notif: Notification) {
    if (!notif.from_user) return
    setDeclining(notif.id)
    const supabase = createClient()
    await supabase.from('friendships').delete().eq('requester_id', notif.from_user.id).eq('addressee_id', userId).eq('status', 'pending')
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, declined: true, alreadyDeclined: true } : n))
    setDeclining(null)
  }

  async function handleJoinLeague(notif: Notification) {
    if (!notif.metadata?.league_code) return
    setJoining(notif.id); setJoinError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const league = await joinLeague(notif.metadata.league_code, user!.id)

      // Notificar a quien hizo la invitación
      if (notif.from_user_id) {
        const { data: profile } = await supabase.from('profiles').select('username').eq('id', user!.id).single()
        await supabase.from('notifications').insert({
          user_id: notif.from_user_id,
          from_user_id: user!.id,
          type: 'league_invite_accepted',
          metadata: {
            league_id: league.id,
            league_name: notif.metadata?.league_name,
            username: profile?.username ?? '',
          },
        })
        sendPushNotification({
          toUserId: notif.from_user_id,
          title: '¡Invitación aceptada!',
          body: `@${profile?.username ?? 'Alguien'} se unió al torneo "${notif.metadata?.league_name}"`,
          data: { url: '/notifications' },
        })
      }

      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, joined: true, alreadyJoined: true } : n))
      setTimeout(() => router.push(`/leagues/${league.id}`), 1200)
    } catch (err: any) { setJoinError(err.message) }
    finally { setJoining(null) }
  }

  async function handleDeclineLeague(notif: Notification) {
    setDeclining(notif.id)
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, declined: true, alreadyDeclined: true } : n))
    setTimeout(async () => {
      const supabase = createClient()
      await supabase.from('notifications').delete().eq('id', notif.id)
      setNotifications(prev => prev.filter(n => n.id !== notif.id))
    }, 1500)
    setDeclining(null)
  }

  async function handleApproveModInvite(notif: Notification) {
    setAccepting(notif.id)
    const supabase = createClient()
    const { league_id, league_name, target_user_id, target_username } = notif.metadata ?? {}
    const res = await fetch('/api/leagues/approve-member', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ leagueId: league_id, targetUserId: target_user_id }) })
    const { alreadyMember } = await res.json()
    if (!alreadyMember) {
      if (notif.from_user_id) {
        await supabase.from('notifications').insert({ user_id: notif.from_user_id, from_user_id: userId, type: 'mod_invite_approved', metadata: { league_id, league_name, target_username } })
        sendPushNotification({ toUserId: notif.from_user_id, title: 'Solicitud aprobada', body: `Tu solicitud para invitar a @${target_username} al torneo "${league_name}" fue aprobada`, data: { url: '/notifications' } })
      }
      await supabase.from('notifications').insert({ user_id: target_user_id, from_user_id: userId, type: 'league_added', metadata: { league_id, league_name } })
      sendPushNotification({ toUserId: target_user_id, title: '¡Te agregaron a un torneo!', body: `Fuiste agregado al torneo "${league_name}" en Dacopas`, data: { url: `/leagues/${league_id}` } })
    }
    const { data: allReqs } = await supabase.from('notifications').select('id').eq('type', 'mod_invite_request').eq('metadata->>league_id', league_id).eq('metadata->>target_user_id', target_user_id)
    if (allReqs?.length) await supabase.from('notifications').delete().in('id', allReqs.map(r => r.id))
    setNotifications(prev => prev.filter(n => n.id !== notif.id))
    setAccepting(null)
  }

  async function handleDeclineModInvite(notif: Notification) {
    setDeclining(notif.id)
    const supabase = createClient()
    const { league_id, league_name, target_username } = notif.metadata ?? {}
    if (notif.from_user_id) {
      await supabase.from('notifications').insert({ user_id: notif.from_user_id, from_user_id: userId, type: 'mod_invite_declined', metadata: { league_id, league_name, target_username } })
      sendPushNotification({ toUserId: notif.from_user_id, title: 'Solicitud declinada', body: `Tu solicitud para invitar a @${target_username} al torneo "${league_name}" fue declinada`, data: { url: '/notifications' } })
    }
    await supabase.from('notifications').delete().eq('id', notif.id)
    setNotifications(prev => prev.filter(n => n.id !== notif.id))
    setDeclining(null)
  }

  async function handleRequestJoin(notif: Notification) {
    setAccepting(notif.id)
    await fetch('/api/leagues/join-request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ leagueId: notif.metadata?.league_id, leagueName: notif.metadata?.league_name }) })
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, accepted: true, alreadyAccepted: true } : n))
    setAccepting(null)
  }

  async function handleApproveJoinRequest(notif: Notification) {
    setAccepting(notif.id)
    const supabase = createClient()
    const { league_id, league_name } = notif.metadata ?? {}
    await fetch('/api/leagues/approve-member', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ leagueId: league_id, targetUserId: notif.from_user_id }) })
    await supabase.from('notifications').insert({ user_id: notif.from_user_id!, from_user_id: userId, type: 'league_added', metadata: { league_id, league_name } })
    sendPushNotification({ toUserId: notif.from_user_id!, title: '¡Solicitud aprobada!', body: `Tu solicitud para unirte a "${league_name}" fue aprobada`, data: { url: '/notifications' } })
    const { data: allReqs } = await supabase.from('notifications').select('id').eq('type', 'join_request').eq('metadata->>league_id', league_id).eq('from_user_id', notif.from_user_id!)
    if (allReqs?.length) await supabase.from('notifications').delete().in('id', allReqs.map(r => r.id))
    setNotifications(prev => prev.filter(n => n.id !== notif.id))
    setAccepting(null)
  }

  async function handleDeclineJoinRequest(notif: Notification) {
    setDeclining(notif.id)
    const supabase = createClient()
    await supabase.from('notifications').insert({ user_id: notif.from_user_id!, from_user_id: userId, type: 'join_request_declined', metadata: { league_id: notif.metadata?.league_id, league_name: notif.metadata?.league_name } })
    await supabase.from('notifications').delete().eq('id', notif.id)
    setNotifications(prev => prev.filter(n => n.id !== notif.id))
    setDeclining(null)
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    const supabase = createClient()
    await supabase.from('notifications').delete().eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
    setDeleting(null)
  }

  async function handleClearAll() {
    setClearingAll(true)
    const supabase = createClient()
    await supabase.from('notifications').delete().eq('user_id', userId)
    setNotifications([])
    setClearingAll(false)
  }

  const itemProps = {
    userId,
    onAccept: handleAccept,
    accepting,
    declining,
    onJoin: handleJoinLeague,
    joining,
    joinError,
    onApproveModInvite: handleApproveModInvite,
    onDeclineModInvite: handleDeclineModInvite,
    onRequestJoin: handleRequestJoin,
    onApproveJoinRequest: handleApproveJoinRequest,
    onDeclineJoinRequest: handleDeclineJoinRequest,
    onDelete: handleDelete,
    deleting,
  }

  if (loading) return (
    <div className="flex justify-center py-12">
      <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
    </div>
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="font-bold text-base flex items-center gap-2">
          <WhistleIcon className="w-4 h-4 text-yellow-400" /> Notificaciones
        </h2>
        {notifications.length > 0 && (
          <button onClick={handleClearAll} disabled={clearingAll} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition">
            {clearingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-10 text-slate-500">
          <WhistleIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Sin notificaciones.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {notifications.map(notif => (
            <NotificationItem
              key={notif.id}
              notif={notif}
              onDecline={notif.type === 'league_invite' ? handleDeclineLeague : handleDecline}
              {...itemProps}
            />
          ))}
        </div>
      )}
    </div>
  )
}
