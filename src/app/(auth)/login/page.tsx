'use client'
import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      const msg = error.message.includes('Invalid login credentials')
        ? 'Email o contraseña incorrectos.'
        : error.message.includes('Email not confirmed')
        ? 'Confirmá tu email antes de ingresar. Revisá tu bandeja de entrada.'
        : error.message
      setError(msg)
      setLoading(false)
      return
    }
    router.push(next ?? '/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-slate-400 mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          placeholder="tu@email.com"
          className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:outline-none focus:border-yellow-500 placeholder-slate-600"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm text-slate-400">Contraseña</label>
          <Link href="/forgot-password" className="text-xs text-yellow-400 hover:underline">¿Olvidaste tu contraseña?</Link>
        </div>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            placeholder="Tu contraseña"
            className="w-full px-4 py-2 pr-10 rounded-lg bg-slate-800 border border-slate-700 focus:outline-none focus:border-yellow-500 placeholder-slate-600"
          />
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-yellow-500 text-slate-900 font-semibold rounded-lg hover:bg-yellow-400 disabled:opacity-50 transition flex items-center justify-center gap-2"
      >
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Ingresando...</> : 'Ingresar'}
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
        <div className="flex justify-center mb-4">
          <img src="/logo.png" alt="Dacopas" className="w-14 h-14 object-contain" />
        </div>
        <h1 className="text-2xl font-bold text-center mb-1">Iniciar sesión</h1>
        <p className="text-sm text-slate-500 text-center mb-6">Ingresá con el email con el que te registraste</p>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  )
}
