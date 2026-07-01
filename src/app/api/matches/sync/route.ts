import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sendPushToAllUsers, sendPushToUsers } from '@/lib/push-server'

export const maxDuration = 60

const API_FOOTBALL = 'https://v3.football.api-sports.io'
const LEAGUE_ID = 1      // FIFA World Cup
const SEASON = 2026

const BROADCAST_TYPES = new Set(['goal_scored', 'goal_cancelled', 'match_finished', 'match_starting_soon', 'match_started'])

async function runSync(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Solo correr entre 8:00 AM y 12:00 AM hora Costa Rica (UTC-6)
  // Último partido empieza 7PM, con atrasos/tiempo extra/penales termina ~11:30PM máximo
  const nowCR = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Costa_Rica' }))
  const hour = nowCR.getHours()
  if (hour < 8) {
    return NextResponse.json({ skipped: true, reason: 'outside active hours (8AM-12AM CR)' })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const updatedIds: string[] = []

  // Consultar Supabase primero (gratis) para saber qué partidos necesitan update
  const syncNow = new Date()
  const windowStart = new Date(syncNow.getTime() - 3 * 60 * 60 * 1000)  // hace 3h (por si sigue en juego)
  const windowEnd   = new Date(syncNow.getTime() + 2 * 60 * 60 * 1000)  // próximas 2h

  const { data: relevantMatches } = await supabase
    .from('matches')
    .select('id, external_id, home_score, away_score, notified_finished, status')
    .or(`status.eq.live,and(status.eq.scheduled,match_date.gte.${windowStart.toISOString()},match_date.lte.${windowEnd.toISOString()})`)
    .not('external_id', 'is', null)

  // Si no hay partidos live ni próximos, saltamos la llamada a API-Football
  let fixtures: any[] = []
  if (relevantMatches && relevantMatches.length > 0) {
    const ids = relevantMatches.map(m => m.external_id).join('-')
    try {
      const res = await fetch(`${API_FOOTBALL}/fixtures?ids=${ids}`, {
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
  }

  // Batch-fetch todos los matches existentes de una sola vez
  const externalIds = fixtures.map(f => String(f.fixture.id))
  const { data: existingMatches } = externalIds.length > 0
    ? await supabase
        .from('matches')
        .select('id, external_id, home_score, away_score, notified_finished')
        .in('external_id', externalIds)
    : { data: [] }

  const existingMap = new Map((existingMatches ?? []).map(m => [m.external_id, m]))

  for (const f of fixtures) {
    const externalId = String(f.fixture.id)
    const matchDate = f.fixture.date
    const status = mapStatus(f.fixture.status.short)
    const homeScore = f.goals.home ?? null
    const awayScore = f.goals.away ?? null
    const penaltyHome = f.score?.penalty?.home ?? null
    const penaltyAway = f.score?.penalty?.away ?? null
    const stage = mapStage(f.league.round ?? '')

    const existing = existingMap.get(externalId)

    if (existing) {
      const resultChanged = existing.home_score !== homeScore || existing.away_score !== awayScore
      await supabase.from('matches').update({
        status,
        home_score: homeScore,
        away_score: awayScore,
        penalty_home: penaltyHome,
        penalty_away: penaltyAway,
        updated_at: new Date().toISOString(),
      }).eq('id', existing.id)

      const prevTotal = (existing.home_score ?? 0) + (existing.away_score ?? 0)
      const newTotal = (homeScore ?? 0) + (awayScore ?? 0)
      const scoreChanged = resultChanged && status === 'live' && homeScore !== null && awayScore !== null && newTotal !== prevTotal

      if (scoreChanged) {
        const { data: matchInfo } = await supabase
          .from('matches')
          .select('id, home_team, away_team')
          .eq('id', existing.id)
          .single()

        if (matchInfo) {
          const isCorrection = newTotal < prevTotal
          const url = `/matches/${existing.id}`
          const title = isCorrection ? '🚫 Gol anulado' : '⚽ ¡Gooool!'
          const body = `${matchInfo.home_team} ${homeScore} - ${awayScore} ${matchInfo.away_team}`
          const notifType = isCorrection ? 'goal_cancelled' : 'goal_scored'

          await sendPushToAllUsers(supabase, {
            title, body,
            data: { url, image: 'https://www.dacopas.com/og-image.png', tag: `match-score-${existing.id}-${homeScore}-${awayScore}` },
          })

          await supabase.from('notifications').insert({
            user_id: null,
            is_global: true,
            type: notifType,
            metadata: { match_id: existing.id, home_team: matchInfo.home_team, away_team: matchInfo.away_team, home_score: homeScore, away_score: awayScore, url },
          })
        }
      }

      if (resultChanged && status === 'finished' && homeScore !== null && !existing.notified_finished) {
        const { data: matchInfo } = await supabase
          .from('matches')
          .select('id, home_team, away_team')
          .eq('id', existing.id)
          .single()

        if (matchInfo) {
          await supabase.rpc('calculate_match_points', { p_match_id: existing.id })
          updatedIds.push(existing.id)

          const url = `/matches/${existing.id}`
          await sendPushToAllUsers(supabase, {
            title: '🏁 Resultado final',
            body: `${matchInfo.home_team} ${homeScore} - ${awayScore} ${matchInfo.away_team}`,
            data: { url, image: 'https://www.dacopas.com/og-image.png', tag: `match-finished-${existing.id}` },
          })

          await supabase.from('notifications').insert({
            user_id: null,
            is_global: true,
            type: 'match_finished',
            metadata: { match_id: existing.id, home_team: matchInfo.home_team, away_team: matchInfo.away_team, home_score: homeScore, away_score: awayScore, url },
          })

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
        penalty_home: penaltyHome,
        penalty_away: penaltyAway,
        tournament: f.league.name ?? null,
        competition_id: LEAGUE_ID,
        competition_name: f.league.name ?? 'FIFA World Cup',
      })
    }
  }

  // Descubrir e insertar fixtures nuevos de rounds knockout que aún no están en la DB
  const KNOCKOUT_ROUNDS = ['Round of 16', 'Quarter-finals', 'Semi-finals', '3rd Place Final', 'Final']
  const PREV_STAGE: Record<string, string> = {
    'round_of_16': 'round_of_32',
    'quarter': 'round_of_16',
    'semi': 'quarter',
    'final': 'semi',
    'third_place': 'semi',
  }
  let newFixturesInserted = 0

  const { data: existingExternalIds } = await supabase
    .from('matches')
    .select('external_id')
    .not('external_id', 'is', null)
  const existingExternalSet = new Set((existingExternalIds ?? []).map(m => String(m.external_id)))

  // Cargar todas las posiciones del bracket actuales para calcular la posición de nuevos fixtures
  const { data: allKnockoutMatches } = await supabase
    .from('matches')
    .select('stage, home_team, away_team, bracket_position, home_score, away_score, penalty_home, penalty_away, status')
    .in('stage', ['round_of_32', 'round_of_16', 'quarter', 'semi', 'third_place', 'final'])

  // Mapa: stage → team_name → bracket_position (solo partidos finalizados)
  function buildWinnerPositionMap(stage: string): Map<string, number> {
    const map = new Map<string, number>()
    for (const m of allKnockoutMatches ?? []) {
      if (m.stage !== stage || m.bracket_position == null) continue
      const homeScore = m.home_score ?? 0
      const awayScore = m.away_score ?? 0
      const homeWins = homeScore > awayScore ||
        (homeScore === awayScore && (m.penalty_home ?? 0) > (m.penalty_away ?? 0))
      const winner = homeWins ? m.home_team : m.away_team
      const loser = homeWins ? m.away_team : m.home_team
      map.set(winner.toLowerCase(), m.bracket_position)
      // Para tercero y cuarto puesto, los perdedores también son relevantes
      map.set(`loser:${loser.toLowerCase()}`, m.bracket_position)
    }
    return map
  }

  // Calcula bracket_position para un fixture nuevo buscando las posiciones previas de sus equipos
  function calcBracketPosition(homeTeam: string, awayTeam: string, stage: string): number | null {
    if (stage === 'third_place' || stage === 'final') {
      // Solo hay 1 partido en el centro — posición fija
      return 1
    }
    const prevStage = PREV_STAGE[stage]
    if (!prevStage) return null
    const winnerMap = buildWinnerPositionMap(prevStage)
    const homePos = winnerMap.get(homeTeam.toLowerCase())
    const awayPos = winnerMap.get(awayTeam.toLowerCase())
    const pos = homePos ?? awayPos
    if (pos == null) return null
    return Math.ceil(pos / 2)
  }

  for (const round of KNOCKOUT_ROUNDS) {
    try {
      const res = await fetch(`${API_FOOTBALL}/fixtures?league=${LEAGUE_ID}&season=${SEASON}&round=${encodeURIComponent(round)}`, {
        headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY! },
      })
      if (!res.ok) continue
      const json = await res.json()
      const roundFixtures: any[] = json.response ?? []
      for (const f of roundFixtures) {
        const externalId = String(f.fixture.id)
        if (existingExternalSet.has(externalId)) continue
        const stage = mapStage(f.league.round ?? '')
        const bracketPosition = calcBracketPosition(f.teams.home.name, f.teams.away.name, stage)
        await supabase.from('matches').insert({
          external_id: externalId,
          home_team: f.teams.home.name,
          away_team: f.teams.away.name,
          home_team_flag: f.teams.home.logo ?? null,
          away_team_flag: f.teams.away.logo ?? null,
          match_date: f.fixture.date,
          stage,
          bracket_position: bracketPosition,
          group_name: parseGroup(f.league.round ?? ''),
          status: mapStatus(f.fixture.status.short),
          home_score: f.goals.home ?? null,
          away_score: f.goals.away ?? null,
          penalty_home: f.score?.penalty?.home ?? null,
          penalty_away: f.score?.penalty?.away ?? null,
          tournament: f.league.name ?? null,
          competition_id: LEAGUE_ID,
          competition_name: f.league.name ?? 'FIFA World Cup',
        })
        newFixturesInserted++
        existingExternalSet.add(externalId)
      }
    } catch (err) {
      console.warn(`Error fetching round ${round}:`, err)
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
    await supabase.from('notifications').insert({
      user_id: null,
      is_global: true,
      type: 'match_starting_soon',
      metadata: { match_id: match.id, home_team: match.home_team, away_team: match.away_team, url },
    })
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
    await supabase.from('notifications').insert({
      user_id: null,
      is_global: true,
      type: 'match_started',
      metadata: { match_id: match.id, home_team: match.home_team, away_team: match.away_team, url },
    })
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
          is_global: false,
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

    await supabase.from('notifications').insert({
      user_id: null,
      is_global: true,
      type: 'match_finished',
      metadata: { match_id: match.id, home_team: match.home_team, away_team: match.away_team, home_score: match.home_score, away_score: match.away_score, url },
    })

    await supabase.from('matches').update({ notified_finished: true }).eq('id', match.id)
    notifiedFinished.push(match.id)
  }

  // Limpieza periódica de datos acumulados
  const cutoffRead = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const cutoffOld = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  await Promise.all([
    // Notificaciones personales leídas > 7 días
    supabase.from('notifications').delete().eq('is_global', false).eq('read', true).lt('created_at', cutoffRead),
    // Notificaciones personales no leídas > 30 días
    supabase.from('notifications').delete().eq('is_global', false).lt('created_at', cutoffOld),
    // Notificaciones globales > 30 días
    supabase.from('notifications').delete().eq('is_global', true).lt('created_at', cutoffOld),
    // Feed events > 30 días
    supabase.from('feed_events').delete().lt('created_at', cutoffOld),
  ])

  return NextResponse.json({ pointsCalculated: updatedIds, notified1h, notifiedStart, notified15min, notifiedFinished, newFixturesInserted })
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
  const match = round.match(/Group\s+([A-Z])\b(?!.*[a-z])/i)
  return match ? match[1].toUpperCase() : null
}
