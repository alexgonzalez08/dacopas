import { createClient } from '@/lib/supabase/client'

export async function upsertChampionPrediction(
  userId: string,
  competitionName: string,
  championTeam: string,
  finalistTeam: string,
  championScore: number,
  runnerUpScore: number,
  penaltyWinner: 'champion' | 'runner_up' | null = null,
  retries = 3
) {
  const supabase = createClient()

  for (let attempt = 0; attempt < retries; attempt++) {
    const { data, error } = await supabase
      .from('champion_predictions')
      .upsert(
        {
          user_id: userId,
          competition_name: competitionName,
          champion_team: championTeam,
          finalist_team: finalistTeam,
          champion_score: championScore,
          runner_up_score: runnerUpScore,
          penalty_winner: penaltyWinner,
          status: 'draft',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,competition_name' }
      )
      .select()
      .single()

    if (error) {
      const isLast = attempt === retries - 1
      if (isLast) throw error
      await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)))
      continue
    }

    const { data: verify } = await supabase
      .from('champion_predictions')
      .select('champion_team, finalist_team, champion_score, runner_up_score')
      .eq('user_id', userId)
      .eq('competition_name', competitionName)
      .single()

    const persisted = verify?.champion_team === championTeam &&
      verify?.finalist_team === finalistTeam &&
      verify?.champion_score === championScore &&
      verify?.runner_up_score === runnerUpScore

    if (persisted) return data

    const isLast = attempt === retries - 1
    if (isLast) throw new Error('La predicción no se guardó correctamente. Intentá de nuevo.')
    await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)))
  }
}

// Variante simplificada para competencias round_robin: solo se elige el equipo campeón
// (no hay finalista, marcador ni penales — no hay "final" en una liga de todos contra todos)
export async function upsertChampionOnly(
  userId: string,
  competitionName: string,
  championTeam: string,
  retries = 3
) {
  const supabase = createClient()

  for (let attempt = 0; attempt < retries; attempt++) {
    const { data, error } = await supabase
      .from('champion_predictions')
      .upsert(
        {
          user_id: userId,
          competition_name: competitionName,
          champion_team: championTeam,
          finalist_team: null,
          champion_score: null,
          runner_up_score: null,
          penalty_winner: null,
          status: 'draft',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,competition_name' }
      )
      .select()
      .single()

    if (!error) return data

    const isLast = attempt === retries - 1
    if (isLast) throw error
    await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)))
  }
}
