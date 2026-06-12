'use client'
import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Trash2, MoreHorizontal, Flag, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import PostInteractionsGeneric from './post-interactions-generic'
import UserAvatar from './user-avatar'
import ReportModal from './report-modal'

type UserPost = {
  id: string
  user_id: string
  content: string | null
  image_url: string | null
  created_at: string
  is_system?: boolean
  profiles?: { username: string; full_name: string | null; avatar_url: string | null } | null
  post_reactions?: { id: string; emoji: string; user_id: string }[]
  post_comments?: { id: string; content: string; user_id: string; created_at: string; profiles?: { username: string } }[]
}

export default function UserPostCard({
  post,
  userId,
  userAvatarUrl,
  onDelete,
}: {
  post: UserPost
  userId: string
  userAvatarUrl?: string | null
  onDelete?: (id: string) => void
}) {
  const [showMenu, setShowMenu] = useState(false)
  const [reportTarget, setReportTarget] = useState<{ type: 'post' | 'user'; id: string } | null>(null)

  async function handleDelete() {
    if (!onDelete) return
    const supabase = createClient()
    await supabase.from('user_posts').delete().eq('id', post.id)
    onDelete(post.id)
  }

  async function handleDismiss() {
    if (!onDelete) return
    // Guardar en localStorage como fallback inmediato
    try {
      const dismissed = JSON.parse(localStorage.getItem('dismissed_system_posts') ?? '[]')
      if (!dismissed.includes(post.id)) {
        localStorage.setItem('dismissed_system_posts', JSON.stringify([...dismissed, post.id]))
      }
    } catch {}
    fetch('/api/posts/dismiss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_id: post.id }),
    }).catch(() => {})
    onDelete(post.id)
  }

  const isOwner = post.user_id === userId
  const isSystem = !!post.is_system

  return (
    <>
    {reportTarget && (
      <ReportModal type={reportTarget.type} targetId={reportTarget.id} onClose={() => setReportTarget(null)} />
    )}
    <div id={`post-${post.id}`} className="bg-slate-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          {isSystem ? (
            <>
              <div className="w-9 h-9 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0">
                <span className="text-lg">⚽</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Dacopas</p>
                <p suppressHydrationWarning className="text-xs text-slate-500">
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: es })}
                </p>
              </div>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(v => !v)}
            className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-8 bg-slate-700 rounded-xl shadow-xl z-10 overflow-hidden min-w-40">
              {isSystem && (
                <button
                  onClick={() => { handleDismiss(); setShowMenu(false) }}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-600 w-full transition"
                >
                  <EyeOff className="w-3.5 h-3.5" /> Ocultar del feed
                </button>
              )}
              {!isSystem && isOwner && onDelete && (
                <button
                  onClick={() => { handleDelete(); setShowMenu(false) }}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-slate-600 w-full transition"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Eliminar post
                </button>
              )}
              {!isSystem && !isOwner && (
                <>
                  <button
                    onClick={() => { setReportTarget({ type: 'post', id: post.id }); setShowMenu(false) }}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-600 w-full transition"
                  >
                    <Flag className="w-3.5 h-3.5 text-red-400" /> Reportar post
                  </button>
                  <button
                    onClick={() => { setReportTarget({ type: 'user', id: post.user_id }); setShowMenu(false) }}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-600 w-full transition"
                  >
                    <Flag className="w-3.5 h-3.5 text-red-400" /> Reportar usuario
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Contenido sistema */}
      {isSystem ? (
        <div className="px-4 pb-4 space-y-3">
          <div className="space-y-2">
            <div className="flex items-start gap-3 bg-slate-700/50 rounded-xl p-3">
              <span className="text-lg shrink-0">🎯</span>
              <div>
                <p className="text-sm font-semibold text-white">Marcador exacto → <span className="text-yellow-400">3 puntos</span></p>
                <p className="text-xs text-slate-400 mt-0.5">Incluye empates exactos (ej: 1-1 = 1-1)</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-slate-700/50 rounded-xl p-3">
              <span className="text-lg shrink-0">✅</span>
              <div>
                <p className="text-sm font-semibold text-white">Ganador correcto → <span className="text-yellow-400">1 punto</span></p>
                <p className="text-xs text-slate-400 mt-0.5">Acertás quién gana pero no el marcador exacto</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-slate-700/50 rounded-xl p-3">
              <span className="text-lg shrink-0">✅</span>
              <div>
                <p className="text-sm font-semibold text-white">Empate no exacto → <span className="text-yellow-400">1 punto</span></p>
                <p className="text-xs text-slate-400 mt-0.5">Predecís empate y hay empate, pero distintos goles</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            ⚠️ Los puntos aplican automáticamente en <span className="text-white font-medium">todos tus torneos</span>. Pronósticos bloqueados <span className="text-white font-medium">15 min antes</span> del partido.
          </p>
          <a href="/rules" className="inline-flex items-center gap-1 text-xs text-yellow-400 hover:text-yellow-300 transition font-medium">
            Ver reglas completas →
          </a>
        </div>
      ) : (
        <>
          {/* Contenido normal */}
          {post.content && (
            <p className="px-4 pb-3 text-sm text-slate-200 leading-relaxed">{post.content}</p>
          )}
          {post.image_url && (
            <img src={post.image_url} alt="post" className="w-full max-h-96 object-cover" />
          )}
        </>
      )}

      {/* Interacciones — solo posts normales */}
      {!isSystem && (
        <PostInteractionsGeneric
          postId={post.id}
          userId={userId}
          userAvatarUrl={userAvatarUrl}
          postOwnerId={post.user_id}
          postOwnerUsername={post.profiles?.username ?? ''}
          initialReactions={post.post_reactions ?? []}
          initialComments={post.post_comments ?? []}
          table="post"
        />
      )}
    </div>
    </>
  )
}
