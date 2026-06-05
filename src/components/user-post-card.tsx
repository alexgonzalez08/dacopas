'use client'
import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Trash2, MoreHorizontal } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import PostInteractionsGeneric from './post-interactions-generic'
import UserAvatar from './user-avatar'

type UserPost = {
  id: string
  user_id: string
  content: string | null
  image_url: string | null
  created_at: string
  profiles?: { username: string; full_name: string | null; avatar_url: string | null } | null
  post_reactions?: { id: string; emoji: string; user_id: string }[]
  post_comments?: { id: string; content: string; user_id: string; created_at: string; profiles?: { username: string } }[]
}

export default function UserPostCard({
  post,
  userId,
  onDelete,
}: {
  post: UserPost
  userId: string
  onDelete?: (id: string) => void
}) {
  const [showMenu, setShowMenu] = useState(false)

  async function handleDelete() {
    if (!onDelete) return
    const supabase = createClient()
    await supabase.from('user_posts').delete().eq('id', post.id)
    onDelete(post.id)
  }

  const isOwner = post.user_id === userId

  return (
    <div className="bg-slate-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <UserAvatar
            username={post.profiles?.username ?? ''}
            fullName={post.profiles?.full_name}
            avatarUrl={post.profiles?.avatar_url}
            size="md"
            showName
            showAlias
          />
          <p suppressHydrationWarning className="text-xs text-slate-500">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: es })}
          </p>
        </div>
        {isOwner && onDelete && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(v => !v)}
              className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-8 bg-slate-700 rounded-xl shadow-xl z-10 overflow-hidden min-w-32">
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-slate-600 w-full transition"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Eliminar
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Contenido */}
      {post.content && (
        <p className="px-4 pb-3 text-sm text-slate-200 leading-relaxed">{post.content}</p>
      )}

      {/* Imagen */}
      {post.image_url && (
        <img src={post.image_url} alt="post" className="w-full max-h-96 object-cover" />
      )}

      {/* Interacciones */}
      <PostInteractionsGeneric
        postId={post.id}
        userId={userId}
        initialReactions={post.post_reactions ?? []}
        initialComments={post.post_comments ?? []}
        table="post"
      />
    </div>
  )
}
