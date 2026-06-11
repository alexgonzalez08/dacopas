import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sendPushToAllUsers, sendPushToUsers } from '@/lib/push-server'

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

  const updatedIds: number[] = []

  if (!res.ok) {
    console.warn(`Football API error ${res.status} — skipping score sync, continuing with notifications`)
  } else {

  const { matches } = await res.json()

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
        // Notificar resultado final (push + in-app) — solo una vez
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
            title,
            body,
            data: { url, image: 'https://www.dacopas.com/og-image.png', tag: `match-finished-${existing.id}` },
          })

          const { data: profiles } = await supabase.from('profiles').select('id')
          if (profiles?.length) {
            await supabase.from('notifications').insert(
              profiles.map(p => ({
                user_id: p.id,
                type: 'match_finished',
                metadata: {
                  match_id: existing.id,
                  home_team: matchInfo.home_team,
                  away_team: matchInfo.away_team,
                  home_score: homeScore,
                  away_score: awayScore,
                  url,
                },
              }))
            )
          }

          await supabase.from('matches').update({ notified_finished: true }).eq('id', existing.id)
        }
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
  } // end if res.ok

  // Lock predictions 1h before kickoff
  await supabase.rpc('lock_predictions_before_match')

  const now = new Date()

  // Notificar 1 hora antes del partido
  const window1hStart = new Date(now.getTime() + 55 * 60 * 1000)
  const window1hEnd = new Date(now.getTime() + 65 * 60 * 1000)

  const { data: upcoming1h } = await supabase
    .from('matches')
    .select('id, home_team, away_team, external_id')
    .eq('status', 'scheduled')
    .eq('notified_1h', false)
    .gte('match_date', window1hStart.toISOString())
    .lte('match_date', window1hEnd.toISOString())

  const notified1h: number[] = []
  for (const match of upcoming1h ?? []) {
    const title = '⚽ ¡Partido en 1 hora!'
    const body = `${match.home_team} vs ${match.away_team} — ¡No olvides registrar tu pronóstico!`
    const url = `/matches/${match.id}`

    // Fetch alineaciones y guardar en DB
    if (match.external_id) {
      try {
        const lineupsRes = await fetch(
          `https://api.football-data.org/v4/matches/${match.external_id}`,
          { headers: { 'X-Auth-Token': process.env.FOOTBALL_API_KEY! } }
        )
        if (lineupsRes.ok) {
          const lineupsData = await lineupsRes.json()
          if (lineupsData.lineups?.length > 0) {
            await supabase.from('matches').update({ lineups: lineupsData.lineups }).eq('id', match.id)
          }
        }
      } catch {}
    }

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

  // Notificar 15 minutos antes — solo a usuarios que enviaron pronóstico
  const window15Start = new Date(now.getTime() + 10 * 60 * 1000)
  const window15End = new Date(now.getTime() + 20 * 60 * 1000)

  const { data: matches15 } = await supabase
    .from('matches')
    .select('id, home_team, away_team')
    .eq('status', 'scheduled')
    .eq('notified_15min', false)
    .gte('match_date', window15Start.toISOString())
    .lte('match_date', window15End.toISOString())

  const notified15min: number[] = []
  for (const match of matches15 ?? []) {
    const url = `/predictions`

    // Solo usuarios que tienen pronóstico enviado para este partido
    const { data: preds } = await supabase
      .from('predictions')
      .select('user_id')
      .eq('match_id', match.id)
      .eq('status', 'locked')

    const userIds = (preds ?? []).map(p => p.user_id)

    if (userIds.length > 0) {
      const title = '✅ ¡Pronóstico enviado!'
      const body = `Tu pronóstico para ${match.home_team} vs ${match.away_team} fue registrado. ¡Mucha Suerte!`

      await sendPushToUsers({ userIds, title, body, data: { url, image: 'https://www.dacopas.com/og-image.png', tag: `match-pred-${match.id}` } })

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

  // Notificar partidos finalizados que aún no se notificaron (independiente de la API externa)
  const { data: finishedMatches } = await supabase
    .from('matches')
    .select('id, home_team, away_team, home_score, away_score')
    .eq('status', 'finished')
    .eq('notified_finished', false)
    .not('home_score', 'is', null)

  const notifiedFinished: number[] = []
  for (const match of finishedMatches ?? []) {
    await supabase.rpc('calculate_match_points', { p_match_id: match.id })
    updatedIds.push(match.id)

    const title = '🏁 Resultado final'
    const body = `${match.home_team} ${match.home_score} - ${match.away_score} ${match.away_team}`
    const url = `/matches/${match.id}`

    await sendPushToAllUsers(supabase, {
      title, body,
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
