'use client'
import { useState, useEffect } from 'react'
import UserAvatar from '@/components/user-avatar'
import { UserPlus, Check, Loader2, Clock, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { sendPushNotification } from '@/lib/push'

type Friend = { id: string; username: string; full_name: string | null; avatar_url: string | null }
type Role = 'admin' | 'moderator' | 'participant'

function dismissedKey(leagueId: string) {
  return `league-invite-dismissed-${leagueId}`
}

function getDismissed(leagueId: string): Set<string> {
  try {
    const raw = localStorage.getItem(dismissedKey(leagueId))
    return new Set(raw ? JSON.parse(raw) : [])
  } catch { return new Set() }
}

function saveDismissed(leagueId: string, ids: Set<string>) {
  try {
    localStorage.setItem(dismissedKey(leagueId), JSON.stringify([...ids]))
  } catch {}
}

export default function InviteFriends({
  leagueId,
  leagueCode,
  leagueName,
  userId,
  userRole,
  friends,
  pendingInvites = [],
  adminIds = [],
}: {
  leagueId: string
  leagueCode: string
  leagueName: string
  userId: string
  userRole: Role
  friends: Friend[]
  pendingInvites?: string[]
  adminIds?: string[]
}) {
  const [invited, setInvited] = useState<Set<string>>(new Set(pendingInvites))
  const [loading, setLoading] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    setDismissed(getDismissed(leagueId))
  }, [leagueId])

  const visible = friends.filter(f => !dismissed.has(f.id))

  function dismiss(friendId: string) {
    const next = new Set(dismissed).add(friendId)
    setDismissed(next)
    saveDismissed(leagueId, next)
  }

  async function invite(friend: Friend) {
    setLoading(friend.id)
    const supabase = createClient()

    if (userRole === 'admin') {
      await supabase.from('notifications').insert({
        user_id: friend.id,
        from_user_id: userId,
        type: 'league_invite',
        metadata: { league_id: leagueId, league_name: leagueName, league_code: leagueCode },
      })
      sendPushNotification({
        toUserId: friend.id,
        title: '¡Te invitaron a un torneo!',
        body: `Te invitaron al torneo "${leagueName}" en Dacopas`,
        data: { url: '/notifications' },
      })
    } else {
      const me = await supabase.from('profiles').select('username').eq('id', userId).single()
      await Promise.all(adminIds.map(adminId =>
        supabase.from('notifications').insert({
          user_id: adminId,
          from_user_id: userId,
          type: 'mod_invite_request',
          metadata: {
            league_id: leagueId,
            league_name: leagueName,
            league_code: leagueCode,
            target_user_id: friend.id,
            target_username: friend.username,
            mod_username: me.data?.username ?? '',
          },
        })
      ))
      adminIds.forEach(adminId => sendPushNotification({
        toUserId: adminId,
        title: 'Solicitud de invitación',
        body: `Un moderador quiere invitar a @${friend.username} al torneo "${leagueName}"`,
      }))
    }

    setInvited(s => new Set([...s, friend.id]))
    setLoading(null)
  }

  if (visible.length === 0) return null

  const isMod = userRole === 'moderator'

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-300 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-yellow-400" />
          Invitar al torneo
        </h2>
        {isMod && (
          <span className="text-xs text-slate-500">Las invitaciones requieren aprobación del admin</span>
        )}
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {visible.map(friend => {
          const isInvited = invited.has(friend.id)
          const isLoading = loading === friend.id
          return (
            <div
              key={friend.id}
              className="relative flex flex-col items-center gap-2 bg-slate-800 rounded-2xl p-3 min-w-[96px] shrink-0"
            >
              {/* Botón eliminar */}
              <button
                onClick={() => dismiss(friend.id)}
                className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition"
                aria-label="Quitar sugerencia"
              >
                <X className="w-3 h-3 text-slate-400" />
              </button>

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
                    ? isMod ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                    : 'bg-yellow-500 text-slate-900 hover:bg-yellow-400'
                }`}
              >
                {isLoading
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : isInvited
                    ? isMod
                      ? <><Clock className="w-3 h-3" /> Pendiente</>
                      : <><Check className="w-3 h-3" /> Invitado</>
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
