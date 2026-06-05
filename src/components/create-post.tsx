'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Image as ImageIcon, X, Send, Loader2 } from 'lucide-react'

export default function CreatePost({
  userId,
  username,
  avatarUrl,
  onPost,
}: {
  userId: string
  username: string
  avatarUrl?: string | null
  onPost: (post: any) => void
}) {
  const [content, setContent] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

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
        const { data: { publicUrl } } = supabase.storage
          .from('post-images')
          .getPublicUrl(path)
        image_url = publicUrl
      }

      const { data, error: insertError } = await supabase
        .from('user_posts')
        .insert({ user_id: userId, content: content.trim() || null, image_url })
        .select('*, profiles(username), post_reactions(id, emoji, user_id), post_comments(id, content, user_id, created_at, profiles(username))')
        .single()

      if (insertError) throw insertError

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
    <form onSubmit={handleSubmit} className="bg-slate-800 rounded-2xl p-4 space-y-3">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-700 shrink-0 flex items-center justify-center text-sm font-bold text-slate-300 uppercase">
          {avatarUrl
            ? <img src={avatarUrl} alt={username} className="w-full h-full object-cover" />
            : username[0]
          }
        </div>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="¿Qué estás pensando?"
          maxLength={500}
          rows={2}
          className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 resize-none focus:outline-none"
        />
      </div>

      {/* Preview imagen */}
      {preview && (
        <div className="relative rounded-xl overflow-hidden">
          <img src={preview} alt="preview" className="w-full max-h-64 object-cover" />
          <button
            type="button"
            onClick={removeImage}
            className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 transition"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-700">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-yellow-400 transition px-2 py-1.5 rounded-lg hover:bg-slate-700"
          >
            <ImageIcon className="w-4 h-4" /> Foto
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImage}
          />
          {content.length > 0 && (
            <span className="text-xs text-slate-500">{content.length}/500</span>
          )}
        </div>
        <button
          type="submit"
          disabled={!canPost}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-yellow-500 text-slate-900 text-sm font-semibold rounded-xl hover:bg-yellow-400 disabled:opacity-40 transition"
        >
          {loading
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Publicando...</>
            : <><Send className="w-3.5 h-3.5" /> Publicar</>
          }
        </button>
      </div>
    </form>
  )
}
