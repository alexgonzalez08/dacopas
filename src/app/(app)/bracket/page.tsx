export const revalidate = 60

import { createClient } from '@/lib/supabase/server'
import BracketClient from './bracket-client'
import { Prediction } from '@/types'
import { getActiveCompetition, getTeamsForCompetition, getFinalMatch } from '@/lib/champion-teams'

export default async function BracketPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: matches }, { data: predictions }, { data: bracketMatches }, { data: championPredictions }] = await Promise.all([
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
    supabase
      .from('matches')
      .select('id, home_team, away_team, home_team_flag, away_team_flag, match_date, stage, status, home_score, away_score, penalty_home, penalty_away, competition_name')
      .in('stage', ['group', 'round_of_32', 'round_of_16', 'quarter', 'semi', 'final']),
    supabase.from('champion_predictions').select('*').eq('user_id', user!.id),
  ])

  const predMap = new Map((predictions ?? []).map(p => [p.match_id, p as Prediction]))
  const matchesWithPreds = (matches ?? []).map(m => ({ ...m, prediction: predMap.get(m.id) ?? null }))

  const activeCompetition = getActiveCompetition(bracketMatches ?? [])
  const championPredMap = new Map((championPredictions ?? []).map(cp => [cp.competition_name, cp]))

  return (
    <div className="px-2" style={{ width: '100vw', position: 'relative', left: '50%', transform: 'translateX(-50%)' }}>
      <BracketClient
        matches={matchesWithPreds}
        userId={user!.id}
        championPredictionProps={activeCompetition ? {
          competitionName: activeCompetition,
          teams: getTeamsForCompetition(bracketMatches ?? [], activeCompetition),
          finalMatch: getFinalMatch(bracketMatches ?? [], activeCompetition),
          prediction: championPredMap.get(activeCompetition) ?? null,
        } : null}
      />
    </div>
  )
}
