'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MessageCircle, Send, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { sendPushNotification } from '@/lib/push'

const EMOJIS = ['❤️', '👍', '🔥', '😂', '😮', '🎯']

type Reaction = { id: string; emoji: string; user_id: string }
type Comment = {
  id: string
  content: string
  user_id: string
  created_at: string
  profiles?: { username: string }
}

export default function PostInteractionsGeneric({
  postId,
  userId,
  postOwnerId,
  postOwnerUsername,
  initialReactions,
  initialComments,
  table,
}: {
  postId: string
  userId: string
  postOwnerId?: string
  postOwnerUsername?: string
  initialReactions: Reaction[]
  initialComments: Comment[]
  table: 'post' | 'feed'
}) {
  const reactionsTable = table === 'post' ? 'post_reactions' : 'feed_reactions'
  const commentsTable = table === 'post' ? 'post_comments' : 'feed_comments'
  const idCol = table === 'post' ? 'post_id' : 'event_id'

  const [reactions, setReactions] = useState<Reaction[]>(initialReactions)
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [showComments, setShowComments] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const myReaction = reactions.find(r => r.user_id === userId)

  async function handleReaction(emoji: string) {
    const supabase = createClient()
    if (myReaction) {
      await supabase.from(reactionsTable).delete().eq('id', myReaction.id)
      if (myReaction.emoji === emoji) {
        setReactions(r => r.filter(x => x.id !== myReaction.id))
        return
      }
    }
    const { data } = await supabase
      .from(reactionsTable)
      .insert({ [idCol]: postId, user_id: userId, emoji })
      .select()
      .single()
    if (data) {
      setReactions(r => [...r.filter(x => x.id !== myReaction?.id), data])
      // Notificar al dueño del post (no a uno mismo)
      if (postOwnerId && postOwnerId !== userId && table === 'post') {
        const { data: profile } = await supabase.from('profiles').select('username').eq('id', userId).single()
        const username = profile?.username ?? 'Alguien'
        await supabase.from('notifications').insert({
          user_id: postOwnerId,
          from_user_id: userId,
          type: 'post_reaction',
          metadata: { post_id: postId, emoji, reactor_username: username },
        })
        sendPushNotification({
          toUserId: postOwnerId,
          title: `${emoji} Nueva reacción`,
          body: `@${username} reaccionó a tu publicación`,
          data: { url: `/profile/${postOwnerUsername}` },
        })
      }
    }
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault()
    if (!comment.trim()) return
    setSubmitting(true)
    const supabase = createClient()
    const { data } = await supabase
      .from(commentsTable)
      .insert({ [idCol]: postId, user_id: userId, content: comment.trim() })
      .select('*, profiles(username)')
      .single()
    if (data) {
      setComments(c => [...c, data])
      setComment('')
      // Notificar al dueño del post (no a uno mismo)
      if (postOwnerId && postOwnerId !== userId && table === 'post') {
        const username = data.profiles?.username ?? 'Alguien'
        await supabase.from('notifications').insert({
          user_id: postOwnerId,
          from_user_id: userId,
          type: 'post_comment',
          metadata: { post_id: postId, comment: comment.trim().slice(0, 80), commenter_username: username },
        })
        sendPushNotification({
          toUserId: postOwnerId,
          title: '💬 Nuevo comentario',
          body: `@${username}: ${comment.trim().slice(0, 60)}`,
          data: { url: `/profile/${postOwnerUsername}` },
        })
      }
    }
    setSubmitting(false)
  }

  async function handleDeleteComment(commentId: string) {
    const supabase = createClient()
    await supabase.from(commentsTable).delete().eq('id', commentId)
    setComments(c => c.filter(x => x.id !== commentId))
  }

  // Agrupar reacciones
  const grouped = EMOJIS.map(emoji => ({
    emoji,
    count: reactions.filter(r => r.emoji === emoji).length,
  }))
  const totalReactions = reactions.length
  const totalComments = comments.length

  return (
    <div className="border-t border-slate-700">
      {/* Burbujas de reacciones estilo WhatsApp */}
      {(totalReactions > 0 || totalComments > 0) && (
        <div className="flex items-center gap-1.5 px-4 pt-2 pb-1 flex-wrap">
          {grouped.filter(g => g.count > 0).map(g => (
            <button
              key={g.emoji}
              onClick={() => handleReaction(g.emoji)}
              className={`flex items-center gap-1 text-sm rounded-full px-2.5 py-0.5 transition ${
                myReaction?.emoji === g.emoji
                  ? 'bg-yellow-500/20 border border-yellow-500/40 text-yellow-300'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
              }`}
            >
              <span>{g.emoji}</span>
              <span className="text-xs font-medium">{g.count}</span>
            </button>
          ))}
          {totalComments > 0 && (
            <button
              onClick={() => setShowComments(v => !v)}
              className="ml-auto text-xs text-slate-500 hover:text-slate-300 transition flex items-center gap-1"
            >
              <MessageCircle className="w-3 h-3" /> {totalComments}
            </button>
          )}
        </div>
      )}

      {/* Barra de acciones */}
      <div className="flex items-center px-3 py-2">
        {/* Picker flotante estilo WhatsApp */}
        <div className="relative">
          {showPicker && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} />
              <div className="absolute bottom-full left-0 mb-2 z-50 bg-slate-800 border border-slate-700 rounded-full shadow-2xl px-3 py-2 flex items-center gap-1">
                {EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => { handleReaction(emoji); setShowPicker(false) }}
                    className={`text-2xl transition-transform hover:scale-125 active:scale-110 ${
                      myReaction?.emoji === emoji ? 'scale-125' : 'opacity-80 hover:opacity-100'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </>
          )}
          <button
            onClick={() => setShowPicker(v => !v)}
            className={`text-xl p-1.5 rounded-full transition hover:bg-slate-700 ${showPicker ? 'bg-slate-700' : ''}`}
          >
            {myReaction ? myReaction.emoji : '🙂'}
          </button>
        </div>

        <button
          onClick={() => setShowComments(v => !v)}
          className="flex items-center gap-1 ml-auto text-xs text-slate-400 hover:text-white transition px-2 py-1 rounded-lg hover:bg-slate-700"
        >
          <MessageCircle className="w-3.5 h-3.5" /> Comentar
        </button>
      </div>

      {/* Sección comentarios */}
      {showComments && (
        <div className="px-4 pb-4 space-y-3">
          {comments.map(c => (
            <div key={c.id} className="flex gap-2 group">
              <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center shrink-0 text-xs font-bold text-slate-300 uppercase">
                {c.profiles?.username?.[0] ?? '?'}
              </div>
              <div className="flex-1 bg-slate-700/50 rounded-xl px-3 py-1.5">
                <span className="text-xs font-semibold text-slate-300">{c.profiles?.username} </span>
                <span className="text-sm text-slate-200">{c.content}</span>
                <div className="flex items-center justify-between mt-0.5">
                  <span suppressHydrationWarning className="text-xs text-slate-500">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: es })}
                  </span>
                  {c.user_id === userId && (
                    <button
                      onClick={() => handleDeleteComment(c.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          <form onSubmit={handleComment} className="flex gap-2">
            <div className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0 text-xs font-bold text-yellow-400 uppercase">
              {userId[0]}
            </div>
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Escribí un comentario..."
                maxLength={280}
                className="flex-1 bg-slate-700 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500 text-slate-200 placeholder-slate-500"
              />
              <button
                type="submit"
                disabled={submitting || !comment.trim()}
                className="text-yellow-400 hover:text-yellow-300 disabled:opacity-30 transition"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
