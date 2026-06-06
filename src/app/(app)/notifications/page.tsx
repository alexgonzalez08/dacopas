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

  // Ligas en las que ya es miembro
  const { data: memberships } = await supabase
    .from('league_members')
    .select('league_id')
    .eq('user_id', user!.id)
  const joinedLeagueIds = new Set((memberships ?? []).map(m => m.league_id))

  // Amistades aceptadas — para saber cuáles solicitudes ya fueron aceptadas
  const { data: acceptedFriendships } = await supabase
    .from('friendships')
    .select('requester_id, addressee_id')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`)
  const friendIds = new Set((acceptedFriendships ?? []).map(f =>
    f.requester_id === user!.id ? f.addressee_id : f.requester_id
  ))

  // Solicitudes declinadas o eliminadas — pendientes que ya no existen
  const { data: pendingFriendships } = await supabase
    .from('friendships')
    .select('requester_id')
    .eq('addressee_id', user!.id)
    .eq('status', 'pending')
  const pendingFromIds = new Set((pendingFriendships ?? []).map(f => f.requester_id))

  const notificationsEnriched = (notifications ?? []).map(n => ({
    ...n,
    alreadyJoined: n.type === 'league_invite' ? joinedLeagueIds.has(n.metadata?.league_id) : false,
    alreadyAccepted: n.type === 'follow_request' ? friendIds.has(n.from_user_id) : false,
    alreadyDeclined: n.type === 'follow_request' ? !pendingFromIds.has(n.from_user_id) && !friendIds.has(n.from_user_id) : false,
  }))

  // Marcar todas como leídas
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user!.id)
    .eq('read', false)

  return (
    <NotificationsClient
      userId={user!.id}
      initialNotifications={notificationsEnriched}
    />
  )
}
