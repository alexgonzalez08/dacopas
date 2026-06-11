import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sendPushToAllUsers, sendPushToUsers } from '@/lib/push-server'

const API_FOOTBALL = 'https://v3.football.api-sports.io'
const LEAGUE_ID = 1      // FIFA World Cup
const SEASON = 2026

async function runSync(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Solo correr entre 8:00 AM y 1:00 AM hora Costa Rica (UTC-6)
  const nowCR = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Costa_Rica' }))
  const hour = nowCR.getHours()
  if (hour >= 1 && hour < 8) {
    return NextResponse.json({ skipped: true, reason: 'outside active hours (8AM-1AM CR)' })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const updatedIds: string[] = []

  // Fetch partidos de API-Football
  let fixtures: any[] = []
  try {
    const res = await fetch(`${API_FOOTBALL}/fixtures?league=${LEAGUE_ID}&season=${SEASON}`, {
      headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY! },
    })
    if (res.ok) {
      const json = await res.json()
      fixtures = json.response ?? []
    } else {
      console.warn(`API-Football error ${res.status}`)
    }
  } catch (err) {
    console.warn('API-Football fetch failed (network error)', err)
  }

  for (const f of fixtures) {
    const externalId = String(f.fixture.id)
    const matchDate = f.fixture.date
    const status = mapStatus(f.fixture.status.short)
    const homeScore = f.goals.home ?? null
    const awayScore = f.goals.away ?? null
    const stage = mapStage(f.league.round ?? '')

    const { data: existing } = await supabase
      .from('matches')
      .select('id, home_score, away_score')
      .eq('external_id', externalId)
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
        const { data: matchInfo } = await supabase
          .from('matches')
          .select('id, home_team, away_team, notified_finished')
          .eq('id', existing.id)
          .single()

        if (matchInfo && !matchInfo.notified_finished) {
          await supabase.rpc('calculate_match_points', { p_match_id: existing.id })
          updatedIds.push(existing.id)

          const title = '🏁 Resultado final'
          const body = `${matchInfo.home_team} ${homeScore} - ${awayScore} ${matchInfo.away_team}`
          const url = `/matches/${existing.id}`

          await sendPushToAllUsers(supabase, {
            title, body,
            data: { url, image: 'https://www.dacopas.com/og-image.png', tag: `match-finished-${existing.id}` },
          })

          const { data: profiles } = await supabase.from('profiles').select('id')
          if (profiles?.length) {
            await supabase.from('notifications').insert(
              profiles.map(p => ({
                user_id: p.id,
                type: 'match_finished',
                metadata: { match_id: existing.id, home_team: matchInfo.home_team, away_team: matchInfo.away_team, home_score: homeScore, away_score: awayScore, url },
              }))
            )
          }

          await supabase.from('matches').update({ notified_finished: true }).eq('id', existing.id)
        }
      }
    } else {
      await supabase.from('matches').insert({
        external_id: externalId,
        home_team: f.teams.home.name,
        away_team: f.teams.away.name,
        home_team_flag: f.teams.home.logo ?? null,
        away_team_flag: f.teams.away.logo ?? null,
        match_date: matchDate,
        stage,
        group_name: parseGroup(f.league.round ?? ''),
        status,
        home_score: homeScore,
        away_score: awayScore,
        tournament: f.league.name ?? null,
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

  const notified1h: string[] = []
  for (const match of upcoming1h ?? []) {
    const url = `/matches/${match.id}`
    await sendPushToAllUsers(supabase, {
      title: '⚽ ¡Partido en 1 hora!',
      body: `${match.home_team} vs ${match.away_team} — ¡No olvides registrar tu pronóstico!`,
      data: { url, image: 'https://www.dacopas.com/og-image.png', tag: `match-1h-${match.id}` },
    })
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

  // Notificar al inicio del partido (ventana de ±5 min)
  const windowStartNow = new Date(now.getTime() - 5 * 60 * 1000)
  const windowEndNow = new Date(now.getTime() + 5 * 60 * 1000)

  const { data: startingMatches } = await supabase
    .from('matches')
    .select('id, home_team, away_team')
    .eq('status', 'scheduled')
    .eq('notified_start', false)
    .gte('match_date', windowStartNow.toISOString())
    .lte('match_date', windowEndNow.toISOString())

  const notifiedStart: string[] = []
  for (const match of startingMatches ?? []) {
    const url = `/matches/${match.id}`
    await sendPushToAllUsers(supabase, {
      title: '🟢 ¡El partido está comenzando!',
      body: `${match.home_team} vs ${match.away_team} — ¡Seguilo en vivo!`,
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

  // Notificar 15 minutos antes — solo usuarios con pronóstico locked
  const window15Start = new Date(now.getTime() + 10 * 60 * 1000)
  const window15End = new Date(now.getTime() + 20 * 60 * 1000)

  const { data: matches15 } = await supabase
    .from('matches')
    .select('id, home_team, away_team')
    .eq('status', 'scheduled')
    .eq('notified_15min', false)
    .gte('match_date', window15Start.toISOString())
    .lte('match_date', window15End.toISOString())

  const notified15min: string[] = []
  for (const match of matches15 ?? []) {
    const { data: preds } = await supabase
      .from('predictions')
      .select('user_id')
      .eq('match_id', match.id)
      .eq('status', 'locked')

    const userIds = (preds ?? []).map(p => p.user_id)
    if (userIds.length > 0) {
      const url = '/predictions'
      await sendPushToUsers({ userIds, title: '✅ ¡Pronóstico enviado!', body: `Tu pronóstico para ${match.home_team} vs ${match.away_team} fue registrado. ¡Mucha Suerte!`, data: { url, image: 'https://www.dacopas.com/og-image.png', tag: `match-pred-${match.id}` } })
      await supabase.from('notifications').insert(
        userIds.map(uid => ({
          user_id: uid,
          type: 'prediction_locked',
          metadata: { match_id: match.id, home_team: match.home_team, away_team: match.away_team, url },
        }))
      )
    }
    await supabase.from('matches').update({ notified_15min: true }).eq('id', match.id)
    notified15min.push(match.id)
  }

  // Partidos finalizados sin notificar (fallback independiente de la API)
  const { data: finishedMatches } = await supabase
    .from('matches')
    .select('id, home_team, away_team, home_score, away_score')
    .eq('status', 'finished')
    .eq('notified_finished', false)
    .not('home_score', 'is', null)

  const notifiedFinished: string[] = []
  for (const match of finishedMatches ?? []) {
    await supabase.rpc('calculate_match_points', { p_match_id: match.id })
    updatedIds.push(match.id)

    const url = `/matches/${match.id}`
    await sendPushToAllUsers(supabase, {
      title: '🏁 Resultado final',
      body: `${match.home_team} ${match.home_score} - ${match.away_score} ${match.away_team}`,
      data: { url, image: 'https://www.dacopas.com/og-image.png', tag: `match-finished-${match.id}` },
    })

    const { data: profiles } = await supabase.from('profiles').select('id')
    if (profiles?.length) {
      await supabase.from('notifications').insert(
        profiles.map(p => ({
          user_id: p.id,
          type: 'match_finished',
          metadata: { match_id: match.id, home_team: match.home_team, away_team: match.away_team, home_score: match.home_score, away_score: match.away_score, url },
        }))
      )
    }
    await supabase.from('matches').update({ notified_finished: true }).eq('id', match.id)
    notifiedFinished.push(match.id)
  }

  return NextResponse.json({ pointsCalculated: updatedIds, notified1h, notifiedStart, notified15min, notifiedFinished })
}

export async function GET(request: Request) {
  return runSync(request)
}

export async function POST(request: Request) {
  return runSync(request)
}

function mapStage(round: string): string {
  if (round.includes('Group')) return 'group'
  if (round.includes('32')) return 'round_of_32'
  if (round.includes('16')) return 'round_of_16'
  if (round.includes('Quarter')) return 'quarter'
  if (round.includes('Semi')) return 'semi'
  if (round.includes('3rd')) return 'third_place'
  if (round.includes('Final')) return 'final'
  return 'group'
}

function mapStatus(short: string): string {
  if (['FT', 'AET', 'PEN', 'AWD', 'WO'].includes(short)) return 'finished'
  if (['1H', 'HT', '2H', 'ET', 'P', 'BT', 'LIVE'].includes(short)) return 'live'
  return 'scheduled'
}

function parseGroup(round: string): string | null {
  const match = round.match(/Group\s+([A-Z])/i)
  return match ? match[1].toUpperCase() : null
}
