import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sendPushToAllUsers } from '@/lib/push-server'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const title = '📋 ¿Sabés cómo ganar puntos?'
  const body = 'Marcador exacto = 3 pts · Ganador correcto = 1 pt · Los puntos aplican en todos tus torneos.'
  const url = '/rules'

  await sendPushToAllUsers(supabase, {
    title,
    body,
    data: { url, image: 'https://www.dacopas.com/og-image.png', tag: 'rules-reminder' },
  })

  const { data: profiles } = await supabase.from('profiles').select('id')
  if (profiles?.length) {
    await supabase.from('notifications').insert(
      profiles.map(p => ({
        user_id: p.id,
        type: 'welcome_blast',
        metadata: { title, body, url },
      }))
    )
  }

  return NextResponse.json({ ok: true, sent_to: profiles?.length ?? 0 })
}
