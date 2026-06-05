import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import UserPostCard from '@/components/user-post-card'
import Link from 'next/link'

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single()

  if (!profile) notFound()

  const { data: posts } = await supabase
    .from('user_posts')
    .select('*, profiles(username, full_name, avatar_url), post_reactions(id, emoji, user_id), post_comments(id, content, user_id, created_at, profiles(username, full_name, avatar_url))')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })

  const isOwn = user?.id === profile.id
  const displayName = profile.full_name || profile.username
  const joinedYear = new Date(profile.created_at).getFullYear()

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
            {isOwn && (
              <Link href="/profile" className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 text-sm border border-slate-600 text-slate-300 hover:text-white rounded-xl hover:bg-slate-700 transition">
                Editar perfil
              </Link>
            )}
          </div>
          <h1 className="text-xl font-bold text-white">{displayName}</h1>
          {profile.full_name && <p className="text-sm text-slate-400">@{profile.username}</p>}
          {profile.bio && <p className="text-sm text-slate-300 mt-1">{profile.bio}</p>}
          <p className="text-xs text-slate-500 mt-2">⚽ Miembro desde {joinedYear}</p>
          <p className="text-xs text-slate-500 mt-0.5">📝 {posts?.length ?? 0} {posts?.length === 1 ? 'publicación' : 'publicaciones'}</p>
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
