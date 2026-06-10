'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ImageIcon, X, Send, Loader2, Smile } from 'lucide-react'
import { sendPushNotification } from '@/lib/push'
import dynamic from 'next/dynamic'

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false })

type League = { id: string; name: string }

export default function CreatePost({
  userId,
  username,
  avatarUrl,
  leagues = [],
  onPost,
}: {
  userId: string
  username: string
  avatarUrl?: string | null
  leagues?: League[]
  onPost: (post: any) => void
}) {
  const [content, setContent] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('La imagen no puede superar 5MB'); return }
    setImage(file)
    setPreview(URL.createObjectURL(file))
    setError('')
  }

  function removeImage() {
    setImage(null)
    setPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim() && !image) return
    setLoading(true)
    setError('')
    const supabase = createClient()

    try {
      let image_url: string | null = null

      if (image) {
        const ext = image.name.split('.').pop()
        const path = `${userId}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(path, image, { upsert: true })
        if (uploadError) throw uploadError
        const { data: { publicUrl } } = supabase.storage.from('post-images').getPublicUrl(path)
        image_url = publicUrl
      }

      const { data, error: insertError } = await supabase
        .from('user_posts')
        .insert({
          user_id: userId,
          content: content.trim() || null,
          image_url,
          visibility: 'leagues',
          league_id: null,
        })
        .select('*, profiles(username, full_name, avatar_url), post_reactions(id, emoji, user_id), post_comments(id, content, user_id, created_at, profiles(username, full_name, avatar_url))')
        .single()

      if (insertError) throw insertError

      // Notificar a amigos del nuevo post
      const { data: friendships } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)

      const friendIds = (friendships ?? []).map(f =>
        f.requester_id === userId ? f.addressee_id : f.requester_id
      )

      if (friendIds.length > 0) {
        await Promise.all(friendIds.map(friendId =>
          supabase.from('notifications').insert({
            user_id: friendId,
            from_user_id: userId,
            type: 'friend_post',
            metadata: { post_id: data.id, author_username: username, preview: content.trim().slice(0, 80) || null },
          })
        ))
        friendIds.forEach(friendId => sendPushNotification({
          toUserId: friendId,
          title: `📝 @${username} publicó algo`,
          body: content.trim() ? content.trim().slice(0, 80) : '📷 Compartió una foto',
          data: { url: '/dashboard' },
        }))
      }

      onPost(data)
      setContent('')
      removeImage()
    } catch (err: any) {
      setError(err.message ?? 'Error al publicar')
    } finally {
      setLoading(false)
    }
  }

  const canPost = (content.trim().length > 0 || image !== null) && !loading

  return (
    <form onSubmit={handleSubmit} className="bg-slate-800 rounded-2xl">
      {/* Área de escritura */}
      <div className="flex gap-3 p-4 pb-2">
        <div
          style={{ width: 36, height: 36, minWidth: 36 }}
          className="rounded-full overflow-hidden bg-slate-700 shrink-0 flex items-center justify-center text-sm font-bold text-slate-300 uppercase"
        >
          {avatarUrl
            ? <img src={avatarUrl} alt={username} className="w-full h-full object-cover" />
            : username[0]
          }
        </div>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="¿Qué frase histórica tenés?"
          maxLength={500}
          rows={2}
          className="flex-1 min-w-0 bg-transparent text-sm text-slate-200 placeholder-slate-500 resize-none focus:outline-none pt-1"
        />
      </div>

      {/* Preview imagen */}
      {preview && (
        <div className="relative mx-4 mb-3 rounded-xl overflow-hidden">
          <img src={preview} alt="preview" className="w-full max-h-56 object-cover" />
          <button
            type="button"
            onClick={removeImage}
            className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 transition"
          >
            <X className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-400 px-4 pb-2">{error}</p>}

      {/* Emoji picker */}
      {showEmoji && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowEmoji(false)} />
          <div className="px-4 pb-2 relative z-50">
            <EmojiPicker
              onEmojiClick={(e) => {
                setContent(prev => prev + e.emoji)
                textareaRef.current?.focus()
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

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-slate-700 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="p-1.5 text-slate-400 hover:text-yellow-400 hover:bg-slate-700 rounded-lg transition shrink-0"
            title="Agregar foto"
          >
            <ImageIcon className="w-4 h-4" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
          <button
            type="button"
            onClick={() => setShowEmoji(v => !v)}
            className={`p-1.5 rounded-lg transition shrink-0 ${showEmoji ? 'text-yellow-400 bg-slate-700' : 'text-slate-400 hover:text-yellow-400 hover:bg-slate-700'}`}
            title="Emojis"
          >
            <Smile className="w-4 h-4" />
          </button>

          {content.length > 0 && (
            <span className="text-xs text-slate-500 shrink-0">{content.length}/500</span>
          )}
        </div>

        <button
          type="submit"
          disabled={!canPost}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500 text-slate-900 text-xs font-semibold rounded-lg hover:bg-yellow-400 disabled:opacity-40 transition"
        >
          {loading
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Send className="w-3.5 h-3.5" />
          }
          {loading ? 'Publicando...' : 'Publicar'}
        </button>
      </div>
    </form>
  )
}
