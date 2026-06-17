'use client'
import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MessageCircle, Send, Trash2, Smile } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { sendPushNotification } from '@/lib/push'
import dynamic from 'next/dynamic'

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false })

const EMOJIS = ['❤️', '👍', '🔥', '😂', '😮', '🎯']

type Reaction = { id: string; emoji: string; user_id: string; profiles?: { username: string } | null }
type Comment = {
  id: string
  content: string
  user_id: string
  created_at: string
  profiles?: { username: string; avatar_url?: string | null }
}

export default function PostInteractionsGeneric({
  postId,
  userId,
  userAvatarUrl,
  postOwnerId,
  postOwnerUsername,
  initialReactions,
  initialComments,
  table,
  systemMode = false,
}: {
  postId: string
  userId: string
  userAvatarUrl?: string | null
  postOwnerId?: string
  postOwnerUsername?: string
  initialReactions: Reaction[]
  initialComments: Comment[]
  table: 'post' | 'feed'
  systemMode?: boolean
}) {
  const reactionsTable = table === 'post' ? 'post_reactions' : 'feed_reactions'
  const commentsTable = table === 'post' ? 'post_comments' : 'feed_comments'
  const idCol = table === 'post' ? 'post_id' : 'event_id'

  const [reactions, setReactions] = useState<Reaction[]>(initialReactions)
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [loadingComments, setLoadingComments] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showEmojiComment, setShowEmojiComment] = useState(false)
  const [reactorsModal, setReactorsModal] = useState<{ emoji: string; users: string[] } | null>(null)
  const commentInputRef = useRef<HTMLInputElement>(null)

  const myReaction = reactions.find(r => r.user_id === userId)

  async function handleReaction(emoji: string) {
    if (systemMode) {
      if (myReaction) {
        await fetch('/api/posts/system-interactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'remove_reaction', reactionId: myReaction.id }),
        })
        if (myReaction.emoji === emoji) {
          setReactions(r => r.filter(x => x.id !== myReaction.id))
          return
        }
      }
      const res = await fetch('/api/posts/system-interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'react', postId, emoji }),
      })
      const { reaction } = await res.json()
      if (reaction) setReactions(r => [...r.filter(x => x.id !== myReaction?.id), reaction])
      return
    }

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
      const { data: profile } = await supabase.from('profiles').select('username').eq('id', userId).single()
      setReactions(r => [...r.filter(x => x.id !== myReaction?.id), { ...data, profiles: { username: profile?.username ?? '…' } }])
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

    if (systemMode) {
      const res = await fetch('/api/posts/system-interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'comment', postId, content: comment.trim() }),
      })
      const { comment: newComment } = await res.json()
      if (newComment) {
        setComments(c => [...c, newComment])
        setComment('')
      }
      setSubmitting(false)
      return
    }

    const supabase = createClient()
    const { data } = await supabase
      .from(commentsTable)
      .insert({ [idCol]: postId, user_id: userId, content: comment.trim() })
      .select('*, profiles(username, avatar_url)')
      .single()
    if (data) {
      setComments(c => [...c, data])
      setComment('')
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
    if (systemMode) {
      await fetch('/api/posts/system-interactions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId }),
      })
      setComments(c => c.filter(x => x.id !== commentId))
      return
    }
    const supabase = createClient()
    await supabase.from(commentsTable).delete().eq('id', commentId)
    setComments(c => c.filter(x => x.id !== commentId))
  }

  // Agrupar reacciones
  const grouped = EMOJIS.map(emoji => ({
    emoji,
    count: reactions.filter(r => r.emoji === emoji).length,
    users: reactions.filter(r => r.emoji === emoji).map(r => r.profiles?.username ?? '…'),
  }))
  const totalReactions = reactions.length
  const totalComments = comments.length

  return (
    <div className="border-t border-slate-700">
      {/* Burbujas de reacciones estilo WhatsApp */}
      {(totalReactions > 0 || totalComments > 0) && (
        <div className="flex items-center gap-1.5 px-4 pt-2 pb-1 flex-wrap">
          {grouped.filter(g => g.count > 0).map(g => (
            <div key={g.emoji} className="relative group/reaction flex items-center rounded-full overflow-hidden">
              {/* Emoji — toggle reacción */}
              <button
                onClick={() => handleReaction(g.emoji)}
                className={`flex items-center gap-1 text-sm pl-2.5 pr-1.5 py-0.5 transition ${
                  myReaction?.emoji === g.emoji
                    ? 'bg-yellow-500/20 text-yellow-300'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                }`}
              >
                <span>{g.emoji}</span>
              </button>
              {/* Contador — ver quiénes reaccionaron */}
              <button
                onClick={() => setReactorsModal({ emoji: g.emoji, users: g.users })}
                className={`text-xs font-medium pr-2.5 pl-1 py-0.5 transition ${
                  myReaction?.emoji === g.emoji
                    ? 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                }`}
              >
                {g.count}
              </button>
              {/* Tooltip desktop */}
              <div className="absolute bottom-full left-0 mb-1.5 hidden group-hover/reaction:block z-20 pointer-events-none">
                <div className="bg-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-lg">
                  {g.users.join(', ')}
                </div>
              </div>
            </div>
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
          onClick={async () => {
            if (!showComments && systemMode) {
              setLoadingComments(true)
              const res = await fetch(`/api/posts/system-interactions?postId=${postId}`)
              const data = await res.json()
              if (data.reactions) setReactions(data.reactions)
              if (data.comments) setComments(data.comments)
              setLoadingComments(false)
            }
            setShowComments(v => !v)
          }}
          className="flex items-center gap-1 ml-auto text-xs text-slate-400 hover:text-white transition px-2 py-1 rounded-lg hover:bg-slate-700"
        >
          <MessageCircle className="w-3.5 h-3.5" /> {loadingComments ? '...' : 'Opinar'}
        </button>
      </div>

      {/* Sección comentarios */}
      {showComments && (
        <div className="px-4 pb-4 space-y-3">
          {comments.map(c => (
            <div key={c.id} className="flex gap-2 group">
              <div className="w-6 h-6 rounded-full bg-slate-700 overflow-hidden shrink-0 flex items-center justify-center text-xs font-bold text-slate-300 uppercase">
                {c.profiles?.avatar_url
                  ? <img src={c.profiles.avatar_url} alt={c.profiles.username} className="w-full h-full object-cover" />
                  : c.profiles?.username?.[0] ?? '?'
                }
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
                      className="text-slate-500 hover:text-red-400 transition"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {showEmojiComment && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowEmojiComment(false)} />
              <div className="relative z-50">
                <EmojiPicker
                  onEmojiClick={(e) => {
                    setComment(prev => prev + e.emoji)
                    commentInputRef.current?.focus()
                  }}
                  theme={'dark' as any}
                  skinTonesDisabled
                  searchDisabled
                  height={220}
                  width="100%"
                  lazyLoadEmojis
                />
              </div>
            </>
          )}
          <form onSubmit={handleComment} className="flex gap-2">
            <div className="w-6 h-6 rounded-full bg-slate-700 overflow-hidden shrink-0 flex items-center justify-center text-xs font-bold text-slate-300 uppercase">
              {userAvatarUrl
                ? <img src={userAvatarUrl} alt="" className="w-full h-full object-cover" />
                : userId[0]
              }
            </div>
            <div className="flex-1 flex gap-1.5 items-center">
              <button
                type="button"
                onClick={() => setShowEmojiComment(v => !v)}
                className={`p-1 rounded-lg transition shrink-0 ${showEmojiComment ? 'text-yellow-400' : 'text-slate-500 hover:text-yellow-400'}`}
              >
                <Smile className="w-4 h-4" />
              </button>
              <input
                ref={commentInputRef}
                type="text"
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Di lo que pensás..."
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

      {/* Modal de reactores — mobile */}
      {reactorsModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-4 pb-6 sm:pb-0"
          onClick={() => setReactorsModal(null)}
        >
          <div
            className="bg-slate-800 rounded-2xl p-5 w-full max-w-xs shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-center text-2xl mb-3">{reactorsModal.emoji}</p>
            <div className="space-y-2">
              {reactorsModal.users.map(u => (
                <p key={u} className="text-sm text-slate-200 text-center font-medium">@{u}</p>
              ))}
            </div>
            <button
              onClick={() => setReactorsModal(null)}
              className="mt-4 w-full py-2 rounded-xl bg-slate-700 text-slate-300 text-sm font-semibold hover:bg-slate-600 transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
