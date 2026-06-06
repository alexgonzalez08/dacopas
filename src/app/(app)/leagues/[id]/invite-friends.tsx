'use client'
import { useState } from 'react'
import UserAvatar from '@/components/user-avatar'
import { UserPlus, Check, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { sendPushNotification } from '@/lib/push'

type Friend = { id: string; username: string; full_name: string | null; avatar_url: string | null }

export default function InviteFriends({
  leagueId,
  leagueCode,
  leagueName,
  userId,
  friends,
  pendingInvites = [],
}: {
  leagueId: string
  leagueCode: string
  leagueName: string
  userId: string
  friends: Friend[]
  pendingInvites?: string[]
}) {
  const [invited, setInvited] = useState<Set<string>>(new Set(pendingInvites))
  const [loading, setLoading] = useState<string | null>(null)

  async function invite(friend: Friend) {
    setLoading(friend.id)
    const supabase = createClient()

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

    sendPushNotification({
      toUserId: friend.id,
      title: '¡Te invitaron a un torneo!',
      body: `Te invitaron al torneo "${leagueName}" en Dacopas`,
      data: { url: `/leagues/new?join=1&code=${leagueCode}` },
    })

    setInvited(s => new Set([...s, friend.id]))
    setLoading(null)
  }

  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-slate-300 flex items-center gap-2">
        <UserPlus className="w-4 h-4 text-yellow-400" />
        Invitar al torneo
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {friends.map(friend => {
          const isInvited = invited.has(friend.id)
          const isLoading = loading === friend.id
          return (
            <div
              key={friend.id}
              className="flex flex-col items-center gap-2 bg-slate-800 rounded-2xl p-3 min-w-[96px] shrink-0"
            >
              <UserAvatar
                username={friend.username}
                fullName={friend.full_name}
                avatarUrl={friend.avatar_url}
                size="lg"
                linkable
              />
              <span className="text-xs text-slate-300 font-medium truncate w-full text-center">
                @{friend.username}
              </span>
              <button
                onClick={() => invite(friend)}
                disabled={isLoading || isInvited}
                className={`flex items-center gap-1 text-xs px-2.5 py-1 font-semibold rounded-lg transition w-full justify-center disabled:opacity-60 ${
                  isInvited
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-yellow-500 text-slate-900 hover:bg-yellow-400'
                }`}
              >
                {isLoading
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : isInvited
                    ? <><Check className="w-3 h-3" /> Invitado</>
                    : <><UserPlus className="w-3 h-3" /> Invitar</>
                }
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
