'use client'
import { useState } from 'react'
import UserAvatar from '@/components/user-avatar'
import { UserPlus, Check, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { sendPushNotification } from '@/lib/push'

type Friend = { id: string; username: string; full_name: string | null; avatar_url: string | null }

export default function InviteFriends({
  leagueId,
  leagueCode,
  leagueName,
  userId,
  friends,
}: {
  leagueId: string
  leagueCode: string
  leagueName: string
  userId: string
  friends: Friend[]
}) {
  const [invited, setInvited] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  async function invite(friend: Friend) {
    setLoading(friend.id)
    const supabase = createClient()

    // Insertar notificación de invitación a liga
    await supabase.from('notifications').insert({
      user_id: friend.id,
      from_user_id: userId,
      type: 'league_invite',
      metadata: {
        league_id: leagueId,
        league_name: leagueName,
        league_code: leagueCode,
      },
    })

    // Push notification
    sendPushNotification({
      toUserId: friend.id,
      title: '¡Te invitaron a una liga!',
      body: `Te invitaron a la liga "${leagueName}" en Dacopas`,
      data: { url: `/leagues/new?join=1&code=${leagueCode}` },
    })

    setInvited(s => new Set([...s, friend.id]))
    setLoading(null)
  }

  const visible = expanded ? friends : friends.slice(0, 3)

  return (
    <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
      <h2 className="font-semibold text-slate-300 flex items-center gap-2">
        <UserPlus className="w-4 h-4 text-yellow-400" />
        Invitar amigos a esta liga
      </h2>
      <div className="space-y-2">
        {visible.map(friend => (
          <div key={friend.id} className="flex items-center justify-between">
            <UserAvatar
              username={friend.username}
              fullName={friend.full_name}
              avatarUrl={friend.avatar_url}
              size="md"
              showName
              showAlias
              linkable
            />
            <button
              onClick={() => invite(friend)}
              disabled={loading === friend.id || invited.has(friend.id)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 font-semibold rounded-lg transition disabled:opacity-50 ${
                invited.has(friend.id)
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-yellow-500 text-slate-900 hover:bg-yellow-400'
              }`}
            >
              {loading === friend.id
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : invited.has(friend.id)
                  ? <><Check className="w-3.5 h-3.5" /> Invitado</>
                  : <><UserPlus className="w-3.5 h-3.5" /> Invitar</>
              }
            </button>
          </div>
        ))}
      </div>
      {friends.length > 3 && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition"
        >
          {expanded
            ? <><ChevronUp className="w-3.5 h-3.5" /> Ver menos</>
            : <><ChevronDown className="w-3.5 h-3.5" /> Ver {friends.length - 3} más</>
          }
        </button>
      )}
    </div>
  )
}
