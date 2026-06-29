import { createClient } from '@/lib/supabase/server'
import ProfileClient from './profile-client'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  const [{ data: posts }, { data: memberships }, { count: friendsCount }] = await Promise.all([
    supabase
      .from('user_posts')
      .select('*, profiles!user_posts_user_id_fkey(username, full_name, avatar_url), post_reactions(id, emoji, user_id), post_comments(id, content, user_id, created_at, profiles(username, full_name, avatar_url))')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('league_members')
      .select('leagues(id, name)')
      .eq('user_id', user!.id),
    supabase
      .from('friendships')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`),
  ])

  const leagues = (memberships ?? []).flatMap(m => m.leagues ? [m.leagues as unknown as { id: string; name: string }] : [])

  return (
    <ProfileClient
      profile={profile}
      userId={user!.id}
      initialPosts={posts ?? []}
      leagues={leagues}
      friendsCount={friendsCount ?? 0}
    />
  )
}
