'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UserPlus, Check, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { sendPushNotification } from '@/lib/push'

type SuggestedUser = {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  shared_leagues: string[] // nombres de torneos en común
}

export default function SuggestedFriendsCarousel({
  userId,
  suggestions,
}: {
  userId: string
  suggestions: SuggestedUser[]
}) {
  const [sent, setSent] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState<string | null>(null)

  if (suggestions.length === 0) return null

  async function handleAdd(target: SuggestedUser) {
    setLoading(target.id)
    const supabase = createClient()
    const { data } = await supabase
      .from('friendships')
      .insert({ requester_id: userId, addressee_id: target.id, status: 'pending' })
      .select('id')
      .single()
    if (data) {
      const { data: profile } = await supabase.from('profiles').select('username').eq('id', userId).single()
      await supabase.from('notifications').insert({
        user_id: target.id,
        from_user_id: userId,
        type: 'follow_request',
      })
      sendPushNotification({
        toUserId: target.id,
        title: '¡Nueva solicitud de amistad!',
        body: `@${profile?.username ?? 'Alguien'} te envió una solicitud de amistad`,
      })
      setSent(prev => new Set(prev).add(target.id))
    }
    setLoading(null)
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-400">⚽ Rivales que podrían ser aliados</h2>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {suggestions.map(user => (
          <div
            key={user.id}
            className="flex-shrink-0 w-36 bg-slate-800 rounded-2xl p-3 flex flex-col items-center gap-2 border border-slate-700"
          >
            {/* Avatar */}
            <Link href={`/profile/${user.username}`} className="flex flex-col items-center gap-1.5 w-full">
              <div className="w-14 h-14 rounded-full overflow-hidden bg-slate-700 flex items-center justify-center border-2 border-slate-600">
                {user.avatar_url
                  ? <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
                  : <span className="text-xl font-bold text-slate-300 uppercase">{user.username[0]}</span>
                }
              </div>
              <p className="text-xs font-semibold text-white truncate w-full text-center">
                {user.full_name ?? user.username}
              </p>
              {user.full_name && (
                <p className="text-xs text-slate-500 truncate w-full text-center">@{user.username}</p>
              )}
            </Link>

            {/* Torneo en común */}
            <p className="text-xs text-slate-500 text-center line-clamp-2 leading-tight">
              🏆 {user.shared_leagues[0]}
              {user.shared_leagues.length > 1 && ` +${user.shared_leagues.length - 1}`}
            </p>

            {/* Botón */}
            {sent.has(user.id) ? (
              <div className="w-full flex items-center justify-center gap-1 text-xs text-green-400 py-1.5">
                <Check className="w-3.5 h-3.5" /> Enviado
              </div>
            ) : (
              <button
                onClick={() => handleAdd(user)}
                disabled={loading === user.id}
                className="w-full flex items-center justify-center gap-1 text-xs px-2 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-semibold rounded-xl transition disabled:opacity-50"
              >
                {loading === user.id
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <UserPlus className="w-3.5 h-3.5" />
                }
                Agregar
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
