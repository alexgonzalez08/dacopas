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

  const title = '🌍 ¡Bienvenidos a Dacopas!'
  const body = '¡La emoción del Mundial está cerca! No olvides preparar tus pronósticos.'
  const url = '/predictions'

  // Push a todos los usuarios
  await sendPushToAllUsers(supabase, {
    title,
    body,
    data: { url, image: 'https://www.dacopas.com/og-image.png', tag: 'welcome-mundial-2026' },
  })

  // In-app notification a todos los usuarios
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
