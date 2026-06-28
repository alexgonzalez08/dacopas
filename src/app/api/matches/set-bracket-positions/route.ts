import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// POST /api/matches/set-bracket-positions
// Body: { positions: [{ external_id: string, bracket_position: number }] }
// Or:   { auto: true } — asigna por order de fecha dentro de cada stage

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const body = await request.json()

  // Modo manual: recibe array de { external_id, bracket_position }
  if (body.positions) {
    const results = []
    for (const { external_id, bracket_position } of body.positions) {
      const { error } = await supabase
        .from('matches')
        .update({ bracket_position })
        .eq('external_id', String(external_id))
      results.push({ external_id, bracket_position, ok: !error, error: error?.message })
    }
    return NextResponse.json({ ok: true, results })
  }

  // Modo auto: ordena por fecha dentro de cada stage y asigna posición
  if (body.auto) {
    const stages = ['round_of_32', 'round_of_16', 'quarter', 'semi', 'third_place', 'final']
    const allResults = []
    for (const stage of stages) {
      const { data: matches } = await supabase
        .from('matches')
        .select('id, match_date')
        .eq('stage', stage)
        .order('match_date', { ascending: true })

      for (let i = 0; i < (matches ?? []).length; i++) {
        const { error } = await supabase
          .from('matches')
          .update({ bracket_position: i + 1 })
          .eq('id', matches![i].id)
        allResults.push({ id: matches![i].id, stage, bracket_position: i + 1, ok: !error })
      }
    }
    return NextResponse.json({ ok: true, results: allResults })
  }

  return NextResponse.json({ error: 'Provide positions[] or auto:true' }, { status: 400 })
}

// GET — lista los partidos knockout con su bracket_position actual
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data } = await supabase
    .from('matches')
    .select('id, external_id, home_team, away_team, match_date, stage, bracket_position')
    .in('stage', ['round_of_32', 'round_of_16', 'quarter', 'semi', 'third_place', 'final'])
    .order('stage')
    .order('bracket_position', { ascending: true, nullsFirst: false })
    .order('match_date', { ascending: true })

  return NextResponse.json({ matches: data })
}
