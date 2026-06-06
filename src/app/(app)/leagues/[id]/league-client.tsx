'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { leaveLeague } from '@/lib/leagues'
import { Shield, ChevronDown, LogOut, Loader2, Crown, Users } from 'lucide-react'
import UserAvatar from '@/components/user-avatar'
import { sendPushNotification } from '@/lib/push'

type Role = 'admin' | 'moderator' | 'participant'
type Member = {
  user_id: string
  role: Role
  profiles: { username: string; full_name: string | null; avatar_url: string | null } | null
}

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  moderator: 'Moderador',
  participant: 'Participante',
}

const ROLE_COLORS: Record<Role, string> = {
  admin: 'text-yellow-400 bg-yellow-400/10',
  moderator: 'text-blue-400 bg-blue-400/10',
  participant: 'text-slate-400 bg-slate-700',
}

function RoleBadge({ role }: { role: Role }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[role]}`}>
      {ROLE_LABELS[role]}
    </span>
  )
}

export default function LeagueClient({
  leagueId,
  leagueName,
  userId,
  userRole,
  members,
  adminIds,
}: {
  leagueId: string
  leagueName: string
  userId: string
  userRole: Role
  members: Member[]
  adminIds: string[]
}) {
  const router = useRouter()
  const [memberList, setMemberList] = useState(members)
  const [changingRole, setChangingRole] = useState<string | null>(null)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [leaving, setLeaving] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  async function handleRoleChange(memberId: string, newRole: Role) {
    setOpenDropdown(null)
    setChangingRole(memberId)
    const res = await fetch('/api/leagues/role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leagueId, targetUserId: memberId, role: newRole }),
    })
    if (res.ok) {
      setMemberList(prev => prev.map(m => m.user_id === memberId ? { ...m, role: newRole } : m))
    }
    setChangingRole(null)
  }

  async function handleLeave() {
    setLeaving(true)
    try {
      await leaveLeague(leagueId, userId)

      // Notificar a todos los admins
      const supabase = createClient()
      const me = members.find(m => m.user_id === userId)
      await Promise.all(adminIds.map(adminId =>
        supabase.from('notifications').insert({
          user_id: adminId,
          from_user_id: userId,
          type: 'member_left',
          metadata: { league_id: leagueId, league_name: leagueName, username: me?.profiles?.username ?? '' },
        })
      ))
      adminIds.forEach(adminId => sendPushNotification({
        toUserId: adminId,
        title: 'Un participante abandonó el torneo',
        body: `@${me?.profiles?.username ?? 'Alguien'} abandonó el torneo "${leagueName}"`,
      }))

      router.push('/leagues/new')
    } catch {
      setLeaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Gestión de miembros — solo admin */}
      {userRole === 'admin' && (
        <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
          <h2 className="font-semibold text-slate-300 flex items-center gap-2">
            <Shield className="w-4 h-4 text-yellow-400" />
            Miembros
          </h2>
          <div className="space-y-2">
            {memberList.map(m => (
              <div key={m.user_id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <UserAvatar
                    username={m.profiles?.username ?? ''}
                    fullName={m.profiles?.full_name ?? null}
                    avatarUrl={m.profiles?.avatar_url ?? null}
                    size="sm"
                    showName
                    linkable
                  />
                </div>
                {m.user_id === userId ? (
                  <RoleBadge role={m.role} />
                ) : (
                  <div className="relative shrink-0">
                    <button
                      onClick={() => setOpenDropdown(openDropdown === m.user_id ? null : m.user_id)}
                      disabled={changingRole === m.user_id}
                      className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${ROLE_COLORS[m.role]} transition`}
                    >
                      {changingRole === m.user_id
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <>{ROLE_LABELS[m.role]} <ChevronDown className="w-3 h-3" /></>
                      }
                    </button>
                    {openDropdown === m.user_id && (
                      <div className="absolute right-0 top-full mt-1 bg-slate-700 rounded-xl shadow-xl z-20 overflow-hidden w-36">
                        {(['admin', 'moderator', 'participant'] as Role[]).map(r => (
                          <button
                            key={r}
                            onClick={() => handleRoleChange(m.user_id, r)}
                            className={`flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-slate-600 transition ${m.role === r ? 'text-yellow-400' : 'text-slate-200'}`}
                          >
                            {r === 'admin' && <Crown className="w-3.5 h-3.5 shrink-0" />}
                            {r === 'moderator' && <Shield className="w-3.5 h-3.5 shrink-0" />}
                            {r === 'participant' && <Users className="w-3.5 h-3.5 shrink-0" />}
                            {ROLE_LABELS[r]}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Abandonar torneo — solo no-admins */}
      {userRole !== 'admin' && (
        <div>
          {showConfirm ? (
            <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
              <p className="text-sm text-slate-300">¿Seguro que querés abandonar <span className="font-semibold text-white">"{leagueName}"</span>?</p>
              <div className="flex gap-2">
                <button
                  onClick={handleLeave}
                  disabled={leaving}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-400 disabled:opacity-50 transition"
                >
                  {leaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                  Sí, abandonar
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="text-xs px-3 py-1.5 bg-slate-700 text-slate-300 font-semibold rounded-lg hover:bg-slate-600 transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowConfirm(true)}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-400 transition"
            >
              <LogOut className="w-3.5 h-3.5" /> Abandonar torneo
            </button>
          )}
        </div>
      )}
    </div>
  )
}
