import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { sendPushNotification } from '@/lib/push'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const action = req.nextUrl.searchParams.get('action') // 'accept' | 'decline'
  const id = req.nextUrl.searchParams.get('id') // notification id

  if (!action || !id) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const adminSupabase = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Obtener la notificación
  const { data: notif } = await adminSupabase
    .from('notifications')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!notif) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (notif.type === 'follow_request') {
    // Buscar el friendship
    const { data: friendship } = await adminSupabase
      .from('friendships')
      .select('id')
      .eq('requester_id', notif.from_user_id)
      .eq('addressee_id', user.id)
      .eq('status', 'pending')
      .single()

    if (!friendship) return NextResponse.json({ error: 'Friendship not found' }, { status: 404 })

    if (action === 'accept') {
      await adminSupabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendship.id)

      await adminSupabase.from('notifications').insert({
        user_id: notif.from_user_id,
        from_user_id: user.id,
        type: 'follow_accepted',
      })

      sendPushNotification({
        toUserId: notif.from_user_id,
        title: '¡Solicitud aceptada!',
        body: 'Tu solicitud de amistad fue aceptada en Dacopas',
        data: { url: '/notifications', type: 'follow_accepted' },
      })
    } else {
      await adminSupabase.from('friendships').delete().eq('id', friendship.id)
    }

    // Marcar notificación como leída
    await adminSupabase.from('notifications').update({ read: true }).eq('id', id)
  }

  return NextResponse.json({ ok: true })
}
