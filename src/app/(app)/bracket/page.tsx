export const revalidate = 60

import { createClient } from '@/lib/supabase/server'
import BracketClient from './bracket-client'

export default async function BracketPage() {
  const supabase = await createClient()

  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .in('stage', ['round_of_32', 'round_of_16', 'quarter', 'semi', 'third_place', 'final'])
    .order('match_date', { ascending: true })

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-white">Llaves</h1>
      {/* Full-width breakout from max-w-3xl container */}
      <div className="px-2" style={{ width: '100vw', position: 'relative', left: '50%', transform: 'translateX(-50%)' }}>
        <BracketClient matches={matches ?? []} />
      </div>
    </div>
  )
}
