'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UserCheck, Check, Loader2 } from 'lucide-react'
import Link from 'next/link'
import UserAvatar from '@/components/user-avatar'
import WhistleIcon from '@/components/whistle-icon'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

type Profile = { id: string; username: string; full_name: string | null; avatar_url: string | null }
type Notification = {
  id: string
  type: string
  read: boolean
  created_at: string
  from_user: Profile | null
  metadata: Record<string, any>
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
  return (
    <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
      <WhistleIcon className="w-4 h-4 text-slate-400" />
    </div>
  )
}

function NotificationItem({
  notif,
  onAccept,
  accepting,
}: {
  notif: Notification & { accepted?: boolean }
  onAccept: (notif: Notification) => void
  accepting: string | null
}) {
  const user = notif.from_user
  const name = user?.username ?? 'Alguien'

  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl transition ${
      !notif.read ? 'bg-slate-800 border border-slate-700' : 'bg-slate-800/40'
    }`}>
      <NotificationIcon type={notif.type} />

      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2">
          {user && (
            <UserAvatar
              username={user.username}
              fullName={user.full_name}
              avatarUrl={user.avatar_url}
              size="sm"
            />
          )}
        </div>

        {notif.type === 'follow_request' && (
          <p className="text-sm text-slate-200">
            <Link href={`/profile/${name}`} className="font-semibold text-white hover:text-yellow-400">@{name}</Link>
            <span className="text-slate-400"> te envió una solicitud de seguimiento</span>
          </p>
        )}
        {notif.type === 'follow_accepted' && (
          <p className="text-sm text-slate-200">
            <Link href={`/profile/${name}`} className="font-semibold text-white hover:text-yellow-400">@{name}</Link>
            <span className="text-slate-400"> aceptó tu solicitud de seguimiento</span>
          </p>
        )}

        <p className="text-xs text-slate-500">{timeAgo(notif.created_at)}</p>

        {/* Botón aceptar solicitud */}
        {notif.type === 'follow_request' && !notif.accepted && (
          <button
            onClick={() => onAccept(notif)}
            disabled={accepting === notif.id}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-yellow-500 text-slate-900 font-semibold rounded-lg hover:bg-yellow-400 disabled:opacity-50 transition mt-1"
          >
            {accepting === notif.id
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Check className="w-3.5 h-3.5" />
            }
            Aceptar solicitud
          </button>
        )}
        {notif.type === 'follow_request' && notif.accepted && (
          <span className="flex items-center gap-1 text-xs text-green-400">
            <UserCheck className="w-3.5 h-3.5" /> Solicitud aceptada
          </span>
        )}
      </div>

      {!notif.read && (
        <div className="w-2 h-2 rounded-full bg-yellow-400 shrink-0 mt-2" />
      )}
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
  const [notifications, setNotifications] = useState<(Notification & { accepted?: boolean })[]>(initialNotifications)
  const [accepting, setAccepting] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('notifications-page')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, async (payload) => {
        const { data } = await supabase
          .from('notifications')
          .select('*, from_user:from_user_id(id, username, full_name, avatar_url)')
          .eq('id', payload.new.id)
          .single()
        if (data) {
          setNotifications(n => [{ ...data, accepted: false }, ...n])
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

    // Buscar la friendship pendiente
    const { data: friendship } = await supabase
      .from('friendships')
      .select('id')
      .eq('requester_id', notif.from_user.id)
      .eq('addressee_id', userId)
      .eq('status', 'pending')
      .single()

    if (friendship) {
      await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendship.id)

      // Notificar al que envió la solicitud
      await supabase.from('notifications').insert({
        user_id: notif.from_user.id,
        from_user_id: userId,
        type: 'follow_accepted',
      })

      setNotifications(prev =>
        prev.map(n => n.id === notif.id ? { ...n, accepted: true } : n)
      )
    }
    setAccepting(null)
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <WhistleIcon className="w-6 h-6 text-yellow-400" />
          Notificaciones
        </h1>
        {notifications.length > 0 && (
          <span className="text-xs text-slate-500">{notifications.length} notificaciones</span>
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
              accepting={accepting}
            />
          ))}
        </div>
      )}
    </div>
  )
}
