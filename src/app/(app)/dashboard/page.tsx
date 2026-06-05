import { createClient } from '@/lib/supabase/server'
import Feed, { FeedItem } from '@/components/feed'
import { isPredictionLocked } from '@/lib/predictions'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Ligas del usuario
  const { data: memberships } = await supabase
    .from('league_members')
    .select('league_id')
    .eq('user_id', user!.id)

  const leagueIds = (memberships ?? []).map(m => m.league_id)

  // Amigos en ligas compartidas
  let friendIds: string[] = []
  if (leagueIds.length > 0) {
    const { data: members } = await supabase
      .from('league_members')
      .select('user_id')
      .in('league_id', leagueIds)
    friendIds = [...new Set((members ?? []).map(m => m.user_id))]
  }

  const FEED_SELECT = '*, profiles(username), matches(id, home_team, away_team, home_team_flag, away_team_flag, home_score, away_score, match_date), leagues(name), feed_reactions(id, emoji, user_id, profiles(username)), feed_comments(id, content, user_id, created_at, profiles(username))'

  const [{ data: allUpcoming }, { data: predictions }, { data: friendEvents }, { data: resultEvents }] = await Promise.all([
    supabase
      .from('matches')
      .select('*')
      .in('status', ['scheduled', 'live'])
      .gte('match_date', new Date().toISOString())
      .order('match_date', { ascending: true })
      .limit(50),
    supabase
      .from('predictions')
      .select('*')
      .eq('user_id', user!.id),
    // Eventos de amigos (predicciones y uniones a ligas)
    friendIds.length > 0
      ? supabase
          .from('feed_events')
          .select(FEED_SELECT)
          .in('user_id', friendIds)
          .order('created_at', { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] }),
    // Resultados de partidos (globales)
    supabase
      .from('feed_events')
      .select(FEED_SELECT)
      .eq('type', 'result')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  // Combinar y deduplicar por id
  const seen = new Set<string>()
  const feedEvents = [...(friendEvents ?? []), ...(resultEvents ?? [])].filter(e => {
    if (seen.has(e.id)) return false
    seen.add(e.id)
    return true
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const predMap = new Map((predictions ?? []).map(p => [p.match_id, p]))

  // Lógica: mostrar partidos de hoy no finalizados;
  // si no hay ninguno hoy, mostrar los del día más próximo
  const available = (allUpcoming ?? []).filter(m => !isPredictionLocked(m))

  const todayStr = new Date().toISOString().slice(0, 10)
  const todayMatches = available.filter(m => m.match_date.slice(0, 10) === todayStr)

  let displayMatches = todayMatches.length > 0
    ? todayMatches
    : available.length > 0
      ? (() => {
          const nextDay = available[0].match_date.slice(0, 10)
          return available.filter(m => m.match_date.slice(0, 10) === nextDay)
        })()
      : []

  // Posts de partidos próximos (no bloqueados)
  const matchPosts: FeedItem[] = displayMatches
    .map(m => ({
      kind: 'match' as const,
      ...m,
      prediction: predMap.get(m.id) ?? null,
      sortDate: new Date(m.match_date),
    }))

  // Posts de actividad
  const activityPosts: FeedItem[] = feedEvents.map((e: any) => ({
    kind: 'activity' as const,
    ...e,
    sortDate: new Date(e.created_at),
  }))

  // Mezclar y ordenar: partidos por fecha de partido, actividad por fecha de evento
  const feed: FeedItem[] = [...matchPosts, ...activityPosts].sort((a, b) => {
    // Partidos próximos siempre primero (por urgencia = fecha más cercana)
    if (a.kind === 'match' && b.kind === 'match') return a.sortDate.getTime() - b.sortDate.getTime()
    if (a.kind === 'match') return -1
    if (b.kind === 'match') return 1
    // Actividad más reciente primero
    return b.sortDate.getTime() - a.sortDate.getTime()
  })

  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-lg">Actividad reciente</h2>
      <Feed items={feed} userId={user!.id} />
    </div>
  )
}
