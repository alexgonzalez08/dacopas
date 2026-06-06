import { createClient } from '@/lib/supabase/client'

function generateCode(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

async function ensureProfile(userId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('profiles').upsert({
    id: userId,
    username: user.user_metadata?.username ?? user.email?.split('@')[0] ?? userId,
  }, { onConflict: 'id', ignoreDuplicates: true })
}

export async function createLeague(name: string, userId: string) {
  const supabase = createClient()
  await ensureProfile(userId)
  const code = generateCode()

  const { data: league, error } = await supabase
    .from('leagues')
    .insert({ name, code, created_by: userId })
    .select()
    .single()

  if (error) throw error

  await supabase.from('league_members').insert({ league_id: league.id, user_id: userId, role: 'admin' })

  return league
}

export async function joinLeague(code: string, userId: string) {
  await ensureProfile(userId)
  const supabase = createClient()

  const { data: league, error } = await supabase
    .from('leagues')
    .select()
    .eq('code', code.toUpperCase())
    .single()

  if (error || !league) throw new Error('Torneo no encontrado')

  const { error: memberError } = await supabase
    .from('league_members')
    .insert({ league_id: league.id, user_id: userId })

  if (memberError?.code === '23505') throw new Error('Ya estás en este torneo')
  if (memberError) throw memberError

  return league
}

export async function leaveLeague(leagueId: string, userId: string) {
  const supabase = createClient()
  const { error, count } = await supabase
    .from('league_members')
    .update({ left_at: new Date().toISOString() })
    .eq('league_id', leagueId)
    .eq('user_id', userId)
    .select('user_id')
  if (error) throw error
  if (!count && count !== null) throw new Error('No se pudo actualizar la membresía')
}

export async function getUserLeagues(userId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('league_members')
    .select('league_id, leagues(id, name, code, created_by, created_at)')
    .eq('user_id', userId)

  if (error) throw error
  return data?.map((m) => m.leagues) ?? []
}

export async function getLeagueLeaderboard(leagueId: string) {
  const supabase = createClient()

  const [{ data: members }, { data: points }] = await Promise.all([
    supabase
      .from('league_members')
      .select('user_id, profiles(username)')
      .eq('league_id', leagueId),
    supabase
      .from('league_points')
      .select('user_id, points, exact_results, correct_winner')
      .eq('league_id', leagueId),
  ])

  const pointsMap = new Map((points ?? []).map(p => [p.user_id, p]))

  const leaderboard = (members ?? []).map(m => ({
    user_id: m.user_id,
    profiles: m.profiles,
    league_id: leagueId,
    points: pointsMap.get(m.user_id)?.points ?? 0,
    exact_results: pointsMap.get(m.user_id)?.exact_results ?? 0,
    correct_winner: pointsMap.get(m.user_id)?.correct_winner ?? 0,
  }))

  leaderboard.sort((a, b) => b.points - a.points)

  return leaderboard.map((entry, i) => ({ ...entry, rank: i + 1 }))
}
