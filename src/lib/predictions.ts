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
  penaltyWinner: 'home' | 'away' | null = null,
  retries = 3
) {
  const supabase = createClient()

  for (let attempt = 0; attempt < retries; attempt++) {
    const { data, error } = await supabase
      .from('predictions')
      .upsert(
        { user_id: userId, match_id: matchId, home_score: homeScore, away_score: awayScore, penalty_winner: penaltyWinner, status: 'draft', updated_at: new Date().toISOString() },
        { onConflict: 'user_id,match_id' }
      )
      .select()
      .single()

    if (error) {
      const isLast = attempt === retries - 1
      if (isLast) throw error
      await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)))
      continue
    }

    // Verificar que la escritura realmente persistió
    const { data: verify } = await supabase
      .from('predictions')
      .select('home_score, away_score')
      .eq('user_id', userId)
      .eq('match_id', matchId)
      .single()

    const persisted = verify?.home_score === homeScore && verify?.away_score === awayScore
    if (persisted) return data

    // Si no persistió, reintentar
    const isLast = attempt === retries - 1
    if (isLast) throw new Error('La predicción no se guardó correctamente. Intentá de nuevo.')
    await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)))
  }
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
