import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // Eliminar datos del usuario en orden
  await admin.from('push_tokens').delete().eq('user_id', user.id)
  await admin.from('league_chat_reads').delete().eq('user_id', user.id)
  await admin.from('league_chat_messages').delete().eq('user_id', user.id)
  await admin.from('notifications').delete().eq('user_id', user.id)
  await admin.from('predictions').delete().eq('user_id', user.id)
  await admin.from('league_members').delete().eq('user_id', user.id)
  await admin.from('friendships').delete().or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
  await admin.from('feed_events').delete().eq('user_id', user.id)
  await admin.from('profiles').delete().eq('id', user.id)

  // Eliminar cuenta de auth
  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
