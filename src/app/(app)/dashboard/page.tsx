import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import Feed, { FeedItem } from '@/components/feed'
import { isPredictionLocked } from '@/lib/predictions'
import DashboardClient from './dashboard-client'
import { getSuggestedFriends } from '@/lib/suggested-friends'

export default async function DashboardPage() {
  const supabase = await createClient()
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, avatar_url, welcome_seen')
    .eq('id', user!.id)
    .single()

  const { data: memberships } = await supabase
    .from('league_members')
    .select('league_id, leagues(id, name, ended_at)')
    .eq('user_id', user!.id)
    .is('left_at', null)

  const leagueIds = (memberships ?? []).map(m => m.league_id)
  const activeLeagueIds = (memberships ?? [])
    .filter(m => !(m.leagues as any)?.ended_at)
    .map(m => m.league_id)
  const leagues = (memberships ?? [])
    .filter(m => m.leagues != null && !(m.leagues as any).ended_at)
    .map(m => m.leagues as unknown as { id: string; name: string })

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
  ] = await Promise.all([
    supabase
      .from('matches')
      .select('*')
      .in('status', ['scheduled', 'live'])
      .gte('match_date', new Date().toISOString().slice(0, 10))
      .order('match_date', { ascending: true })
      .limit(50),
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
      .select('*, profiles!user_posts_user_id_fkey(username, full_name, avatar_url), post_reactions(id, emoji, user_id), post_comments(id, content, user_id, created_at, profiles(username, full_name, avatar_url))')
      .in('user_id', [user!.id, ...friendIds])
      .eq('is_system', false)
      .order('created_at', { ascending: false })
      .limit(30),
    // Posts de sistema (visibles para todos, usa admin para bypassear RLS)
    supabaseAdmin
      .from('user_posts')
      .select('*, profiles!user_posts_user_id_fkey(username, full_name, avatar_url), post_reactions(id, emoji, user_id), post_comments(id, content, user_id, created_at, profiles(username, full_name, avatar_url))')
      .eq('is_system', true)
      .order('created_at', { ascending: false })
      .limit(10),
    // Posts de sistema ocultados por este usuario
    supabaseAdmin
      .from('dismissed_posts')
      .select('post_id')
      .eq('user_id', user!.id),
    getSuggestedFriends(supabase, user!.id),
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

  const matchPosts: FeedItem[] = displayMatches.map(m => ({
    kind: 'match' as const,
    ...m,
    prediction: predMap.get(m.id) ?? null,
    sortDate: new Date(m.match_date),
  }))

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
  const allItems = [...matchPosts, ...activityPosts, ...userPostItems, ...systemPostItems].filter(item => {
    const id = String((item as any).id)
    if (seenFeedIds.has(id)) return false
    seenFeedIds.add(id)
    return true
  })
  const feed: FeedItem[] = allItems.sort((a, b) => {
    if (a.kind === 'match' && b.kind === 'match') return a.sortDate.getTime() - b.sortDate.getTime()
    if (a.kind === 'match') return -1
    if (b.kind === 'match') return 1
    return b.sortDate.getTime() - a.sortDate.getTime()
  })

  const serverNow = new Date().toISOString()

  return (
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
    />
  )
}
