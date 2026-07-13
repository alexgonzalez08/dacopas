export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { notFound, redirect } from 'next/navigation'
import { Medal, Globe, Lock } from 'lucide-react'
import Link from 'next/link'
import ShareButton from './share-button'
import InviteFriends from './invite-friends'
import LeagueClient from './league-client'
import LeagueInviteBanner from './league-invite-banner'
import LeagueHeaderMenu from './league-header-menu'
import JoinPublicButton from './join-public-button'
import CopyCodeButton from './copy-code-button'
import { getFinalMatch } from '@/lib/champion-teams'
import { computeChampionResult, computePoints } from '@/lib/champion-scoring'
import { getCompetitionFormat, isChampionSupported } from '@/lib/competitions'
import { calcStandings } from '@/lib/standings'
import { isChampionLockPassed } from '@/lib/champion-lock'

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
    .select('id, name, code, image_url, description, created_by, created_at, ended_at, competition_id, competition_name, champion_prediction_enabled, is_public')
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
    if (!invite && !league.is_public) redirect(`/leagues/${id}/join`)

    // Vista de invitado/no-miembro — usar adminSupabase para bypassear RLS en queries de solo lectura
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
      .sort((a, b) => b.points - a.points || b.exact_results - a.exact_results || b.correct_winner - a.correct_winner)

    const medalColors = ['text-yellow-400', 'text-slate-300', 'text-amber-600']

    // Torneo público sin invitación — vista de solo lectura, solo tabla de posiciones
    if (!invite) {
      return (
        <div className="space-y-6">
          <div className="space-y-1">
            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 font-medium border border-yellow-500/20">
              🏆 {league.competition_name ?? 'FIFA World Cup'}
            </span>
            <span className="ml-1 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400 font-medium border border-slate-600/40">
              <Globe className="w-3 h-3" /> Público
            </span>
            <h1 className="text-2xl font-bold">{league.name}</h1>
            <p className="text-xs text-slate-500 mt-1">Estás viendo la tabla de posiciones de este torneo público</p>
          </div>

          <JoinPublicButton leagueId={id} leagueName={league.name} />

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

    // Para league_created no hay código de invitación — usamos el código del torneo
    const inviteCode = invite.type === 'league_invite'
      ? invite.metadata?.league_code
      : league.code

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
              🏆 {league.competition_name ?? 'FIFA World Cup'}
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
    .sort((a, b) => b.points - a.points || b.exact_results - a.exact_results || b.correct_winner - a.correct_winner)

  // Partidos + predicciones de todos los miembros
  const memberIds = members.map(m => m.user_id)
  const usernameMap = new Map(members.map(m => [m.user_id, m.profiles?.username ?? 'Usuario']))

  // Fetch predicciones paginado para superar el límite de PostgREST (1000 rows)
  async function fetchAllPredictions(userIds: string[]) {
    const PAGE = 1000
    let offset = 0
    const all: any[] = []
    while (true) {
      const { data } = await adminSupabase
        .from('predictions')
        .select('user_id, match_id, home_score, away_score, penalty_winner')
        .in('user_id', userIds)
        .eq('status', 'locked')
        .range(offset, offset + PAGE - 1)
      if (!data || data.length === 0) break
      all.push(...data)
      if (data.length < PAGE) break
      offset += PAGE
    }
    return all
  }

  const format = getCompetitionFormat(league.competition_id)

  let matchesQuery = supabase.from('matches')
    .select('id, home_team, away_team, home_team_flag, away_team_flag, match_date, status, home_score, away_score, penalty_home, penalty_away, stage, group_name, matchday, competition_name')
    .order('match_date', { ascending: true })
  matchesQuery = league.competition_id != null
    ? matchesQuery.eq('competition_id', league.competition_id)
    : matchesQuery.eq('competition_name', league.competition_name ?? 'FIFA World Cup')

  const [{ data: allMatches }, allPredictions, { data: userProfile }, { data: championPredictionsData }] = await Promise.all([
    matchesQuery,
    fetchAllPredictions(memberIds),
    supabase.from('profiles').select('leagues_info_seen').eq('id', user!.id).single(),
    adminSupabase.from('champion_predictions').select('user_id, competition_name, champion_team, finalist_team, champion_score, runner_up_score, penalty_winner').in('user_id', memberIds),
  ])

  const predsByMatch = new Map<string, typeof allPredictions>()
  for (const pred of allPredictions ?? []) {
    if (!predsByMatch.has(pred.match_id)) predsByMatch.set(pred.match_id, [])
    predsByMatch.get(pred.match_id)!.push(pred)
  }

  function calcPoints(
    pred: { home_score: number | null; away_score: number | null; penalty_winner?: string | null },
    match: { home_score: number | null; away_score: number | null; penalty_home?: number | null; penalty_away?: number | null }
  ) {
    if (pred.home_score === null || pred.away_score === null) return null
    if (match.home_score === null || match.away_score === null) return null
    const ph = Number(pred.home_score), pa = Number(pred.away_score)
    const mh = Number(match.home_score), ma = Number(match.away_score)
    const penaltyWinner = match.penalty_home != null && match.penalty_away != null
      ? (match.penalty_home > match.penalty_away ? 'home' : 'away')
      : null
    const exactScore = ph === mh && pa === ma
    const predWinner = ph > pa ? 'home' : pa > ph ? 'away' : 'draw'
    const realWinner = mh > ma ? 'home' : ma > mh ? 'away' : 'draw'
    const correctPenalty = penaltyWinner !== null && pred.penalty_winner === penaltyWinner
    if (exactScore && correctPenalty) return 5
    if (exactScore) return 3
    if (correctPenalty) return 3
    if (predWinner === realWinner) return 1
    return 0
  }

  const matchesWithPredictions = (allMatches ?? [])
    .filter(m => m.status === 'finished' && m.match_date >= league.created_at)
    .map(m => {
      const seen = new Set<string>()
      const preds = (predsByMatch.get(m.id) ?? [])
        .filter(p => { if (seen.has(p.user_id)) return false; seen.add(p.user_id); return true })
        .map(p => ({
          user_id: p.user_id,
          username: usernameMap.get(p.user_id) ?? 'Usuario',
          home_score: p.home_score,
          away_score: p.away_score,
          penalty_winner: (p.penalty_winner as 'home' | 'away' | null) ?? null,
          points: calcPoints(p, m),
        }))
      return { ...m, predictions: preds }
    })

  // Predicción de campeón — comparación por liga
  const activeCompetition = league.competition_name ?? 'FIFA World Cup'
  const championFinalMatch = format === 'knockout' ? getFinalMatch(allMatches ?? [], activeCompetition) : null
  const championActualResult = championFinalMatch ? computeChampionResult(championFinalMatch) : null

  const standings = format === 'round_robin' ? calcStandings(allMatches ?? []) : null
  const seasonFinished = format === 'round_robin' && (allMatches ?? []).length > 0 && (allMatches ?? []).every(m => m.status === 'finished')
  const standingsChampion = standings && standings.length > 0 ? standings[0].team : null
  const championLockPassed = isChampionLockPassed(allMatches ?? [], format)

  const championRevealed = format === 'round_robin'
    ? seasonFinished
    : championFinalMatch?.status === 'finished' && championActualResult !== null

  const championPredByUser = new Map((championPredictionsData ?? [])
    .filter(cp => cp.competition_name === activeCompetition)
    .map(cp => [cp.user_id, cp]))

  const ROUND_ROBIN_CORRECT_POINTS = 8

  const championPredictionEntries = memberIds.map(uid => {
    const cp = championPredByUser.get(uid)
    const points = format === 'round_robin'
      ? (cp && seasonFinished ? (cp.champion_team === standingsChampion ? ROUND_ROBIN_CORRECT_POINTS : 0) : null)
      : (cp && championActualResult ? computePoints(cp, championActualResult).points : null)
    return {
      user_id: uid,
      username: usernameMap.get(uid) ?? 'Usuario',
      champion_team: cp?.champion_team ?? null,
      finalist_team: cp?.finalist_team ?? null,
      champion_score: cp?.champion_score ?? null,
      runner_up_score: cp?.runner_up_score ?? null,
      penalty_winner: (cp?.penalty_winner as 'champion' | 'runner_up' | null) ?? null,
      points,
    }
  })

  const ended = !!(league as any).ended_at

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
                🏆 {activeCompetition}
              </span>
              {ended && (
                <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 font-medium border border-orange-500/20">
                  Torneo Finalizado
                </span>
              )}
              <span
                className="ml-1 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400 font-medium border border-slate-600/40"
                title={league.is_public ? 'Cualquiera con el link se une sin pedir permiso' : 'Quien entre por el link debe solicitar unirse'}
              >
                {league.is_public ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                {league.is_public ? 'Público' : 'Privado'}
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
                initialIsPublic={league.is_public ?? false}
                ended={ended}
              />
            </div>
          </div>

          {league.description && (
            <p className="text-sm text-slate-400 leading-relaxed">{league.description}</p>
          )}

          {!ended && (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <p className="text-xs text-slate-500">
                  Código: <span className="font-mono font-semibold text-yellow-400">{league.code}</span>
                </p>
                <CopyCodeButton code={league.code} />
              </div>
              <ShareButton leagueId={id} leagueName={league.name} competitionName={league.competition_name ?? 'FIFA World Cup'} />
            </div>
          )}
          <Link href="/support" className="text-xs text-slate-500 hover:text-yellow-400 transition">
            ¿Tenés un problema? Reportalo aquí
          </Link>
        </div>
      </div>

      {!ended && friendsNotInLeague.length > 0 && (
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
        leaguesInfoSeen={userProfile?.leagues_info_seen ?? false}
        championPredictions={championPredictionEntries}
        championRevealed={championRevealed}
        competitionFormat={format}
        championPredictionEnabled={league.champion_prediction_enabled ?? true}
        isWorldCup={league.competition_id === 1}
        championSupported={isChampionSupported(league.competition_id)}
        championLockPassed={championLockPassed}
        ended={ended}
        isPublic={league.is_public ?? false}
      />
    </div>
  )
}
