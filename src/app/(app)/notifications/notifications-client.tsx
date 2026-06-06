'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UserCheck, Check, Loader2, Users, Trash2, X, UserX, Shield, LogOut, ExternalLink, Trophy } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import UserAvatar from '@/components/user-avatar'
import WhistleIcon from '@/components/whistle-icon'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { joinLeague } from '@/lib/leagues'
import { sendPushNotification } from '@/lib/push'

type Profile = { id: string; username: string; full_name: string | null; avatar_url: string | null }
type Notification = {
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
  if (type === 'follow_request') return (
    <div className="w-9 h-9 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0">
      <WhistleIcon className="w-4 h-4 text-yellow-400" />
    </div>
  )
  if (type === 'follow_accepted') return (
    <div className="w-9 h-9 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
      <UserCheck className="w-4 h-4 text-green-400" />
    </div>
  )
  if (type === 'league_invite' || type === 'league_added') return (
    <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
      <Users className="w-4 h-4 text-blue-400" />
    </div>
  )
  if (type === 'mod_invite_request') return (
    <div className="w-9 h-9 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
      <Shield className="w-4 h-4 text-purple-400" />
    </div>
  )
  if (type === 'mod_invite_approved') return (
    <div className="w-9 h-9 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
      <Check className="w-4 h-4 text-green-400" />
    </div>
  )
  if (type === 'mod_invite_declined') return (
    <div className="w-9 h-9 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
      <X className="w-4 h-4 text-red-400" />
    </div>
  )
  if (type === 'member_left') return (
    <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
      <LogOut className="w-4 h-4 text-slate-400" />
    </div>
  )
  if (type === 'league_created') return (
    <div className="w-9 h-9 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0">
      <Trophy className="w-4 h-4 text-yellow-400" />
    </div>
  )
  if (type === 'join_request') return (
    <div className="w-9 h-9 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
      <Users className="w-4 h-4 text-purple-400" />
    </div>
  )
  return (
    <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
      <WhistleIcon className="w-4 h-4 text-slate-400" />
    </div>
  )
}

