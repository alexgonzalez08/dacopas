'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UserPlus, UserCheck, Clock, Loader2 } from 'lucide-react'
import { sendPushNotification } from '@/lib/push'

type Status = 'none' | 'pending_sent' | 'pending_received' | 'accepted'

export default function FriendshipButton({
  currentUserId,
  targetUserId,
  targetUsername,
  initialStatus,
  friendshipId,
}: {
  currentUserId: string
  targetUserId: string
  targetUsername: string
  initialStatus: Status
  friendshipId: string | null
}) {
  const [status, setStatus] = useState<Status>(initialStatus)
  const [fId, setFId] = useState<string | null>(friendshipId)
  const [loading, setLoading] = useState(false)

  async function handleSendRequest() {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('friendships')
      .insert({ requester_id: currentUserId, addressee_id: targetUserId, status: 'pending' })
      .select('id')
      .single()
    if (data) {
      setFId(data.id)
      const { data: notif } = await supabase.from('notifications').insert({
        user_id: targetUserId,
        from_user_id: currentUserId,
        type: 'follow_request',
      }).select('id').single()
      sendPushNotification({
        toUserId: targetUserId,
        title: '¡Nueva solicitud de amistad!',
        body: `@${targetUsername} te envió una solicitud de amistad`,
        data: { url: '/friends', type: 'follow_request', notification_id: notif?.id ?? '' },
      })
      setStatus('pending_sent')
    }
    setLoading(false)
  }

  async function handleCancel() {
    if (!fId) return
    setLoading(true)
    const supabase = createClient()
    await supabase.from('friendships').delete().eq('id', fId)
    setStatus('none')
    setFId(null)
    setLoading(false)
  }

  if (status === 'accepted') {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-green-400 border border-green-500/30 bg-green-500/10 rounded-xl">
        <UserCheck className="w-4 h-4" />
        Amigos
      </div>
    )
  }

  if (status === 'pending_sent') {
    return (
      <button
        onClick={handleCancel}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-400 border border-slate-600 bg-slate-800 hover:bg-slate-700 rounded-xl transition disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
        Solicitud enviada
      </button>
    )
  }

  if (status === 'pending_received') {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-yellow-400 border border-yellow-500/30 bg-yellow-500/10 rounded-xl">
        <Clock className="w-4 h-4" />
        Solicitud pendiente
      </div>
    )
  }

  return (
    <button
      onClick={handleSendRequest}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-semibold rounded-xl transition disabled:opacity-50"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
      Agregar amigo
    </button>
  )
}
