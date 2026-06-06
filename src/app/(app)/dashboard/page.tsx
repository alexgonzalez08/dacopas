import { createClient } from '@/lib/supabase/server'
import Feed, { FeedItem } from '@/components/feed'
import { isPredictionLocked } from '@/lib/predictions'
import DashboardClient from './dashboard-client'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, avatar_url')
    .eq('id', user!.id)
    .single()

  const { data: memberships } = await supabase
    .from('league_members')
    .select('league_id, leagues(id, name)')
    .eq('user_id', user!.id)

  const leagueIds = (memberships ?? []).map(m => m.league_id)
  const leagues = (memberships ?? []).flatMap(m => m.leagues ? [m.leagues as unknown as { id: string; name: string }] : [])

  // Amigos en ambas direcciones
  const { data: friendships } = await supabase
    .from('friendships')
    .select('requester_id, addressee_id')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`)

  const friendIds = (friendships ?? []).map(f =>
    f.requester_id === user!.id ? f.addressee_id : f.requester_id
  )

  const FEED_SELECT = '*, profiles(username, avatar_url), matches(id, home_team, away_team, home_team_flag, away_team_flag, home_score, away_score, match_date), leagues(name), feed_reactions(id, emoji, user_id, profiles(username)), feed_comments(id, content, user_id, created_at, profiles(username))'

  const [
    { data: allUpcoming },
    { data: predictions },
    { data: friendEvents },
    { data: resultEvents },
    { data: userPosts },
  ] = await Promise.all([
    supabase
      .from('matches')
      .select('*')
      .in('status', ['scheduled', 'live'])
      .gte('match_date', new Date().toISOString())
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
      .select('*, profiles(username, full_name, avatar_url), post_reactions(id, emoji, user_id), post_comments(id, content, user_id, created_at, profiles(username, full_name, avatar_url))')
      .in('user_id', [user!.id, ...friendIds])
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  const predMap = new Map((predictions ?? []).map(p => [p.match_id, p]))
  const available = (allUpcoming ?? []).filter(m => !isPredictionLocked(m))
  const todayStr = new Date().toISOString().slice(0, 10)
  const todayMatches = available.filter(m => m.match_date.slice(0, 10) === todayStr)
  const displayMatches = todayMatches.length > 0
    ? todayMatches
    : available.length > 0
      ? available.filter(m => m.match_date.slice(0, 10) === available[0].match_date.slice(0, 10))
      : []

  const matchPosts: FeedItem[] = displayMatches.map(m => ({
    kind: 'match' as const,
    ...m,
    prediction: predMap.get(m.id) ?? null,
    sortDate: new Date(m.match_date),
  }))

  const seen = new Set<string>()
  const feedEvents = [...(friendEvents ?? []), ...(resultEvents ?? [])].filter(e => {
    if (seen.has(e.id)) return false
    seen.add(e.id)
    return true
  })

  const activityPosts: FeedItem[] = feedEvents.map((e: any) => ({
    kind: 'activity' as const,
    ...e,
    sortDate: new Date(e.created_at),
  }))

  const userPostItems: FeedItem[] = (userPosts ?? []).map((p: any) => ({
    kind: 'user_post' as const,
    ...p,
    sortDate: new Date(p.created_at),
  }))

  const feed: FeedItem[] = [...matchPosts, ...activityPosts, ...userPostItems].sort((a, b) => {
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
    />
  )
}
