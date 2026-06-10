import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sendPushToUsers } from '@/lib/push-server'

// Endpoint de prueba — solo envía a un email específico, protegido por CRON_SECRET
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { match_id, type = '1h', email = 'alexgf08@gmail.com' } = await request.json()

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Buscar usuario por email
  const { data: { users } } = await supabase.auth.admin.listUsers()
  const targetUser = users.find(u => u.email === email)
  if (!targetUser) {
    return NextResponse.json({ error: `Usuario no encontrado: ${email}` }, { status: 404 })
  }

  // Buscar partido: si no se pasa match_id, usar el próximo partido scheduled
  let match: { id: number; home_team: string; away_team: string } | null = null
  if (match_id) {
    const { data } = await supabase
      .from('matches')
      .select('id, home_team, away_team')
      .eq('id', match_id)
      .single()
    match = data
  } else {
    const { data } = await supabase
      .from('matches')
      .select('id, home_team, away_team, match_date')
      .eq('status', 'scheduled')
      .gte('match_date', new Date().toISOString())
      .order('match_date', { ascending: true })
      .limit(1)
      .single()
    match = data
  }

  if (!match) {
    return NextResponse.json({ error: 'No hay partidos programados' }, { status: 404 })
  }

  const url = `/matches/${match.id}`
  const title = type === '1h'
    ? '⚽ ¡Partido en 1 hora!'
    : '🟢 ¡El partido está comenzando!'
  const body = type === '1h'
    ? `${match.home_team} vs ${match.away_team} — ¡No olvides registrar tu pronóstico!`
    : `${match.home_team} vs ${match.away_team} — ¡Seguilo en vivo!`
  const tag = type === '1h' ? `match-1h-${match.id}` : `match-start-${match.id}`

  // Push notification
  const pushResult = await sendPushToUsers({
    userIds: [targetUser.id],
    title,
    body,
    data: { url, image: 'https://www.dacopas.com/og-image.png', tag },
  })

  // In-app notification
  await supabase.from('notifications').insert({
    user_id: targetUser.id,
    type: type === '1h' ? 'match_starting_soon' : 'match_started',
    metadata: { match_id: match.id, home_team: match.home_team, away_team: match.away_team, url },
  })

  return NextResponse.json({ ok: true, sentTo: email, match, type, title, body, pushResult })
}
