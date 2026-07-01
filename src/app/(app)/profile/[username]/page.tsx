export const revalidate = 60

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import UserPostCard from '@/components/user-post-card'
import Link from 'next/link'
import FriendshipButton from './friendship-button'

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .maybeSingle()

  if (!profile) {
    const { data: fallback } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', username)
      .limit(1)
      .maybeSingle()
    profile = fallback
  }

  if (!profile) notFound()

  const [
    { data: posts },
    { data: memberships },
    { count: friendsCount },
  ] = await Promise.all([
    supabase
      .from('user_posts')
      .select('*, profiles!user_posts_user_id_fkey(username, full_name, avatar_url), post_reactions(id, emoji, user_id), post_comments(id, content, user_id, created_at, profiles(username, full_name, avatar_url))')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('league_members')
      .select('leagues(id, name, competition_name)')
      .eq('user_id', profile.id)
      .is('left_at', null),
    supabase
      .from('friendships')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'accepted')
      .or(`requester_id.eq.${profile.id},addressee_id.eq.${profile.id}`),
  ])

  const leagues = (memberships ?? []).flatMap(m => m.leagues ? [m.leagues as any] : [])
  const competitions = [...new Set(leagues.map((l: any) => l.competition_name ?? 'FIFA World Cup 2026'))]

  const isOwn = user?.id === profile.id
  const displayName = profile.full_name || profile.username
  const joinedYear = new Date(profile.created_at).getFullYear()
  const postCount = posts?.length ?? 0

  // Estado de amistad
  let friendshipStatus: 'none' | 'pending_sent' | 'pending_received' | 'accepted' = 'none'
  let friendshipId: string | null = null
  if (user && !isOwn) {
    const { data: friendship } = await supabase
      .from('friendships')
      .select('id, status, requester_id')
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${profile.id}),and(requester_id.eq.${profile.id},addressee_id.eq.${user.id})`)
      .maybeSingle()
    if (friendship) {
      friendshipId = friendship.id
      if (friendship.status === 'accepted') {
        friendshipStatus = 'accepted'
      } else if (friendship.requester_id === user.id) {
        friendshipStatus = 'pending_sent'
      } else {
        friendshipStatus = 'pending_received'
      }
    }
  }

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      {/* Tarjeta de perfil */}
      <div className="bg-slate-800 rounded-2xl">
        <div className="h-24 rounded-t-2xl bg-gradient-to-r from-yellow-500/30 via-slate-700 to-slate-800" />
        <div className="px-5 pb-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-4 -mt-10">
            <div className="relative w-20 h-20 shrink-0">
              <div className="w-20 h-20 rounded-full border-4 border-slate-800 overflow-hidden bg-slate-700 flex items-center justify-center">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-slate-300 uppercase">{displayName[0]}</span>
                )}
              </div>
            </div>
            {isOwn ? (
              <Link href="/profile" className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 text-sm border border-slate-600 text-slate-300 hover:text-white rounded-xl hover:bg-slate-700 transition">
                Editar perfil
              </Link>
            ) : user && (
              <FriendshipButton
                currentUserId={user.id}
                targetUserId={profile.id}
                targetUsername={profile.username}
                initialStatus={friendshipStatus}
                friendshipId={friendshipId}
              />
            )}
          </div>

          <h1 className="text-xl font-bold text-white">{displayName}</h1>
          {profile.full_name && <p className="text-sm text-slate-400">@{profile.username}</p>}
          {profile.bio && <p className="text-sm text-slate-300 mt-1">{profile.bio}</p>}

          <div className="flex items-center gap-4 mt-2">
            <span className="text-xs text-slate-400">
              <span className="font-semibold text-white">{friendsCount ?? 0}</span> {(friendsCount ?? 0) === 1 ? 'amigo' : 'amigos'}
            </span>
            <span className="text-xs text-slate-500">📝 {postCount} {postCount === 1 ? 'publicación' : 'publicaciones'}</span>
            <span className="text-xs text-slate-500">⚽ Desde {joinedYear}</span>
          </div>

          {competitions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {competitions.map((c: string) => (
                <span key={c} className="text-xs px-2.5 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 font-medium">
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Posts */}
      {!posts?.length ? (
        <div className="text-center py-10 text-slate-500">
          <p className="text-3xl mb-2">📝</p>
          <p className="text-sm">{isOwn ? 'Todavía no publicaste nada.' : `${displayName} todavía no publicó nada.`}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(post => (
            <UserPostCard
              key={post.id}
              post={post as any}
              userId={user!.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}
