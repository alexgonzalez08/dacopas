import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { notFound, redirect } from 'next/navigation'
import { Medal } from 'lucide-react'
import Link from 'next/link'
import ShareButton from './share-button'
import InviteFriends from './invite-friends'
import LeagueClient from './league-client'
import LeagueInviteBanner from './league-invite-banner'
import LeagueHeaderMenu from './league-header-menu'
import CopyCodeButton from './copy-code-button'

export default async function LeaguePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const adminSupabase = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Usar adminClient para leer el torneo — el usuario puede ser invitado (no miembro aún)
  const { data: league } = await adminSupabase
    .from('leagues')
    .select('id, name, code, image_url, description, created_by, created_at, ended_at')
    .eq('id', id)
    .single()

  if (!league) notFound()

  // Traer todos los miembros activos con perfil y rol
  const { data: membersData } = await supabase
    .from('league_members')
    .select('user_id, role, profiles(username, full_name, avatar_url)')
    .eq('league_id', id)
    .is('left_at', null)

  const members = Array.from(
    new Map(
      (membersData ?? []).map(m => [m.user_id, {
        user_id: m.user_id,
        role: (m.role ?? 'participant') as 'admin' | 'moderator' | 'participant',
        profiles: (Array.isArray(m.profiles) ? m.profiles[0] : m.profiles) as { username: string; full_name: string | null; avatar_url: string | null } | null,
      }])
    ).values()
  )

  const currentMember = members.find(m => m.user_id === user!.id)

  // Si no es miembro activo, verificar si fue eliminado (left_at set)
  if (!currentMember) {
    const { data: removedRecord } = await adminSupabase
      .from('league_members')
      .select('user_id')
      .eq('league_id', id)
      .eq('user_id', user!.id)
      .not('left_at', 'is', null)
      .maybeSingle()

    if (removedRecord) redirect('/dashboard')
  }

  // Si no es miembro, verificar si tiene invitación pendiente
  if (!currentMember) {
    // Torneo terminado — no permitir acceso a no-miembros
    if ((league as any).ended_at) redirect('/dashboard')

    const { data: invites } = await supabase
      .from('notifications')
      .select('id, metadata, type')
      .eq('user_id', user!.id)
      .in('type', ['league_invite', 'league_created'])

    const invite = invites?.find(n => n.metadata?.league_id === id) ?? null
    if (!invite) redirect(`/leagues/${id}/join`)

    // Para league_created no hay código de invitación — usamos el código del torneo
    const inviteCode = invite.type === 'league_invite'
      ? invite.metadata?.league_code
      : league.code

    // Vista de invitado — usar adminSupabase para bypassear RLS en queries de solo lectura
    const { data: guestMembers } = await adminSupabase
      .from('league_members')
      .select('user_id, role, profiles(username, full_name, avatar_url)')
      .eq('league_id', id)
      .is('left_at', null)

    const guestMemberList = (guestMembers ?? []).map(m => ({
      user_id: m.user_id,
      profiles: (Array.isArray(m.profiles) ? m.profiles[0] : m.profiles) as { username: string } | null,
    }))

    const { data: points } = await adminSupabase
      .from('league_points')
      .select('user_id, points, exact_results, correct_winner')
      .eq('league_id', id)

    const pointsMap = new Map((points ?? []).map(p => [p.user_id, p]))
    const leaderboard = guestMemberList
      .map(m => ({
        user_id: m.user_id,
        username: m.profiles?.username ?? 'Usuario',
        points: pointsMap.get(m.user_id)?.points ?? 0,
        exact_results: pointsMap.get(m.user_id)?.exact_results ?? 0,
        correct_winner: pointsMap.get(m.user_id)?.correct_winner ?? 0,
      }))
      .sort((a, b) => b.points - a.points)

    const medalColors = ['text-yellow-400', 'text-slate-300', 'text-amber-600']

    return (
      <div className="space-y-6">
        <div className="space-y-4">
          {league.image_url && (
            <div className="w-full h-40 rounded-2xl overflow-hidden">
              <img src={league.image_url} alt={league.name} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="space-y-1">
            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 font-medium border border-yellow-500/20">
              🏆 Mundial 2026
            </span>
            <h1 className="text-2xl font-bold">{league.name}</h1>
            {league.description && (
              <p className="text-sm text-slate-400">{league.description}</p>
            )}
            <p className="text-xs text-slate-500 mt-1">Estás viendo este torneo como invitado</p>
          </div>
        </div>

        <LeagueInviteBanner
          leagueId={id}
          leagueCode={inviteCode}
          leagueName={league.name}
          notificationId={invite.id}
          isRequest={invite.type === 'league_created'}
        />

        <div>
          <h2 className="font-semibold mb-3 text-slate-300">Tabla de posiciones</h2>
          <div className="space-y-2">
            {leaderboard.map((entry, i) => (
              <div key={entry.user_id} className="flex items-center gap-4 rounded-xl px-4 py-3 bg-slate-800">
                <span className={`w-6 text-center font-bold ${medalColors[i] ?? 'text-slate-400'}`}>
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
          </div>
        </div>
      </div>
    )
  }

  const userRole = currentMember.role
  const adminIds = members.filter(m => m.role === 'admin').map(m => m.user_id)

  // Solicitudes de moderadores pendientes — solo para admins
  let modRequests: { notif_id: string; mod_user_id: string; mod_username: string; target_user_id: string; target_username: string; league_code: string }[] = []
  let joinRequests: { notif_id: string; requester_user_id: string; requester_username: string }[] = []
  if (userRole === 'admin') {
    const [{ data: pendingReqs }, { data: pendingJoins }] = await Promise.all([
      supabase.from('notifications').select('id, from_user_id, metadata')
        .eq('user_id', user!.id).eq('type', 'mod_invite_request'),
      supabase.from('notifications').select('id, from_user_id, metadata')
        .eq('user_id', user!.id).eq('type', 'join_request'),
    ])
    modRequests = (pendingReqs ?? [])
      .filter(n => n.metadata?.league_id === id)
      .map(n => ({
        notif_id: n.id,
        mod_user_id: n.from_user_id ?? '',
        mod_username: n.metadata?.mod_username ?? '',
        target_user_id: n.metadata?.target_user_id ?? '',
        target_username: n.metadata?.target_username ?? '',
        league_code: n.metadata?.league_code ?? '',
      }))
    joinRequests = (pendingJoins ?? [])
      .filter(n => n.metadata?.league_id === id)
      .map(n => ({
        notif_id: n.id,
        requester_user_id: n.from_user_id ?? '',
        requester_username: n.metadata?.requester_username ?? '',
      }))
  }

  // Amigos que no están en el torneo (solo para admin y moderador)
  let friendsNotInLeague: { id: string; username: string; full_name: string | null; avatar_url: string | null }[] = []
  let pendingInvites: string[] = []

  if (userRole === 'admin' || userRole === 'moderator') {
    const { data: friendships } = await supabase
      .from('friendships')
      .select('requester:requester_id(id, username, full_name, avatar_url), addressee:addressee_id(id, username, full_name, avatar_url)')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`)

    const memberUserIds = new Set(members.map(m => m.user_id))

    // Excluir también ex-miembros eliminados por el admin
    const { data: exMembers } = await adminSupabase
      .from('league_members')
      .select('user_id')
      .eq('league_id', id)
      .not('left_at', 'is', null)
    const exMemberIds = new Set((exMembers ?? []).map(m => m.user_id))

    friendsNotInLeague = (friendships ?? [])
      .map(f => ((f.requester as any)?.id === user!.id ? f.addressee : f.requester) as any)
      .filter((p: any) => p != null && !memberUserIds.has(p.id) && !exMemberIds.has(p.id))

    const friendIds = friendsNotInLeague.map(f => f.id)
    if (friendIds.length > 0) {
      if (userRole === 'admin') {
        const { data: adminPending } = await adminSupabase
          .from('notifications')
          .select('user_id')
          .eq('from_user_id', user!.id)
          .eq('type', 'league_invite')
          .eq('metadata->>league_id', id)
          .in('user_id', friendIds)
        pendingInvites = (adminPending ?? []).map(n => n.user_id)
      } else {
        const { data: modPending } = await adminSupabase
          .from('notifications')
          .select('metadata')
          .eq('from_user_id', user!.id)
          .eq('type', 'mod_invite_request')
          .eq('metadata->>league_id', id)
        pendingInvites = (modPending ?? [])
          .map(n => n.metadata?.target_user_id)
          .filter(Boolean) as string[]
      }
    }
  }

  // Puntos para el leaderboard
  const { data: points } = await supabase
    .from('league_points')
    .select('user_id, points, exact_results, correct_winner')
    .eq('league_id', id)

  const pointsMap = new Map((points ?? []).map(p => [p.user_id, p]))

  const leaderboard = members
    .map(m => ({
      user_id: m.user_id,
      username: m.profiles?.username ?? 'Usuario',
      role: m.role,
      points: pointsMap.get(m.user_id)?.points ?? 0,
      exact_results: pointsMap.get(m.user_id)?.exact_results ?? 0,
      correct_winner: pointsMap.get(m.user_id)?.correct_winner ?? 0,
    }))
    .sort((a, b) => b.points - a.points)

  // Partidos + predicciones de todos los miembros
  const memberIds = members.map(m => m.user_id)
  const usernameMap = new Map(members.map(m => [m.user_id, m.profiles?.username ?? 'Usuario']))

  const [{ data: allMatches }, { data: allPredictions }] = await Promise.all([
    supabase.from('matches').select('id, home_team, away_team, home_team_flag, away_team_flag, match_date, status, home_score, away_score')
      .order('match_date', { ascending: true }),
    supabase.from('predictions').select('user_id, match_id, home_score, away_score, points, status')
      .in('user_id', memberIds)
      .eq('status', 'locked'),
  ])

  const predsByMatch = new Map<string, typeof allPredictions>()
  for (const pred of allPredictions ?? []) {
    if (!predsByMatch.has(pred.match_id)) predsByMatch.set(pred.match_id, [])
    predsByMatch.get(pred.match_id)!.push(pred)
  }

  const matchesWithPredictions = (allMatches ?? [])
    .filter(m => m.status === 'live' || m.status === 'finished')
    .map(m => ({
      ...m,
      predictions: (predsByMatch.get(m.id) ?? []).map(p => ({
        user_id: p.user_id,
        username: usernameMap.get(p.user_id) ?? 'Usuario',
        home_score: p.home_score,
        away_score: p.away_score,
        points: p.points,
      })),
    }))

  const medalColors = ['text-yellow-400', 'text-slate-300', 'text-amber-600']
  const RANK_STYLES = [
    { medal: '🥇', text: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' },
    { medal: '🥈', text: 'text-slate-300', bg: 'bg-slate-700/50 border-slate-600/30' },
    { medal: '🥉', text: 'text-amber-500', bg: 'bg-amber-700/10 border-amber-600/30' },
  ]

  // Modo solo lectura — torneo finalizado
  if ((league as any).ended_at) {
    return (
      <div className="space-y-6">
        {league.image_url && (
          <div className="w-full h-40 rounded-2xl overflow-hidden">
            <img src={league.image_url} alt={league.name} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="text-center space-y-1 py-2">
          <p className="text-3xl">🏆</p>
          <h1 className="text-2xl font-bold">{league.name}</h1>
          <span className="inline-block text-xs px-3 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 font-semibold">
            Torneo Finalizado
          </span>
        </div>
        <div className="space-y-2">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider px-1">Tabla final</p>
          {leaderboard.map((entry, i) => {
            const style = RANK_STYLES[i] ?? { medal: `${i + 1}`, text: 'text-slate-400', bg: 'bg-slate-800 border-slate-700/30' }
            return (
              <div key={entry.user_id} className={`flex items-center gap-4 rounded-xl px-4 py-3 border ${style.bg}`}>
                <span className="text-xl w-6 text-center">{i < 3 ? style.medal : <span className={`font-bold ${style.text}`}>{i + 1}</span>}</span>
                <Link href={`/profile/${entry.username}`} className={`flex-1 font-medium hover:underline ${style.text}`}>{entry.username}</Link>
                <div className="text-right">
                  <span className={`text-lg font-bold ${style.text}`}>{entry.points}</span>
                  <span className="text-slate-500 text-sm"> pts</span>
                </div>
                <div className="text-xs text-slate-500 hidden sm:block">
                  {entry.exact_results} exactos · {entry.correct_winner} ganador
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header del torneo */}
      <div className="space-y-4">
        {league.image_url && (
          <div className="w-full h-40 rounded-2xl overflow-hidden">
            <img src={league.image_url} alt={league.name} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 font-medium border border-yellow-500/20">
                🏆 Mundial 2026
              </span>
              <h1 className="text-2xl font-bold leading-tight">{league.name}</h1>
            </div>
            <div className="flex items-center gap-1 shrink-0 mt-1">
              <LeagueHeaderMenu
                leagueId={id}
                leagueName={league.name}
                userId={user!.id}
                userRole={userRole}
                initialName={league.name}
                initialDescription={league.description ?? null}
                initialImageUrl={league.image_url ?? null}
              />
            </div>
          </div>

          {league.description && (
            <p className="text-sm text-slate-400 leading-relaxed">{league.description}</p>
          )}

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <p className="text-xs text-slate-500">
                Código: <span className="font-mono font-semibold text-yellow-400">{league.code}</span>
              </p>
              <CopyCodeButton code={league.code} />
            </div>
            <ShareButton leagueId={id} leagueName={league.name} />
          </div>
        </div>
      </div>

      {friendsNotInLeague.length > 0 && (
        <InviteFriends
          leagueId={id}
          leagueCode={league.code}
          leagueName={league.name}
          userId={user!.id}
          userRole={userRole}
          friends={friendsNotInLeague}
          pendingInvites={pendingInvites}
          adminIds={adminIds}
        />
      )}


      <LeagueClient
        leagueId={id}
        leagueName={league.name}
        userId={user!.id}
        userRole={userRole}
        members={members}
        adminIds={adminIds}
        modRequests={modRequests}
        joinRequests={joinRequests}
        leaderboard={leaderboard}
        username={currentMember?.profiles?.username ?? ''}
        avatarUrl={currentMember?.profiles?.avatar_url}
        matches={matchesWithPredictions}
      />
    </div>
  )
}
