'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { leaveLeague } from '@/lib/leagues'
import { Shield, ChevronDown, LogOut, Loader2, Crown, Users, Check, X, Bell, Medal, Trophy, LayoutList, UserMinus } from 'lucide-react'
import UserAvatar from '@/components/user-avatar'
import { sendPushNotification } from '@/lib/push'
import Link from 'next/link'

type Role = 'admin' | 'moderator' | 'participant'
type Member = {
  user_id: string
  role: Role
  profiles: { username: string; full_name: string | null; avatar_url: string | null } | null
}
type ModRequest = {
  notif_id: string
  mod_user_id: string
  mod_username: string
  target_user_id: string
  target_username: string
  league_code: string
}
type JoinRequest = {
  notif_id: string
  requester_user_id: string
  requester_username: string
}
type LeaderboardEntry = {
  user_id: string
  username: string
  points: number
  exact_results: number
  correct_winner: number
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

const MEDAL_COLORS = ['text-yellow-400', 'text-slate-300', 'text-amber-600']

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
  members: initialMembers,
  adminIds,
  modRequests: initialModRequests = [],
  joinRequests: initialJoinRequests = [],
  leaderboard: initialLeaderboard = [],
}: {
  leagueId: string
  leagueName: string
  userId: string
  userRole: Role
  members: Member[]
  adminIds: string[]
  modRequests?: ModRequest[]
  joinRequests?: JoinRequest[]
  leaderboard?: LeaderboardEntry[]
}) {
  const router = useRouter()
  const [tab, setTab] = useState<'gestion' | 'posiciones'>('posiciones')
  const [memberList, setMemberList] = useState(initialMembers)
  const [modRequests, setModRequests] = useState(initialModRequests)
  const [joinRequests, setJoinRequests] = useState(initialJoinRequests)
  const [leaderboard, setLeaderboard] = useState(initialLeaderboard)
  const [changingRole, setChangingRole] = useState<string | null>(null)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [processingReq, setProcessingReq] = useState<string | null>(null)
  const [leaving, setLeaving] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState<{ userId: string; username: string } | null>(null)
  const [removingMember, setRemovingMember] = useState(false)

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

  async function handleApproveRequest(req: ModRequest) {
    setProcessingReq(req.notif_id)
    const supabase = createClient()

    const res = await fetch('/api/leagues/approve-member', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leagueId, targetUserId: req.target_user_id }),
    })
    const { alreadyMember } = await res.json()

    if (!alreadyMember) {
      await supabase.from('notifications').insert({
        user_id: req.mod_user_id, from_user_id: userId, type: 'mod_invite_approved',
        metadata: { league_id: leagueId, league_name: leagueName, target_username: req.target_username },
      })
      sendPushNotification({ toUserId: req.mod_user_id, title: 'Solicitud aprobada', body: `Tu solicitud para invitar a @${req.target_username} al torneo "${leagueName}" fue aprobada` })
      await supabase.from('notifications').insert({
        user_id: req.target_user_id, from_user_id: userId, type: 'league_added',
        metadata: { league_id: leagueId, league_name: leagueName },
      })
      sendPushNotification({ toUserId: req.target_user_id, title: '¡Te agregaron a un torneo!', body: `Fuiste agregado al torneo "${leagueName}" en Dacopas`, data: { url: `/leagues/${leagueId}` } })
    }

    const { data: allReqs } = await supabase.from('notifications').select('id')
      .eq('type', 'mod_invite_request').eq('metadata->>league_id', leagueId).eq('metadata->>target_user_id', req.target_user_id)
    if (allReqs?.length) await supabase.from('notifications').delete().in('id', allReqs.map(r => r.id))

    setModRequests(prev => prev.filter(r => r.target_user_id !== req.target_user_id))
    if (!alreadyMember) {
      setMemberList(prev => [...prev, { user_id: req.target_user_id, role: 'participant', profiles: { username: req.target_username, full_name: null, avatar_url: null } }])
      setLeaderboard(prev => [...prev, { user_id: req.target_user_id, username: req.target_username, points: 0, exact_results: 0, correct_winner: 0 }])
    }
    setProcessingReq(null)
  }

  async function handleDeclineRequest(req: ModRequest) {
    setProcessingReq(req.notif_id)
    const supabase = createClient()

    await supabase.from('notifications').delete().eq('id', req.notif_id)
    await supabase.from('notifications').insert({
      user_id: req.mod_user_id,
      from_user_id: userId,
      type: 'mod_invite_declined',
      metadata: { league_id: leagueId, league_name: leagueName, target_username: req.target_username },
    })
    sendPushNotification({
      toUserId: req.mod_user_id,
      title: 'Solicitud declinada',
      body: `Tu solicitud para invitar a @${req.target_username} al torneo "${leagueName}" fue declinada`,
    })

    setModRequests(prev => prev.filter(r => r.notif_id !== req.notif_id))
    setProcessingReq(null)
  }

  async function handleApproveJoinRequest(req: JoinRequest) {
    setProcessingReq(req.notif_id)
    const supabase = createClient()

    const res = await fetch('/api/leagues/approve-member', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leagueId, targetUserId: req.requester_user_id }),
    })
    const { alreadyMember } = await res.json()

    await supabase.from('notifications').insert({
      user_id: req.requester_user_id, from_user_id: userId, type: 'league_added',
      metadata: { league_id: leagueId, league_name: leagueName },
    })
    sendPushNotification({ toUserId: req.requester_user_id, title: '¡Solicitud aprobada!', body: `Tu solicitud para unirte a "${leagueName}" fue aprobada`, data: { url: `/leagues/${leagueId}` } })

    const { data: allReqs } = await supabase.from('notifications').select('id')
      .eq('type', 'join_request').eq('metadata->>league_id', leagueId).eq('from_user_id', req.requester_user_id)
    if (allReqs?.length) await supabase.from('notifications').delete().in('id', allReqs.map(r => r.id))

    setJoinRequests(prev => prev.filter(r => r.requester_user_id !== req.requester_user_id))
    if (!alreadyMember) {
      setMemberList(prev => [...prev, { user_id: req.requester_user_id, role: 'participant', profiles: { username: req.requester_username, full_name: null, avatar_url: null } }])
      setLeaderboard(prev => [...prev, { user_id: req.requester_user_id, username: req.requester_username, points: 0, exact_results: 0, correct_winner: 0 }])
    }
    setProcessingReq(null)
  }

  async function handleDeclineJoinRequest(req: JoinRequest) {
    setProcessingReq(req.notif_id)
    const supabase = createClient()

    await supabase.from('notifications').insert({
      user_id: req.requester_user_id,
      from_user_id: userId,
      type: 'join_request_declined',
      metadata: { league_id: leagueId, league_name: leagueName },
    })
    await supabase.from('notifications').delete().eq('id', req.notif_id)

    setJoinRequests(prev => prev.filter(r => r.notif_id !== req.notif_id))
    setProcessingReq(null)
  }

  async function handleLeave() {
    setLeaving(true)
    try {
      await leaveLeague(leagueId, userId)
      const supabase = createClient()
      const me = memberList.find(m => m.user_id === userId)
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

  async function handleRemoveMember() {
    if (!confirmRemove) return
    setRemovingMember(true)
    await fetch('/api/leagues/remove-member', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leagueId, targetUserId: confirmRemove.userId }),
    })
    setMemberList(prev => prev.filter(m => m.user_id !== confirmRemove.userId))
    setLeaderboard(prev => prev.filter(e => e.user_id !== confirmRemove.userId))
    setConfirmRemove(null)
    setRemovingMember(false)
  }

  // Vista con tabs — solo para admins
  if (userRole === 'admin') {
    const pendingCount = modRequests.length + joinRequests.length
    return (
      <div className="space-y-4">

        {/* Modal confirmación eliminar miembro */}
        {confirmRemove && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl p-5 space-y-4">
              <h3 className="font-semibold text-white">¿Eliminar miembro?</h3>
              <p className="text-sm text-slate-300">
                ¿Seguro que querés eliminar a <span className="font-semibold text-white">@{confirmRemove.username}</span> del torneo?
                Sus puntos actuales se conservarán si vuelve a unirse.
              </p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setConfirmRemove(null)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition">
                  Cancelar
                </button>
                <button onClick={handleRemoveMember} disabled={removingMember}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-red-500 hover:bg-red-400 text-white rounded-xl disabled:opacity-50 transition">
                  {removingMember ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserMinus className="w-3.5 h-3.5" />}
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex rounded-xl overflow-hidden border border-slate-700">
          <button
            onClick={() => setTab('posiciones')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition ${tab === 'posiciones' ? 'bg-yellow-500 text-slate-900' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            <Trophy className="w-4 h-4" /> Posiciones
          </button>
          <button
            onClick={() => setTab('gestion')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition relative ${tab === 'gestion' ? 'bg-yellow-500 text-slate-900' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            <LayoutList className="w-4 h-4" /> Gestión
            {pendingCount > 0 && (
              <span className="absolute top-1.5 right-3 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5">
                {pendingCount}
              </span>
            )}
          </button>
        </div>

        {/* Tab: Posiciones */}
        {tab === 'posiciones' && (
          <div className="space-y-2">
            {leaderboard.map((entry, i) => (
              <div
                key={entry.user_id}
                className={`flex items-center gap-4 rounded-xl px-4 py-3 ${entry.user_id === userId ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-slate-800'}`}
              >
                <span className={`w-6 text-center font-bold ${MEDAL_COLORS[i] ?? 'text-slate-400'}`}>
                  {i < 3 ? <Medal className="w-5 h-5 inline" /> : i + 1}
                </span>
                <Link href={`/profile/${entry.username}`} className="flex-1 font-medium hover:text-yellow-400 transition">{entry.username}</Link>
                <div className="text-right">
                  <span className="text-lg font-bold text-yellow-400">{entry.points}</span>
                  <span className="text-slate-500 text-sm"> pts</span>
                </div>
                <div className="text-xs text-slate-500 hidden sm:block">
                  {entry.exact_results} exactos · {entry.correct_winner} ganador
                </div>
              </div>
            ))}
            {leaderboard.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-6">Aún no hay puntos registrados.</p>
            )}
          </div>
        )}

        {/* Tab: Gestión */}
        {tab === 'gestion' && (
          <div className="space-y-4">
            {/* Solicitudes pendientes */}
            {modRequests.length > 0 && (
              <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
                <h2 className="font-semibold text-slate-300 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-purple-400" />
                  Solicitudes de invitación
                  <span className="ml-auto text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">{modRequests.length}</span>
                </h2>
                <div className="space-y-3 divide-y divide-slate-700">
                  {modRequests.map(req => (
                    <div key={req.notif_id} className="pt-3 first:pt-0 space-y-2">
                      <p className="text-sm text-slate-200">
                        <Link href={`/profile/${req.mod_username}`} className="font-semibold text-white hover:text-yellow-400">@{req.mod_username}</Link>
                        <span className="text-slate-400"> quiere invitar a </span>
                        <span className="font-semibold text-white">@{req.target_username}</span>
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApproveRequest(req)}
                          disabled={processingReq === req.notif_id}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-yellow-500 text-slate-900 font-semibold rounded-lg hover:bg-yellow-400 disabled:opacity-50 transition"
                        >
                          {processingReq === req.notif_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          Aprobar
                        </button>
                        <button
                          onClick={() => handleDeclineRequest(req)}
                          disabled={processingReq === req.notif_id}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-slate-700 text-slate-300 font-semibold rounded-lg hover:bg-slate-600 disabled:opacity-50 transition"
                        >
                          {processingReq === req.notif_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                          Rechazar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Solicitudes directas de unirse */}
            {joinRequests.length > 0 && (
              <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
                <h2 className="font-semibold text-slate-300 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  Solicitudes para unirse
                  <span className="ml-auto text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">{joinRequests.length}</span>
                </h2>
                <div className="space-y-3 divide-y divide-slate-700">
                  {joinRequests.map(req => (
                    <div key={req.notif_id} className="pt-3 first:pt-0 space-y-2">
                      <p className="text-sm text-slate-200">
                        <Link href={`/profile/${req.requester_username}`} className="font-semibold text-white hover:text-yellow-400">@{req.requester_username}</Link>
                        <span className="text-slate-400"> quiere unirse al torneo</span>
                      </p>
                      <div className="flex gap-2">
                        <button onClick={() => handleApproveJoinRequest(req)} disabled={processingReq === req.notif_id}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-yellow-500 text-slate-900 font-semibold rounded-lg hover:bg-yellow-400 disabled:opacity-50 transition">
                          {processingReq === req.notif_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Aprobar
                        </button>
                        <button onClick={() => handleDeclineJoinRequest(req)} disabled={processingReq === req.notif_id}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-slate-700 text-slate-300 font-semibold rounded-lg hover:bg-slate-600 disabled:opacity-50 transition">
                          {processingReq === req.notif_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />} Rechazar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lista de miembros con gestión de roles */}
            <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
              <h2 className="font-semibold text-slate-300 flex items-center gap-2">
                <Shield className="w-4 h-4 text-yellow-400" />
                Miembros
                <span className="ml-auto text-xs text-slate-500">{memberList.length}</span>
              </h2>
              <div className="space-y-2">
                {memberList.map(m => (
                  <div key={m.user_id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
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
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="relative">
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
                        <button
                          onClick={() => setConfirmRemove({ userId: m.user_id, username: m.profiles?.username ?? '' })}
                          className="p-1 text-slate-500 hover:text-red-400 transition"
                          title="Eliminar miembro"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Vista sin tabs — moderadores y participantes
  return (
    <div className="space-y-4">
      <div>
          {showConfirm ? (
            <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
              <p className="text-sm text-slate-300">¿Seguro que querés abandonar <span className="font-semibold text-white">"{leagueName}"</span>?</p>
              <div className="flex gap-2">
                <button onClick={handleLeave} disabled={leaving}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-400 disabled:opacity-50 transition">
                  {leaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                  Sí, abandonar
                </button>
                <button onClick={() => setShowConfirm(false)}
                  className="text-xs px-3 py-1.5 bg-slate-700 text-slate-300 font-semibold rounded-lg hover:bg-slate-600 transition">
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowConfirm(true)}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-400 transition">
              <LogOut className="w-3.5 h-3.5" /> Abandonar torneo
            </button>
          )}
        </div>
    </div>
  )
}
