import { createClient } from '@/lib/supabase/server'
import FriendsClient from './friends-client'

export default async function FriendsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: friends }, { data: pending }, { data: requests }] = await Promise.all([
    // Seguidores aceptados
    supabase
      .from('friendships')
      .select('*, requester:requester_id(id, username, full_name, avatar_url), addressee:addressee_id(id, username, full_name, avatar_url)')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`),
    // Solicitudes enviadas pendientes
    supabase
      .from('friendships')
      .select('*, addressee:addressee_id(id, username, full_name, avatar_url)')
      .eq('requester_id', user!.id)
      .eq('status', 'pending'),
    // Solicitudes recibidas pendientes
    supabase
      .from('friendships')
      .select('*, requester:requester_id(id, username, full_name, avatar_url)')
      .eq('addressee_id', user!.id)
      .eq('status', 'pending'),
  ])

  return (
    <FriendsClient
      userId={user!.id}
      initialFriends={friends ?? []}
      initialPending={pending ?? []}
      initialRequests={requests ?? []}
    />
  )
}
