'use client'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { GitBranch } from 'lucide-react'
import PostInteractionsGeneric from './post-interactions-generic'

type Props = {
  post: {
    id: string
    user_id: string
    created_at: string
    post_reactions?: { id: string; emoji: string; user_id: string; profiles?: { username: string } | null }[]
    post_comments?: { id: string; content: string; user_id: string; created_at: string; profiles?: { username: string } }[]
  }
  userId: string
  userAvatarUrl?: string | null
}

export default function BracketPostCard({ post, userId, userAvatarUrl }: Props) {
  return (
    <div className="bg-slate-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <div className="w-9 h-9 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0">
          <GitBranch size={18} className="text-yellow-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Dacopas</p>
          <p suppressHydrationWarning className="text-xs text-slate-500">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: es })}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-4 space-y-3">
        <p className="text-sm text-slate-200">
          🏆 ¡Ya están disponibles las llaves de la <span className="text-white font-semibold">Segunda Ronda Eliminatoria</span>! Ingresá tus predicciones antes de que cierren.
        </p>

        <Link
          href="/bracket"
          className="flex items-center justify-between px-4 py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 hover:border-yellow-500/40 transition group"
        >
          <div className="flex items-center gap-3">
            <GitBranch size={20} className="text-yellow-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-white">Ver llaves</p>
              <p className="text-xs text-slate-400">Segunda Ronda Eliminatoria</p>
            </div>
          </div>
          <span className="text-yellow-400 text-xs font-medium group-hover:translate-x-0.5 transition-transform">→</span>
        </Link>
      </div>

      {/* Interactions */}
      <PostInteractionsGeneric
        postId={post.id}
        userId={userId}
        userAvatarUrl={userAvatarUrl}
        postOwnerId={post.user_id}
        postOwnerUsername="Dacopas"
        initialReactions={post.post_reactions ?? []}
        initialComments={post.post_comments ?? []}
        table="post"
        systemMode
      />
    </div>
  )
}
