import { SupabaseClient } from '@supabase/supabase-js'

export async function getSuggestedFriends(supabase: SupabaseClient, userId: string) {
  // 1. Mis torneos
  const { data: memberships } = await supabase
    .from('league_members')
    .select('league_id, leagues(name)')
    .eq('user_id', userId)
    .is('left_at', null)

  if (!memberships?.length) return []

  const leagueIds = memberships.map(m => m.league_id)
  const leagueNameMap = new Map(
    memberships.map(m => [m.league_id, (m.leagues as any)?.name ?? ''])
  )

  // 2. Mis amigos actuales + solicitudes pendientes (no sugerir)
  const { data: existingFriendships } = await supabase
    .from('friendships')
    .select('requester_id, addressee_id')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)

  const excludedIds = new Set<string>([userId])
  for (const f of existingFriendships ?? []) {
    excludedIds.add(f.requester_id)
    excludedIds.add(f.addressee_id)
  }

  // 3. Compañeros de torneo que no son amigos
  const { data: coMembers } = await supabase
    .from('league_members')
    .select('user_id, league_id, profiles(id, username, full_name, avatar_url)')
    .in('league_id', leagueIds)
    .is('left_at', null)
    .neq('user_id', userId)

  // Agrupar por user_id con sus torneos en común
  const map = new Map<string, { profile: any; leagues: string[] }>()
  for (const m of coMembers ?? []) {
    const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
    if (!profile || excludedIds.has(profile.id)) continue
    if (!map.has(profile.id)) {
      map.set(profile.id, { profile, leagues: [] })
    }
    const leagueName = leagueNameMap.get(m.league_id)
    if (leagueName) map.get(profile.id)!.leagues.push(leagueName)
  }

  return Array.from(map.values())
    .map(({ profile, leagues }) => ({
      id: profile.id,
      username: profile.username,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      shared_leagues: [...new Set(leagues)],
    }))
    .slice(0, 15)
}
