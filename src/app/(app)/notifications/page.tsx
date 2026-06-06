import { createClient } from '@/lib/supabase/server'
import NotificationsClient from './notifications-client'

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*, from_user:from_user_id(id, username, full_name, avatar_url)')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(50)

  // Marcar todas como leídas
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user!.id)
    .eq('read', false)

  return (
    <NotificationsClient
      userId={user!.id}
      initialNotifications={notifications ?? []}
    />
  )
}
