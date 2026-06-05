import { createClient } from '@/lib/supabase/server'
import FriendsClient from './friends-client'

export default async function FriendsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: following }, { data: followers }, { data: pending }, { data: requests }] = await Promise.all([
    // Usuarios que yo sigo (yo envié la solicitud, fue aceptada)
    supabase
      .from('friendships')
      .select('*, addressee:addressee_id(id, username, full_name, avatar_url)')
      .eq('requester_id', user!.id)
      .eq('status', 'accepted'),
    // Usuarios que me siguen (ellos enviaron la solicitud, fue aceptada)
    supabase
      .from('friendships')
      .select('*, requester:requester_id(id, username, full_name, avatar_url)')
      .eq('addressee_id', user!.id)
      .eq('status', 'accepted'),
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
      initialFollowing={following ?? []}
      initialFollowers={followers ?? []}
      initialPending={pending ?? []}
      initialRequests={requests ?? []}
    />
  )
}
