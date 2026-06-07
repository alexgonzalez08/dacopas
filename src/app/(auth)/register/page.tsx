'use client'
import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Trophy, Camera, Loader2 } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next')
  const [alias, setAlias] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const avatarRef = useRef<HTMLInputElement>(null)

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()

    // 1. Crear cuenta
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username: alias, full_name: fullName || null } }
    })

    if (signUpError) {
      const msg = signUpError.message.includes('profiles_username_key') || signUpError.message.includes('unique')
        ? 'Ese alias ya está en uso, elegí otro.'
        : signUpError.message
      setError(msg)
      setLoading(false)
      return
    }

    const userId = data.user?.id
    if (!userId) { setLoading(false); return }

    // 2. Actualizar full_name si se ingresó
    if (fullName.trim()) {
      await supabase.from('profiles').update({ full_name: fullName.trim() }).eq('id', userId)
    }

    // 3. Subir foto si se seleccionó
    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop()
      const path = `${userId}/avatar.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, avatarFile, { upsert: true })
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
        await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId)
      }
    }

    router.push(next ?? '/dashboard')
    router.refresh()
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <Trophy className="w-10 h-10 text-yellow-400" />
        </div>
        <h1 className="text-2xl font-bold text-center mb-6">Crear cuenta</h1>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Foto de perfil */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => avatarRef.current?.click()}
              className="relative w-20 h-20 rounded-full bg-slate-800 border-2 border-slate-700 hover:border-yellow-500 overflow-hidden flex items-center justify-center transition group"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <Camera className="w-7 h-7 text-slate-500 group-hover:text-yellow-400 transition" />
              )}
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                <Camera className="w-5 h-5 text-white" />
              </div>
            </button>
            <span className="text-xs text-slate-500">Foto de perfil <span className="text-slate-600">(opcional)</span></span>
            <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>

          {/* Nombre completo */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">
              Nombre <span className="text-slate-600 text-xs">(opcional)</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              maxLength={50}
              placeholder="ej: Juan García"
              className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:outline-none focus:border-yellow-500"
            />
          </div>

          {/* Alias */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">
              Alias <span className="text-slate-500 text-xs">(único, visible en los torneos)</span>
            </label>
            <input
              type="text"
              value={alias}
              onChange={e => setAlias(e.target.value.replace(/\s+/g, '_'))}
              required
              minLength={3}
              maxLength={20}
              placeholder="ej: el_pibe_10"
              className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:outline-none focus:border-yellow-500"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:outline-none focus:border-yellow-500"
            />
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:outline-none focus:border-yellow-500"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-yellow-500 text-slate-900 font-semibold rounded-lg hover:bg-yellow-400 disabled:opacity-50 transition flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creando cuenta...</> : 'Registrarse'}
          </button>
        </form>

        <p className="text-center text-slate-400 mt-4 text-sm">
          ¿Ya tenés cuenta?{' '}
          <Link href="/login" className="text-yellow-400 hover:underline">Iniciar sesión</Link>
        </p>
      </div>
    </main>
  )
}
