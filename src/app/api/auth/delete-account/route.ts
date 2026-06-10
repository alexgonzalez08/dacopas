import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // Reasignar admin en torneos donde el usuario es admin
  const { data: adminLeagues } = await admin
    .from('league_members')
    .select('league_id')
    .eq('user_id', user.id)
    .eq('role', 'admin')

  for (const { league_id } of adminLeagues ?? []) {
    const { data: others } = await admin
      .from('league_members')
      .select('user_id, joined_at')
      .eq('league_id', league_id)
      .neq('user_id', user.id)
      .order('joined_at', { ascending: true })
      .limit(1)

    if (others && others.length > 0) {
      await admin
        .from('league_members')
        .update({ role: 'admin' })
        .eq('league_id', league_id)
        .eq('user_id', others[0].user_id)
    } else {
      // Torneo sin más miembros — eliminar
      await admin.from('league_members').delete().eq('league_id', league_id)
      await admin.from('leagues').delete().eq('id', league_id)
    }
  }

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
