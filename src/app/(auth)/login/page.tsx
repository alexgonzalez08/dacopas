'use client'
import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'


function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push(next ?? '/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-slate-400 mb-1">Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
          className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:outline-none focus:border-yellow-500" />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm text-slate-400">Contraseña</label>
          <Link href="/forgot-password" className="text-xs text-yellow-400 hover:underline">¿Olvidaste tu contraseña?</Link>
        </div>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
          className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:outline-none focus:border-yellow-500" />
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button type="submit" disabled={loading}
        className="w-full py-3 bg-yellow-500 text-slate-900 font-semibold rounded-lg hover:bg-yellow-400 disabled:opacity-50 transition">
        {loading ? 'Ingresando...' : 'Ingresar'}
      </button>
      <p className="text-center text-slate-400 text-sm">
        ¿No tenés cuenta?{' '}
        <Link href={next ? `/register?next=${encodeURIComponent(next)}` : '/register'} className="text-yellow-400 hover:underline">Registrarse</Link>
      </p>
    </form>
  )
}

export default function LoginPage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <img src="/logo.png" alt="Dacopas" className="w-14 h-14 object-contain" />
        </div>
        <h1 className="text-2xl font-bold text-center mb-6">Iniciar sesión</h1>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  )
}
