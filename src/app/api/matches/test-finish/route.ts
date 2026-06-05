import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Este endpoint solo funciona en desarrollo
export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { match_id, home_score, away_score } = await request.json()

  if (match_id === undefined || home_score === undefined || away_score === undefined) {
    return NextResponse.json({ error: 'Faltan campos: match_id, home_score, away_score' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1. Bloquear predicciones del partido
  const { error: lockError } = await supabase
    .from('predictions')
    .update({ status: 'locked' })
    .eq('match_id', match_id)

  if (lockError) return NextResponse.json({ error: lockError.message }, { status: 500 })

  // 2. Actualizar resultado del partido
  const { error } = await supabase
    .from('matches')
    .update({ home_score, away_score, status: 'finished', updated_at: new Date().toISOString() })
    .eq('id', match_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 3. Calcular puntos en todas las ligas
  const { error: rpcError } = await supabase.rpc('calculate_match_points', { p_match_id: match_id })
  if (rpcError) return NextResponse.json({ error: rpcError.message }, { status: 500 })

  // 4. Traer resumen de puntos calculados
  const { data: points } = await supabase
    .from('league_points')
    .select('user_id, league_id, points, exact_results, correct_winner, profiles(username)')
    .order('points', { ascending: false })

  return NextResponse.json({
    ok: true,
    match_id,
    result: `${home_score} - ${away_score}`,
    points_updated: points ?? [],
  })
}
