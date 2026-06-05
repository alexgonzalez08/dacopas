import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const FOOTBALL_API = 'https://api.football-data.org/v4'
// World Cup 2026 competition id (will be updated once available)
const COMPETITION_ID = 2000

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const res = await fetch(`${FOOTBALL_API}/competitions/${COMPETITION_ID}/matches`, {
    headers: { 'X-Auth-Token': process.env.FOOTBALL_API_KEY! },
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Football API error', status: res.status }, { status: 502 })
  }

  const { matches } = await res.json()
  const updatedIds: number[] = []

  for (const m of matches) {
    const matchDate = m.utcDate
    const stage = mapStage(m.stage)
    const status = mapStatus(m.status)
    const homeScore = m.score?.fullTime?.home ?? null
    const awayScore = m.score?.fullTime?.away ?? null

    const { data: existing } = await supabase
      .from('matches')
      .select('id, home_score, away_score')
      .eq('external_id', String(m.id))
      .single()

    if (existing) {
      const resultChanged = existing.home_score !== homeScore || existing.away_score !== awayScore
      await supabase.from('matches').update({
        status,
        home_score: homeScore,
        away_score: awayScore,
        updated_at: new Date().toISOString(),
      }).eq('id', existing.id)

      if (resultChanged && status === 'finished' && homeScore !== null) {
        await supabase.rpc('calculate_match_points', { p_match_id: existing.id })
        updatedIds.push(existing.id)
      }
    } else {
      await supabase.from('matches').insert({
        external_id: String(m.id),
        home_team: m.homeTeam.name,
        away_team: m.awayTeam.name,
        home_team_flag: m.homeTeam.crest ?? null,
        away_team_flag: m.awayTeam.crest ?? null,
        match_date: matchDate,
        stage,
        group_name: m.group ? m.group.replace('GROUP_', '') : null,
        status,
        home_score: homeScore,
        away_score: awayScore,
      })
    }
  }

  // Lock predictions 1h before kickoff
  await supabase.rpc('lock_predictions_before_match')

  return NextResponse.json({ synced: matches.length, pointsCalculated: updatedIds })
}

function mapStage(stage: string): string {
  const map: Record<string, string> = {
    'GROUP_STAGE': 'group',
    'LAST_32': 'round_of_32',
    'LAST_16': 'round_of_16',
    'QUARTER_FINALS': 'quarter',
    'SEMI_FINALS': 'semi',
    'THIRD_PLACE': 'third_place',
    'FINAL': 'final',
  }
  return map[stage] ?? 'group'
}

function mapStatus(status: string): string {
  if (status === 'FINISHED' || status === 'AWARDED') return 'finished'
  if (status === 'IN_PLAY' || status === 'PAUSED') return 'live'
  return 'scheduled'
}
