'use client'
import { useState } from 'react'
import UserAvatar from '@/components/user-avatar'
import { UserPlus, Check, Loader2, ChevronDown, ChevronUp } from 'lucide-react'

type Friend = { id: string; username: string; full_name: string | null; avatar_url: string | null }

export default function InviteFriends({
  leagueId,
  leagueCode,
  friends,
}: {
  leagueId: string
  leagueCode: string
  friends: Friend[]
}) {
  const [invited, setInvited] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  async function invite(friend: Friend) {
    setLoading(friend.id)
    // Compartir el código por Web Share API si está disponible
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'MyScore FootApp',
          text: `¡Te invito a mi liga de pronósticos del Mundial 2026! Usá el código ${leagueCode} para unirte.`,
          url: `${window.location.origin}/leagues/new?join=1&code=${leagueCode}`,
        })
        setInvited(s => new Set([...s, friend.id]))
      } catch {}
    } else {
      // Fallback: copiar al portapapeles
      await navigator.clipboard.writeText(
        `¡Te invito a mi liga de pronósticos! Entrá a MyScore y usá el código ${leagueCode} para unirte.`
      )
      setInvited(s => new Set([...s, friend.id]))
    }
    setLoading(null)
  }

  const visible = expanded ? friends : friends.slice(0, 3)

  return (
    <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
      <h2 className="font-semibold text-slate-300 flex items-center gap-2">
        <UserPlus className="w-4 h-4 text-yellow-400" />
        Invitar seguidores a esta liga
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
