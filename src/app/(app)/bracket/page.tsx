export const revalidate = 60

import { createClient } from '@/lib/supabase/server'
import BracketClient from './bracket-client'
import { Prediction } from '@/types'

export default async function BracketPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: matches }, { data: predictions }] = await Promise.all([
    supabase
      .from('matches')
      .select('*')
      .in('stage', ['round_of_32', 'round_of_16', 'quarter', 'semi', 'third_place', 'final'])
      .order('bracket_position', { ascending: true, nullsFirst: false })
      .order('match_date', { ascending: true }),
    supabase
      .from('predictions')
      .select('*')
      .eq('user_id', user!.id),
  ])

  const predMap = new Map((predictions ?? []).map(p => [p.match_id, p as Prediction]))
  const matchesWithPreds = (matches ?? []).map(m => ({ ...m, prediction: predMap.get(m.id) ?? null }))

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-white text-center">Segunda Ronda Eliminatoria</h1>
      {/* Full-width breakout from max-w-3xl container */}
      <div className="px-2" style={{ width: '100vw', position: 'relative', left: '50%', transform: 'translateX(-50%)' }}>
        <BracketClient matches={matchesWithPreds} userId={user!.id} />
      </div>
    </div>
  )
}
