import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sendPushToAllUsers } from '@/lib/push-server'

// Solo disponible en desarrollo
export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { match_id } = await request.json()
  if (!match_id) {
    return NextResponse.json({ error: 'Falta match_id' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: match } = await supabase
    .from('matches')
    .select('id, home_team, away_team')
    .eq('id', match_id)
    .single()

  if (!match) {
    return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 })
  }

  const result = await sendPushToAllUsers(supabase, {
    title: '⚽ ¡Partido en 45 minutos!',
    body: `${match.home_team} vs ${match.away_team} — ¡No olvides enviar tu pronóstico!`,
    data: { url: `/matches/${match.id}` },
  })

  return NextResponse.json({ match, ...result })
}
