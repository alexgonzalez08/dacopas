export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import Feed, { FeedItem } from '@/components/feed'
import { isPredictionLocked } from '@/lib/predictions'
import DashboardClient from './dashboard-client'
import { getSuggestedFriends } from '@/lib/suggested-friends'
import PenaltyInfoModal from '@/components/penalty-info-modal'
import ChampionReminderModal from '@/components/champion-reminder-modal'
import { getActiveCompetition, getTeamsForCompetition, getFinalMatch } from '@/lib/champion-teams'
import { getCompetitionFormat } from '@/lib/competitions'
import { isChampionLockPassed } from '@/lib/champion-lock'

export default async function DashboardPage() {
  const supabase = await createClient()
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, avatar_url, welcome_seen, penalty_info_seen, champion_reminder_seen')
    .eq('id', user!.id)
    .single()

  const { data: memberships } = await supabase
    .from('league_members')
    .select('league_id, leagues(id, name, ended_at, competition_id)')
    .eq('user_id', user!.id)
    .is('left_at', null)

  const leagueIds = (memberships ?? []).map(m => m.league_id)

  // Torneos públicos para descubrir en el feed — requiere admin client porque RLS
  // solo permite leer torneos de los que ya sos miembro
  const { data: publicLeagues } = await supabaseAdmin
    .from('leagues')
    .select('id, name, image_url, competition_name')
    .eq('is_public', true)
    .is('ended_at', null)
    .not('id', 'in', `(${leagueIds.length > 0 ? leagueIds.join(',') : '00000000-0000-0000-0000-000000000000'})`)
    .order('created_at', { ascending: false })
    .limit(15)
  const activeLeagueIds = (memberships ?? [])
    .filter(m => !(m.leagues as any)?.ended_at)
    .map(m => m.league_id)
  const leagues = (memberships ?? [])
    .filter(m => m.leagues != null && !(m.leagues as any).ended_at)
    .map(m => m.leagues as unknown as { id: string; name: string })

  // Solo mostrar partidos para predecir de competencias donde el usuario tiene un torneo activo
  const competitionIds = [...new Set((memberships ?? [])
    .filter(m => !(m.leagues as any)?.ended_at)
    .map(m => (m.leagues as any)?.competition_id)
    .filter((id): id is number => id != null))]

  // Amigos en ambas direcciones
  const { data: friendships } = await supabase
    .from('friendships')
    .select('requester_id, addressee_id')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`)

  const friendIds = (friendships ?? []).map(f =>
    f.requester_id === user!.id ? f.addressee_id : f.requester_id
  )

  const FEED_SELECT = '*, profiles(username, avatar_url), matches(id, home_team, away_team, home_team_flag, away_team_flag, home_score, away_score, match_date), leagues(name, created_by), feed_reactions(id, emoji, user_id, profiles(username)), feed_comments(id, content, user_id, created_at, profiles(username))'

  const [
    { data: allUpcoming },
    { data: predictions },
    { data: friendEvents },
    { data: resultEvents },
    { data: userPosts },
    { data: systemPosts },
    { data: dismissedPosts },
    suggestedFriends,
    { data: bracketMatches },
    { data: championPredictions },
  ] = await Promise.all([
    competitionIds.length > 0
      ? supabase
          .from('matches')
          .select('*')
          .in('status', ['scheduled', 'live'])
          .in('competition_id', competitionIds)
          .gte('match_date', new Date(new Date().setUTCHours(0, 0, 0, 0)).toISOString())
          .order('match_date', { ascending: true })
          .limit(50)
      : Promise.resolve({ data: [] }),
    supabase.from('predictions').select('*').eq('user_id', user!.id),
    friendIds.length > 0
      ? supabase
          .from('feed_events')
          .select(FEED_SELECT)
          .in('user_id', friendIds)
          .order('created_at', { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] }),
    friendIds.length > 0
      ? supabase
          .from('feed_events')
          .select(FEED_SELECT)
          .eq('type', 'result')
          .in('user_id', friendIds)
          .order('created_at', { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] }),
    // Posts propios + de amigos en ligas compartidas
    supabase
      .from('user_posts')
      .select('*, profiles!user_posts_user_id_fkey(username, full_name, avatar_url), post_reactions(id, emoji, user_id, profiles(username)), post_comments(id, content, user_id, created_at, profiles(username, full_name, avatar_url))')
      .in('user_id', [user!.id, ...friendIds])
      .eq('is_system', false)
      .order('created_at', { ascending: false })
      .limit(30),
    // Posts de sistema (visibles para todos, usa admin para bypassear RLS)
    supabaseAdmin
      .from('user_posts')
      .select('*, post_type, metadata, profiles!user_posts_user_id_fkey(username, full_name, avatar_url), post_reactions(id, emoji, user_id, profiles(username)), post_comments(id, content, user_id, created_at, profiles(username, full_name, avatar_url))')
      .eq('is_system', true)
      .neq('post_type', 'stats')
      .order('created_at', { ascending: false })
      .limit(10),
    // Posts de sistema ocultados por este usuario
    supabaseAdmin
      .from('dismissed_posts')
      .select('post_id')
      .eq('user_id', user!.id),
    getSuggestedFriends(supabase, user!.id),
    supabase
      .from('matches')
      .select('id, home_team, away_team, home_team_flag, away_team_flag, match_date, stage, status, home_score, away_score, penalty_home, penalty_away, competition_name')
      .in('stage', ['group', 'round_of_32', 'round_of_16', 'quarter', 'semi', 'final']),
    supabase.from('champion_predictions').select('*').eq('user_id', user!.id),
  ])

  const predMap = new Map((predictions ?? []).map(p => [p.match_id, p]))
  const allMatches = allUpcoming ?? []
  const available = allMatches.filter(m => !isPredictionLocked(m))
  const todayStr = new Date().toISOString().slice(0, 10)
  const todayUnlocked = available.filter(m => m.match_date.slice(0, 10) === todayStr)
  const displayMatches = todayUnlocked.length > 0
    ? todayUnlocked
    : available.length > 0
      ? available.filter(m => m.match_date.slice(0, 10) === available[0].match_date.slice(0, 10))
      : []

  // El Mundial se sigue mostrando partido por partido. Las ligas todos-contra-todos
  // pueden tener muchos partidos a la misma hora — se agrupan en una sola tarjeta por
  // competencia que lleva a Predicciones con esa competencia y fecha ya abiertas.
  const knockoutDisplayMatches = displayMatches.filter(m => getCompetitionFormat(m.competition_id) !== 'round_robin')
  const roundRobinDisplayMatches = displayMatches.filter(m => getCompetitionFormat(m.competition_id) === 'round_robin')

  const matchPosts: FeedItem[] = knockoutDisplayMatches.map(m => ({
    kind: 'match' as const,
    ...m,
    prediction: predMap.get(m.id) ?? null,
    sortDate: new Date(m.match_date),
  }))

  const roundRobinByCompetition = new Map<string, typeof roundRobinDisplayMatches>()
  for (const m of roundRobinDisplayMatches) {
    const key = m.competition_name ?? 'Liga'
    if (!roundRobinByCompetition.has(key)) roundRobinByCompetition.set(key, [])
    roundRobinByCompetition.get(key)!.push(m)
  }
  const matchdayPosts: FeedItem[] = [...roundRobinByCompetition.entries()].map(([compName, ms]) => {
    const sorted = [...ms].sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())
    return {
      kind: 'competition_matchday' as const,
      id: `matchday-${compName}`,
      competitionName: compName,
      matchCount: ms.length,
      matchday: sorted[0]?.matchday ?? null,
      nextMatchDate: sorted[0].match_date,
      sortDate: new Date(sorted[0].match_date),
    }
  })

  const leagueIdSet = new Set(leagueIds)
  const activeLeagueIdSet = new Set(activeLeagueIds)
  const seen = new Set<string>()
  const seenPredictionUsers = new Set<string>()
  const feedEvents = [...(friendEvents ?? []), ...(resultEvents ?? [])].filter((e: any) => {
    if (seen.has(e.id)) return false
    seen.add(e.id)
    if (e.type === 'league_create') return false
    // Ocultar eventos de torneos finalizados o de los que el usuario no es miembro
    if (e.league_id && !activeLeagueIdSet.has(e.league_id)) return false
    if (e.type === 'league_join' && e.leagues?.created_by === user!.id) return false
    if (e.type === 'league_join' && e.leagues?.created_by === e.user_id) return false
    // Una sola tarjeta de predicciones por usuario
    if (e.type === 'prediction') {
      if (seenPredictionUsers.has(e.user_id)) return false
      seenPredictionUsers.add(e.user_id)
    }
    return true
  })

  const activityPosts: FeedItem[] = feedEvents.map((e: any) => ({
    kind: 'activity' as const,
    ...e,
    sortDate: new Date(e.created_at),
  }))

  const dismissedIds = new Set((dismissedPosts ?? []).map((d: any) => d.post_id))

  // Ocultar posts de amigos que pertenecen a torneos en los que el usuario no es miembro activo
  const userPostItems: FeedItem[] = (userPosts ?? [])
    .filter((p: any) => !p.league_id || activeLeagueIdSet.has(p.league_id))
    .map((p: any) => ({
      kind: 'user_post' as const,
      ...p,
      sortDate: new Date(p.created_at),
    }))

  const systemPostItems: FeedItem[] = (systemPosts ?? [])
    .filter((p: any) => !dismissedIds.has(p.id))
    .map((p: any) => ({
      kind: 'user_post' as const,
      ...p,
      sortDate: new Date(p.created_at),
    }))

  const seenFeedIds = new Set<string>()
  const allItems = [...matchPosts, ...matchdayPosts, ...activityPosts, ...userPostItems, ...systemPostItems].filter(item => {
    const id = String((item as any).id)
    if (seenFeedIds.has(id)) return false
    seenFeedIds.add(id)
    return true
  })
  const isMatchLike = (item: FeedItem) => item.kind === 'match' || item.kind === 'competition_matchday'
  const feed: FeedItem[] = allItems.sort((a, b) => {
    if (isMatchLike(a) && isMatchLike(b)) return a.sortDate.getTime() - b.sortDate.getTime()
    if (isMatchLike(a)) return -1
    if (isMatchLike(b)) return 1
    return b.sortDate.getTime() - a.sortDate.getTime()
  })

  const serverNow = new Date().toISOString()

  const activeCompetition = getActiveCompetition(bracketMatches ?? [])
  const championPredMap = new Map((championPredictions ?? []).map(cp => [cp.competition_name, cp]))

  // Solo tiene sentido recordar mientras el Mundial (knockout) siga abierto para predecir campeón
  const champLockPassed = isChampionLockPassed(
    (bracketMatches ?? []).map(m => ({ stage: m.stage, matchday: null, match_date: m.match_date })),
    'knockout'
  )

  return (
    <>
    <PenaltyInfoModal
      userId={user!.id}
      autoOpen={!(profile?.penalty_info_seen ?? false)}
    />
    <ChampionReminderModal
      userId={user!.id}
      autoOpen={!(profile?.champion_reminder_seen ?? false) && activeCompetition === 'FIFA World Cup' && !champLockPassed}
    />
    <DashboardClient
      userId={user!.id}
      username={profile?.username ?? ''}
      avatarUrl={profile?.avatar_url ?? null}
      leagues={leagues}
      initialFeed={feed}
      serverNow={serverNow}
      hasLeagues={leagueIds.length > 0}
      showWelcome={!profile?.welcome_seen}
      suggestedFriends={suggestedFriends}
      publicLeagues={publicLeagues ?? []}
      championPredictionProps={activeCompetition ? {
        competitionName: activeCompetition,
        teams: getTeamsForCompetition(bracketMatches ?? [], activeCompetition),
        finalMatch: getFinalMatch(bracketMatches ?? [], activeCompetition),
        prediction: championPredMap.get(activeCompetition) ?? null,
      } : null}
    />
    </>
  )
}
