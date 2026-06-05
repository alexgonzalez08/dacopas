'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Camera, Check, Pencil, X, Loader2 } from 'lucide-react'
import CreatePost from '@/components/create-post'
import UserPostCard from '@/components/user-post-card'

type Profile = {
  id: string
  username: string
  full_name: string | null
  bio: string | null
  avatar_url: string | null
  created_at: string
}

type Post = {
  id: string
  user_id: string
  content: string | null
  image_url: string | null
  created_at: string
  profiles?: { username: string; avatar_url: string | null } | null
  post_reactions?: { id: string; emoji: string; user_id: string }[]
  post_comments?: { id: string; content: string; user_id: string; created_at: string; profiles?: { username: string } }[]
}

export default function ProfileClient({
  profile,
  userId,
  initialPosts,
  leagues = [],
}: {
  profile: Profile
  userId: string
  initialPosts: Post[]
  leagues?: { id: string; name: string }[]
}) {
  const [username, setUsername] = useState(profile.username)
  const [fullName, setFullName] = useState(profile.full_name ?? '')
  const [bio, setBio] = useState(profile.bio ?? '')
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const avatarRef = useRef<HTMLInputElement>(null)

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 3 * 1024 * 1024) { setError('La imagen no puede superar 3MB'); return }
    setUploadingAvatar(true)
    setError('')
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `${userId}/avatar.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })
    if (uploadError) { setError(uploadError.message); setUploadingAvatar(false); return }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId)
    setAvatarUrl(publicUrl + '?t=' + Date.now())
    setUploadingAvatar(false)
  }

  async function handleSave() {
    if (!username.trim()) { setError('El alias no puede estar vacío'); return }
    setSaving(true)
    setError('')
    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ username: username.trim(), full_name: fullName.trim() || null, bio: bio.trim() || null })
      .eq('id', userId)
    if (updateError) {
      setError(updateError.message.includes('unique') ? 'Ese alias ya está en uso' : updateError.message)
      setSaving(false)
      return
    }
    setSaved(true)
    setEditing(false)
    setSaving(false)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleNewPost(post: any) {
    setPosts(prev => [{ ...post }, ...prev])
  }

  function handleDeletePost(id: string) {
    setPosts(prev => prev.filter(p => p.id !== id))
  }

  const joinedYear = new Date(profile.created_at).getFullYear()
  const displayName = fullName || username

  return (
    <div className="space-y-6 max-w-xl mx-auto">

      {/* Tarjeta de perfil */}
      <div className="bg-slate-800 rounded-2xl">
        {/* Banner */}
        <div className="h-24 rounded-t-2xl bg-gradient-to-r from-yellow-500/30 via-slate-700 to-slate-800" />

        {/* Avatar + info */}
        <div className="px-5 pb-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-4 -mt-10">
            {/* Avatar — fuera del flujo del banner */}
            <div className="relative w-20 h-20 shrink-0">
              <div className="w-20 h-20 rounded-full border-4 border-slate-800 overflow-hidden bg-slate-700 flex items-center justify-center">
                {uploadingAvatar ? (
                  <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                ) : avatarUrl ? (
                  <img src={avatarUrl} alt={username} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-slate-300 uppercase">{username[0]}</span>
                )}
              </div>
              <button
                onClick={() => avatarRef.current?.click()}
                className="absolute bottom-0 right-0 z-10 w-7 h-7 bg-yellow-500 rounded-full flex items-center justify-center hover:bg-yellow-400 transition shadow-lg border-2 border-slate-800"
              >
                <Camera className="w-3.5 h-3.5 text-slate-900" />
              </button>
              <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>

            {/* Botón editar / guardar */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              {editing ? (
                <>
                  <button
                    onClick={() => { setEditing(false); setUsername(profile.username); setBio(profile.bio ?? '') }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-400 hover:text-white border border-slate-600 rounded-xl transition"
                  >
                    <X className="w-3.5 h-3.5" /> Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-yellow-500 text-slate-900 font-semibold rounded-xl hover:bg-yellow-400 disabled:opacity-50 transition"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Guardar
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-slate-600 text-slate-300 hover:text-white rounded-xl hover:bg-slate-700 transition"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  {saved ? '✓ Guardado' : 'Editar perfil'}
                </button>
              )}
            </div>
          </div>

          {/* Datos */}
          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Nombre</label>
                <input
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  maxLength={50}
                  placeholder="Tu nombre real (opcional)"
                  className="w-full bg-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500 text-white"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Alias <span className="text-slate-500">(único)</span></label>
                <input
                  value={username}
                  onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                  maxLength={20}
                  className="w-full bg-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500 text-white"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Bio <span className="text-slate-500">({bio.length}/160)</span></label>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  maxLength={160}
                  rows={2}
                  placeholder="Contá algo sobre vos..."
                  className="w-full bg-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500 text-white resize-none"
                />
              </div>
              {error && <p className="text-xs text-red-400">{error}</p>}
            </div>
          ) : (
            <div>
              <h1 className="text-xl font-bold text-white">{displayName}</h1>
              {fullName && <p className="text-sm text-slate-400">@{username}</p>}
              {bio && <p className="text-sm text-slate-300 mt-1">{bio}</p>}
              <p className="text-xs text-slate-500 mt-2">⚽ Miembro desde {joinedYear}</p>
              <p className="text-xs text-slate-500 mt-0.5">📝 {posts.length} {posts.length === 1 ? 'publicación' : 'publicaciones'}</p>
            </div>
          )}
        </div>
      </div>

      {/* Crear post */}
      <CreatePost userId={userId} username={username} avatarUrl={avatarUrl} leagues={leagues} onPost={handleNewPost} />

      {/* Posts del usuario */}
      {posts.length === 0 ? (
        <div className="text-center py-10 text-slate-500">
          <p className="text-3xl mb-2">📝</p>
          <p className="text-sm">Todavía no publicaste nada. ¡Escribí tu primer post!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(post => (
            <UserPostCard
              key={post.id}
              post={post as any}
              userId={userId}
              onDelete={handleDeletePost}
            />
          ))}
        </div>
      )}
    </div>
  )
}
