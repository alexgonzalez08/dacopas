'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Trophy } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [alias, setAlias] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username: alias } }
    })
    if (error) {
      const msg = error.message.includes('profiles_username_key') || error.message.includes('unique')
        ? 'Ese alias ya está en uso, elegí otro.'
        : error.message
      setError(msg)
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <Trophy className="w-10 h-10 text-yellow-400" />
        </div>
        <h1 className="text-2xl font-bold text-center mb-6">Crear cuenta</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">
              Alias <span className="text-slate-500 text-xs">(único, visible en las ligas)</span>
            </label>
            <input
              type="text"
              value={alias}
              onChange={e => setAlias(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
              required
              minLength={3}
              maxLength={20}
              placeholder="ej: el_pibe_10"
              className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:outline-none focus:border-yellow-500"
            />
          </div>
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
            className="w-full py-3 bg-yellow-500 text-slate-900 font-semibold rounded-lg hover:bg-yellow-400 disabled:opacity-50 transition"
          >
            {loading ? 'Creando cuenta...' : 'Registrarse'}
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
