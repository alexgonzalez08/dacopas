export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import PredictionsClient from './predictions-client'

export default async function PredictionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Solo mostrar partidos de competencias donde el usuario tiene al menos un torneo activo
  const { data: memberships } = await supabase
    .from('league_members')
    .select('leagues(competition_id, champion_prediction_enabled)')
    .eq('user_id', user!.id)
    .is('left_at', null)
  const competitionIds = [...new Set((memberships ?? [])
    .map(m => (m.leagues as any)?.competition_id)
    .filter((id): id is number => id != null))]

  // La tarjeta de predicción de campeón de una competencia solo se muestra si al menos
  // uno de los torneos del usuario en esa competencia la tiene habilitada
  const championEnabledCompetitionIds = [...new Set((memberships ?? [])
    .filter(m => (m.leagues as any)?.champion_prediction_enabled)
    .map(m => (m.leagues as any)?.competition_id)
    .filter((id): id is number => id != null))]

  const [{ data: matches }, { data: predictions }, { data: profile }, { data: championPredictions }] = await Promise.all([
    competitionIds.length > 0
      ? supabase.from('matches').select('*').in('competition_id', competitionIds).order('match_date', { ascending: true })
      : Promise.resolve({ data: [] }),
    supabase.from('predictions').select('*').eq('user_id', user!.id),
    supabase.from('profiles').select('predictions_info_seen').eq('id', user!.id).single(),
    supabase.from('champion_predictions').select('*').eq('user_id', user!.id),
  ])

  const predMap = new Map((predictions ?? []).map(p => [p.match_id, p]))
  const matchesWithPreds = (matches ?? []).map(m => ({ ...m, prediction: predMap.get(m.id) ?? null }))

  return (
    <PredictionsClient
      userId={user!.id}
      matches={matchesWithPreds}
      predictionsInfoSeen={profile?.predictions_info_seen ?? false}
      championPredictions={championPredictions ?? []}
      hasCompetitions={competitionIds.length > 0}
      championEnabledCompetitionIds={championEnabledCompetitionIds}
    />
  )
}
