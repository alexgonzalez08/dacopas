import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sendPushToAllUsers } from '@/lib/push-server'

const FOOTBALL_API = 'https://api.football-data.org/v4'
// World Cup 2026 competition id (will be updated once available)
const COMPETITION_ID = 2000

async function runSync(request: Request) {
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
        tournament: m.competition?.name ?? null,
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
        tournament: m.competition?.name ?? null,
      })
    }
  }

  // Lock predictions 1h before kickoff
  await supabase.rpc('lock_predictions_before_match')

  const now = new Date()

  // Notificar 1 hora antes del partido
  const window1hStart = new Date(now.getTime() + 55 * 60 * 1000)
  const window1hEnd = new Date(now.getTime() + 65 * 60 * 1000)

  const { data: upcoming1h } = await supabase
    .from('matches')
    .select('id, home_team, away_team')
    .eq('status', 'scheduled')
    .eq('notified_1h', false)
    .gte('match_date', window1hStart.toISOString())
    .lte('match_date', window1hEnd.toISOString())

  const notified1h: number[] = []
  for (const match of upcoming1h ?? []) {
    const title = '⚽ ¡Partido en 1 hora!'
    const body = `${match.home_team} vs ${match.away_team} — ¡No olvides registrar tu pronóstico!`
    const url = `/matches/${match.id}`

    // Push a todos los usuarios
    await sendPushToAllUsers(supabase, {
      title,
      body,
      data: { url, image: 'https://www.dacopas.com/og-image.png', tag: `match-1h-${match.id}` },
    })

    // In-app notification a todos los usuarios
    const { data: allUsers } = await supabase.from('profiles').select('id')
    if (allUsers) {
      await supabase.from('notifications').insert(
        allUsers.map(u => ({
          user_id: u.id,
          type: 'match_starting_soon',
          metadata: { match_id: match.id, home_team: match.home_team, away_team: match.away_team, url },
        }))
      )
    }

    await supabase.from('matches').update({ notified_1h: true }).eq('id', match.id)
    notified1h.push(match.id)
  }

  // Notificar al inicio del partido (ventana de ±5 min alrededor del kickoff)
  const windowStartNow = new Date(now.getTime() - 5 * 60 * 1000)
  const windowEndNow = new Date(now.getTime() + 5 * 60 * 1000)

  const { data: startingMatches } = await supabase
    .from('matches')
    .select('id, home_team, away_team')
    .eq('status', 'scheduled')
    .eq('notified_start', false)
    .gte('match_date', windowStartNow.toISOString())
    .lte('match_date', windowEndNow.toISOString())

  const notifiedStart: number[] = []
  for (const match of startingMatches ?? []) {
    const title = '🟢 ¡El partido está comenzando!'
    const body = `${match.home_team} vs ${match.away_team} — ¡Seguilo en vivo!`
    const url = `/matches/${match.id}`

    await sendPushToAllUsers(supabase, {
      title,
      body,
      data: { url, image: 'https://www.dacopas.com/og-image.png', tag: `match-start-${match.id}` },
    })

    const { data: allUsers } = await supabase.from('profiles').select('id')
    if (allUsers) {
      await supabase.from('notifications').insert(
        allUsers.map(u => ({
          user_id: u.id,
          type: 'match_started',
          metadata: { match_id: match.id, home_team: match.home_team, away_team: match.away_team, url },
        }))
      )
    }

    await supabase.from('matches').update({ notified_start: true }).eq('id', match.id)
    notifiedStart.push(match.id)
  }

  return NextResponse.json({ synced: matches.length, pointsCalculated: updatedIds, notified1h, notifiedStart })
}

export async function GET(request: Request) {
  return runSync(request)
}

export async function POST(request: Request) {
  return runSync(request)
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