function NotificationItem({
  notif, onAccept, onDecline, accepting, declining,
  onJoin, joining, joinError, onApproveModInvite, onDeclineModInvite,
  onRequestJoin, onApproveJoinRequest, onDeclineJoinRequest,
  onDelete, deleting,
}: {
  notif: Notification
  onAccept: (notif: Notification) => void
  onDecline: (notif: Notification) => void
  accepting: string | null
  declining: string | null
  onJoin: (notif: Notification) => void
  joining: string | null
  joinError: string | null
  onApproveModInvite: (notif: Notification) => void
  onDeclineModInvite: (notif: Notification) => void
  onRequestJoin: (notif: Notification) => void
  onApproveJoinRequest: (notif: Notification) => void
  onDeclineJoinRequest: (notif: Notification) => void
  onDelete: (id: string) => void
  deleting: string | null
}) {
  const user = notif.from_user
  const name = user?.username ?? 'Alguien'
  const isJoined = notif.alreadyJoined || notif.joined
  const isAccepted = notif.alreadyAccepted || notif.accepted
  const isDeclined = notif.alreadyDeclined || notif.declined

  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl transition ${
      !notif.read ? 'bg-slate-800 border border-slate-700' : 'bg-slate-800/40'
    }`}>
      <NotificationIcon type={notif.type} />

      <div className="flex-1 min-w-0 space-y-1.5">
        {user && <UserAvatar username={user.username} fullName={user.full_name} avatarUrl={user.avatar_url} size="sm" />}

        {/* Solicitud de amistad */}
        {notif.type === 'follow_request' && (
          <>
            <p className="text-sm text-slate-200">
              <Link href={`/profile/${name}`} className="font-semibold text-white hover:text-yellow-400">@{name}</Link>
              <span className="text-slate-400"> te envió una solicitud de amistad</span>
            </p>
            {isAccepted ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-green-400">
                <UserCheck className="w-3.5 h-3.5" /> Ya son amigos
              </span>
            ) : isDeclined ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                <UserX className="w-3.5 h-3.5" /> Solicitud declinada
              </span>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => onAccept(notif)} disabled={accepting === notif.id || declining === notif.id}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-yellow-500 text-slate-900 font-semibold rounded-lg hover:bg-yellow-400 disabled:opacity-50 transition">
                  {accepting === notif.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Aceptar
                </button>
                <button onClick={() => onDecline(notif)} disabled={accepting === notif.id || declining === notif.id}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-slate-700 text-slate-300 font-semibold rounded-lg hover:bg-slate-600 disabled:opacity-50 transition">
                  {declining === notif.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />} Declinar
                </button>
              </div>
            )}
          </>
        )}

        {/* Amistad aceptada */}
        {notif.type === 'follow_accepted' && (
          <p className="text-sm text-slate-200">
            <Link href={`/profile/${name}`} className="font-semibold text-white hover:text-yellow-400">@{name}</Link>
            <span className="text-slate-400"> aceptó tu solicitud de amistad</span>
          </p>
        )}

        {/* Invitación a torneo (requiere aceptar/declinar) */}
        {notif.type === 'league_invite' && (
          <div className="space-y-1.5">
            <p className="text-sm text-slate-200">
              <Link href={`/profile/${name}`} className="font-semibold text-white hover:text-yellow-400">@{name}</Link>
              <span className="text-slate-400"> te invitó al torneo </span>
              <Link href={`/leagues/${notif.metadata?.league_id}`} className="font-semibold text-yellow-400 hover:underline">"{notif.metadata?.league_name}"</Link>
            </p>
            {isJoined ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-green-400">
                <Check className="w-3.5 h-3.5" /> Te uniste al torneo
              </span>
            ) : isDeclined ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                <X className="w-3.5 h-3.5" /> Invitación declinada
              </span>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => onJoin(notif)} disabled={joining === notif.id || declining === notif.id}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-yellow-500 text-slate-900 font-semibold rounded-lg hover:bg-yellow-400 disabled:opacity-50 transition">
                  {joining === notif.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Aceptar
                </button>
                <button onClick={() => onDecline(notif)} disabled={joining === notif.id || declining === notif.id}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-slate-700 text-slate-300 font-semibold rounded-lg hover:bg-slate-600 disabled:opacity-50 transition">
                  {declining === notif.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />} Declinar
                </button>
                {joinError && joining !== notif.id && <p className="text-xs text-red-400">{joinError}</p>}
              </div>
            )}
          </div>
        )}

        {/* Agregado directamente al torneo (por aprobación de moderador) */}
        {notif.type === 'league_added' && (
          <div className="space-y-1.5">
            <p className="text-sm text-slate-200">
              <span className="text-slate-400">Fuiste agregado al torneo </span>
              <Link href={`/leagues/${notif.metadata?.league_id}`} className="font-semibold text-yellow-400 hover:underline">
                "{notif.metadata?.league_name}"
              </Link>
            </p>
            <Link
              href={`/leagues/${notif.metadata?.league_id}`}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-400 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Ver torneo
            </Link>
          </div>
        )}

        {/* Solicitud de moderador para invitar a alguien — vista del admin */}
        {notif.type === 'mod_invite_request' && (
          <div className="space-y-1.5">
            <p className="text-sm text-slate-200">
              <Link href={`/profile/${notif.metadata?.mod_username}`} className="font-semibold text-white hover:text-yellow-400">@{notif.metadata?.mod_username}</Link>
              <span className="text-slate-400"> quiere invitar a </span>
              <span className="font-semibold text-white">@{notif.metadata?.target_username}</span>
              <span className="text-slate-400"> al torneo </span>
              <Link href={`/leagues/${notif.metadata?.league_id}`} className="font-semibold text-yellow-400 hover:underline">"{notif.metadata?.league_name}"</Link>
            </p>
            {isAccepted ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-green-400">
                <Check className="w-3.5 h-3.5" /> Aprobado
              </span>
            ) : isDeclined ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                <X className="w-3.5 h-3.5" /> Declinado
              </span>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => onApproveModInvite(notif)} disabled={accepting === notif.id || declining === notif.id}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-yellow-500 text-slate-900 font-semibold rounded-lg hover:bg-yellow-400 disabled:opacity-50 transition">
                  {accepting === notif.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Aprobar
                </button>
                <button onClick={() => onDeclineModInvite(notif)} disabled={accepting === notif.id || declining === notif.id}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-slate-700 text-slate-300 font-semibold rounded-lg hover:bg-slate-600 disabled:opacity-50 transition">
                  {declining === notif.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />} Declinar
                </button>
              </div>
            )}
          </div>
        )}

        {/* Respuesta al moderador — aprobado */}
        {notif.type === 'mod_invite_approved' && (
          <p className="text-sm text-slate-200">
            <span className="text-slate-400">Tu solicitud para invitar a </span>
            <span className="font-semibold text-white">@{notif.metadata?.target_username}</span>
            <span className="text-slate-400"> al torneo </span>
            <span className="font-semibold text-white">"{notif.metadata?.league_name}"</span>
            <span className="text-green-400"> fue aprobada</span>
          </p>
        )}

        {/* Respuesta al moderador — declinado */}
        {notif.type === 'mod_invite_declined' && (
          <p className="text-sm text-slate-200">
            <span className="text-slate-400">Tu solicitud para invitar a </span>
            <span className="font-semibold text-white">@{notif.metadata?.target_username}</span>
            <span className="text-slate-400"> al torneo </span>
            <span className="font-semibold text-white">"{notif.metadata?.league_name}"</span>
            <span className="text-red-400"> fue declinada</span>
          </p>
        )}

        {/* Torneo creado — notificación a amigos con botón Solicitar unirse */}
        {notif.type === 'league_created' && (
          <div className="space-y-1.5">
            <p className="text-sm text-slate-200">
              <Link href={`/profile/${notif.metadata?.creator_username}`} className="font-semibold text-white hover:text-yellow-400">@{notif.metadata?.creator_username}</Link>
              <span className="text-slate-400"> creó el torneo </span>
              <Link href={`/leagues/${notif.metadata?.league_id}`} className="font-semibold text-yellow-400 hover:underline">"{notif.metadata?.league_name}"</Link>
              <span className="text-slate-400"> para el </span>
              <span className="font-medium text-white">{notif.metadata?.competition ?? 'Mundial 2026'}</span>
            </p>
            {isAccepted ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-blue-400">
                <Check className="w-3.5 h-3.5" /> Solicitud enviada
              </span>
            ) : (
              <button onClick={() => onRequestJoin(notif)} disabled={accepting === notif.id}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-yellow-500 text-slate-900 font-semibold rounded-lg hover:bg-yellow-400 disabled:opacity-50 transition">
                {accepting === notif.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Users className="w-3.5 h-3.5" />}
                Solicitar unirse
              </button>
            )}
          </div>
        )}

        {/* Solicitud de unirse al torneo — vista del admin */}
        {notif.type === 'join_request' && (
          <div className="space-y-1.5">
            <p className="text-sm text-slate-200">
              <Link href={`/profile/${notif.from_user?.username}`} className="font-semibold text-white hover:text-yellow-400">@{name}</Link>
              <span className="text-slate-400"> quiere unirse al torneo </span>
              <Link href={`/leagues/${notif.metadata?.league_id}`} className="font-semibold text-yellow-400 hover:underline">"{notif.metadata?.league_name}"</Link>
            </p>
            {isAccepted ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-green-400">
                <Check className="w-3.5 h-3.5" /> Aprobado
              </span>
            ) : isDeclined ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                <X className="w-3.5 h-3.5" /> Declinado
              </span>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => onApproveJoinRequest(notif)} disabled={accepting === notif.id || declining === notif.id}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-yellow-500 text-slate-900 font-semibold rounded-lg hover:bg-yellow-400 disabled:opacity-50 transition">
                  {accepting === notif.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Aprobar
                </button>
                <button onClick={() => onDeclineJoinRequest(notif)} disabled={accepting === notif.id || declining === notif.id}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-slate-700 text-slate-300 font-semibold rounded-lg hover:bg-slate-600 disabled:opacity-50 transition">
                  {declining === notif.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />} Declinar
                </button>
              </div>
            )}
          </div>
        )}

        {/* Solicitud de unirse declinada */}
        {notif.type === 'join_request_declined' && (
          <p className="text-sm text-slate-200">
            <span className="text-slate-400">Tu solicitud para unirte al torneo </span>
            <Link href={`/leagues/${notif.metadata?.league_id}`} className="font-semibold text-yellow-400 hover:underline">"{notif.metadata?.league_name}"</Link>
            <span className="text-red-400"> fue declinada</span>
          </p>
        )}

        {/* Alguien abandonó el torneo — vista del admin */}
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

export default function NotificationsClient({
  userId,
  initialNotifications,
}: {
  userId: string
  initialNotifications: Notification[]
}) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
  const [accepting, setAccepting] = useState<string | null>(null)
  const [declining, setDeclining] = useState<string | null>(null)
  const [joining, setJoining] = useState<string | null>(null)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [clearingAll, setClearingAll] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('notifications-page')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        async (payload) => {
          const { data } = await supabase
            .from('notifications')
            .select('*, from_user:from_user_id(id, username, full_name, avatar_url)')
            .eq('id', payload.new.id)
            .single()
          if (data) {
            setNotifications(n => [{ ...data, alreadyJoined: false, alreadyAccepted: false, alreadyDeclined: false }, ...n])
            await supabase.from('notifications').update({ read: true }).eq('id', data.id)
          }
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  async function handleAccept(notif: Notification) {
    if (!notif.from_user) return
    setAccepting(notif.id)
    const supabase = createClient()
    const { data: friendship } = await supabase
      .from('friendships').select('id')
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
    await supabase.from('friendships').delete()
      .eq('requester_id', notif.from_user.id).eq('addressee_id', userId).eq('status', 'pending')
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, declined: true, alreadyDeclined: true } : n))
    setDeclining(null)
  }

  async function handleJoinLeague(notif: Notification) {
    if (!notif.metadata?.league_code) return
    setJoining(notif.id)
    setJoinError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const league = await joinLeague(notif.metadata.league_code, user!.id)
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, joined: true, alreadyJoined: true } : n))
      setTimeout(() => router.push(`/leagues/${league.id}`), 1200)
    } catch (err: any) {
      setJoinError(err.message)
    } finally {
      setJoining(null)
    }
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

    // Verificar si el usuario ya es miembro (otro admin aprobó antes)
    const { data: existing } = await supabase
      .from('league_members')
      .select('user_id, left_at')
      .eq('league_id', league_id)
      .eq('user_id', target_user_id)
      .maybeSingle()

    const alreadyMember = existing && !existing.left_at

    if (!alreadyMember) {
      // Agregar al usuario al torneo
      await supabase.from('league_members').upsert(
        { league_id, user_id: target_user_id, role: 'participant' },
        { onConflict: 'league_id,user_id', ignoreDuplicates: true }
      )

      // Notificar al moderador
      if (notif.from_user_id) {
        await supabase.from('notifications').insert({
          user_id: notif.from_user_id,
          from_user_id: userId,
          type: 'mod_invite_approved',
          metadata: { league_id, league_name, target_username },
        })
        sendPushNotification({
          toUserId: notif.from_user_id,
          title: 'Solicitud aprobada',
          body: `Tu solicitud para invitar a @${target_username} al torneo "${league_name}" fue aprobada`,
        })
      }

      // Notificar al usuario agregado
      await supabase.from('notifications').insert({
        user_id: target_user_id,
        from_user_id: userId,
        type: 'league_added',
        metadata: { league_id, league_name },
      })
      sendPushNotification({
        toUserId: target_user_id,
        title: '¡Te agregaron a un torneo!',
        body: `Fuiste agregado al torneo "${league_name}" en Dacopas`,
        data: { url: `/leagues/${league_id}` },
      })
    }

    // Eliminar TODAS las notificaciones mod_invite_request para este usuario en este torneo
    // (incluye las de otros admins que aún no procesaron)
    const { data: allReqs } = await supabase
      .from('notifications')
      .select('id')
      .eq('type', 'mod_invite_request')
      .eq('metadata->>league_id', league_id)
      .eq('metadata->>target_user_id', target_user_id)
    if (allReqs?.length) {
      await supabase.from('notifications').delete().in('id', allReqs.map(r => r.id))
    }

    setNotifications(prev => prev.filter(n => n.id !== notif.id))
    setAccepting(null)
  }

  async function handleDeclineModInvite(notif: Notification) {
    setDeclining(notif.id)
    const supabase = createClient()
    const { league_id, league_name, target_username } = notif.metadata ?? {}

    if (notif.from_user_id) {
      await supabase.from('notifications').insert({
        user_id: notif.from_user_id,
        from_user_id: userId,
        type: 'mod_invite_declined',
        metadata: { league_id, league_name, target_username },
      })
      sendPushNotification({
        toUserId: notif.from_user_id,
        title: 'Solicitud declinada',
        body: `Tu solicitud para invitar a @${target_username} al torneo "${league_name}" fue declinada`,
      })
    }

    // Eliminar la notificación del admin
    await supabase.from('notifications').delete().eq('id', notif.id)
    setNotifications(prev => prev.filter(n => n.id !== notif.id))
    setDeclining(null)
  }

  async function handleRequestJoin(notif: Notification) {
    setAccepting(notif.id)
    await fetch('/api/leagues/join-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leagueId: notif.metadata?.league_id,
        leagueName: notif.metadata?.league_name,
      }),
    })
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, accepted: true, alreadyAccepted: true } : n))
    setAccepting(null)
  }

  async function handleApproveJoinRequest(notif: Notification) {
    setAccepting(notif.id)
    const supabase = createClient()
    const { league_id, league_name } = notif.metadata ?? {}

    const { data: existing } = await supabase
      .from('league_members').select('user_id, left_at')
      .eq('league_id', league_id).eq('user_id', notif.from_user_id!).maybeSingle()

    if (!existing || existing.left_at) {
      await supabase.from('league_members').upsert(
        { league_id, user_id: notif.from_user_id!, role: 'participant' },
        { onConflict: 'league_id,user_id', ignoreDuplicates: true }
      )
      if (existing?.left_at) {
        await supabase.from('league_members').update({ left_at: null, role: 'participant' })
          .eq('league_id', league_id).eq('user_id', notif.from_user_id!)
      }
    }

    // Notificar al solicitante
    await supabase.from('notifications').insert({
      user_id: notif.from_user_id!,
      from_user_id: userId,
      type: 'league_added',
      metadata: { league_id, league_name },
    })

    // Eliminar TODAS las join_request de este usuario para este torneo
    const { data: allReqs } = await supabase.from('notifications').select('id')
      .eq('type', 'join_request').eq('metadata->>league_id', league_id)
      .eq('from_user_id', notif.from_user_id!)
    if (allReqs?.length) {
      await supabase.from('notifications').delete().in('id', allReqs.map(r => r.id))
    }

    setNotifications(prev => prev.filter(n => n.id !== notif.id))
    setAccepting(null)
  }

  async function handleDeclineJoinRequest(notif: Notification) {
    setDeclining(notif.id)
    const supabase = createClient()

    // Notificar al solicitante que fue declinado
    await supabase.from('notifications').insert({
      user_id: notif.from_user_id!,
      from_user_id: userId,
      type: 'join_request_declined',
      metadata: { league_id: notif.metadata?.league_id, league_name: notif.metadata?.league_name },
    })

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

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <WhistleIcon className="w-6 h-6 text-yellow-400" />
          Notificaciones
        </h1>
        {notifications.length > 0 && (
          <button onClick={handleClearAll} disabled={clearingAll}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition">
            {clearingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Limpiar todo
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <WhistleIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No tenés notificaciones todavía.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {notifications.map(notif => (
            <NotificationItem
              key={notif.id}
              notif={notif}
              onAccept={handleAccept}
              onDecline={notif.type === 'league_invite' ? handleDeclineLeague : handleDecline}
              accepting={accepting}
              declining={declining}
              onJoin={handleJoinLeague}
              joining={joining}
              joinError={joinError}
              onApproveModInvite={handleApproveModInvite}
              onDeclineModInvite={handleDeclineModInvite}
              onRequestJoin={handleRequestJoin}
              onApproveJoinRequest={handleApproveJoinRequest}
              onDeclineJoinRequest={handleDeclineJoinRequest}
              onDelete={handleDelete}
              deleting={deleting}
            />
          ))}
        </div>
      )}
    </div>
  )
}
