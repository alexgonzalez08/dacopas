import { createClient } from '@/lib/supabase/client'
import { Match } from '@/types'

export function isPredictionLocked(match: Match): boolean {
  const kickoff = new Date(match.match_date)
  const lockTime = new Date(kickoff.getTime() - 15 * 60 * 1000)
  return new Date() >= lockTime || match.status !== 'scheduled'
}

export async function upsertPrediction(
  userId: string,
  matchId: number,
  homeScore: number,
  awayScore: number,
  penaltyWinner: 'home' | 'away' | null = null
) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('predictions')
    .upsert(
      { user_id: userId, match_id: matchId, home_score: homeScore, away_score: awayScore, penalty_winner: penaltyWinner, status: 'draft', updated_at: new Date().toISOString() },
      { onConflict: 'user_id,match_id' }
    )
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getUserPredictions(userId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('predictions')
    .select('*')
    .eq('user_id', userId)

  if (error) throw error
  return data ?? []
}

export async function getMatchesWithPredictions(userId: string) {
  const supabase = createClient()
  const [{ data: matches }, { data: predictions }] = await Promise.all([
    supabase.from('matches').select('*').order('match_date', { ascending: true }),
    supabase.from('predictions').select('*').eq('user_id', userId),
  ])

  const predMap = new Map((predictions ?? []).map((p) => [p.match_id, p]))
  return (matches ?? []).map((m) => ({ ...m, prediction: predMap.get(m.id) ?? null }))
}
