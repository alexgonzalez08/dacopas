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

  const [{ data: posts }, { data: memberships }] = await Promise.all([
    supabase
      .from('user_posts')
      .select('*, profiles(username, full_name, avatar_url), post_reactions(id, emoji, user_id), post_comments(id, content, user_id, created_at, profiles(username, full_name, avatar_url))')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('league_members')
      .select('leagues(id, name)')
      .eq('user_id', user!.id),
  ])

  const leagues = (memberships ?? []).flatMap(m => m.leagues ? [m.leagues as unknown as { id: string; name: string }] : [])

  return (
    <ProfileClient
      profile={profile}
      userId={user!.id}
      initialPosts={posts ?? []}
      leagues={leagues}
    />
  )
}
