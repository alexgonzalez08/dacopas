'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ImageIcon, X, Send, Loader2, Globe, Lock, ChevronDown } from 'lucide-react'

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
  const [visibility, setVisibility] = useState<'leagues' | 'league'>('leagues')
  const [selectedLeague, setSelectedLeague] = useState<string>(leagues[0]?.id ?? '')
  const [showVisibility, setShowVisibility] = useState(false)
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
        const { data: { publicUrl } } = supabase.storage.from('post-images').getPublicUrl(path)
        image_url = publicUrl
      }

      const { data, error: insertError } = await supabase
        .from('user_posts')
        .insert({
          user_id: userId,
          content: content.trim() || null,
          image_url,
          visibility,
          league_id: visibility === 'league' ? selectedLeague : null,
        })
        .select('*, profiles(username, full_name, avatar_url), post_reactions(id, emoji, user_id), post_comments(id, content, user_id, created_at, profiles(username, full_name, avatar_url))')
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
  const visibilityLabel = visibility === 'leagues'
    ? 'Todos mis torneos'
    : (leagues.find(l => l.id === selectedLeague)?.name ?? 'Torneo específico')

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
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="¿Qué estás pensando?"
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

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-slate-700 gap-2">

        {/* Izquierda: foto + visibilidad + contador */}
        <div className="flex items-center gap-1 min-w-0">
          {/* Foto */}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="p-1.5 text-slate-400 hover:text-yellow-400 hover:bg-slate-700 rounded-lg transition shrink-0"
            title="Agregar foto"
          >
            <ImageIcon className="w-4 h-4" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />

          {/* Visibilidad */}
          {leagues.length > 0 && (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setShowVisibility(v => !v)}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-white hover:bg-slate-700 transition p-1.5 rounded-lg"
              >
                {visibility === 'leagues'
                  ? <Globe className="w-3.5 h-3.5 shrink-0" />
                  : <Lock className="w-3.5 h-3.5 shrink-0" />
                }
                <span className="hidden sm:block max-w-20 truncate">{visibilityLabel}</span>
                <ChevronDown className="w-3 h-3 shrink-0" />
              </button>
              {showVisibility && (
                <div className="absolute bottom-full mb-1 left-0 bg-slate-700 rounded-xl shadow-xl z-20 overflow-hidden w-52">
                  <button
                    type="button"
                    onClick={() => { setVisibility('leagues'); setShowVisibility(false) }}
                    className={`flex items-center gap-2 w-full px-3 py-2.5 text-sm hover:bg-slate-600 transition ${visibility === 'leagues' ? 'text-yellow-400' : 'text-slate-200'}`}
                  >
                    <Globe className="w-4 h-4 shrink-0" />
                    <div className="text-left min-w-0">
                      <p className="font-medium">Todos mis torneos</p>
                      <p className="text-xs text-slate-400">Visible para todos</p>
                    </div>
                  </button>
                  {leagues.map(league => (
                    <button
                      key={league.id}
                      type="button"
                      onClick={() => { setVisibility('league'); setSelectedLeague(league.id); setShowVisibility(false) }}
                      className={`flex items-center gap-2 w-full px-3 py-2.5 text-sm hover:bg-slate-600 transition ${visibility === 'league' && selectedLeague === league.id ? 'text-yellow-400' : 'text-slate-200'}`}
                    >
                      <Lock className="w-4 h-4 shrink-0" />
                      <div className="text-left min-w-0">
                        <p className="font-medium truncate">{league.name}</p>
                        <p className="text-xs text-slate-400">Solo este torneo</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {content.length > 0 && (
            <span className="text-xs text-slate-500 shrink-0">{content.length}/500</span>
          )}
        </div>

        {/* Derecha: botón publicar */}
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
