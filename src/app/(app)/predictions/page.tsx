import { createClient } from '@/lib/supabase/server'
import PredictionsClient from './predictions-client'

export default async function PredictionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: matches }, { data: predictions }, { data: profile }] = await Promise.all([
    supabase.from('matches').select('*').order('match_date', { ascending: true }),
    supabase.from('predictions').select('*').eq('user_id', user!.id),
    supabase.from('profiles').select('predictions_info_seen').eq('id', user!.id).single(),
  ])

  const predMap = new Map((predictions ?? []).map(p => [p.match_id, p]))
  const matchesWithPreds = (matches ?? []).map(m => ({ ...m, prediction: predMap.get(m.id) ?? null }))

  return (
    <PredictionsClient
      userId={user!.id}
      matches={matchesWithPreds}
      predictionsInfoSeen={profile?.predictions_info_seen ?? false}
    />
  )
}
