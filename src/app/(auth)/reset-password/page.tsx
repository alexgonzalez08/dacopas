'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Trophy } from 'lucide-react'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    // PKCE flow: sesión ya establecida por /auth/callback
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })
    // Fallback para flow legacy con hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/dashboard')
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <Trophy className="w-10 h-10 text-yellow-400" />
        </div>
        <h1 className="text-2xl font-bold text-center mb-6">Nueva contraseña</h1>

        {!ready ? (
          <p className="text-slate-400 text-sm text-center">Verificando link...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Nueva contraseña</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:outline-none focus:border-yellow-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Confirmar contraseña</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
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
              {loading ? 'Guardando...' : 'Guardar contraseña'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
