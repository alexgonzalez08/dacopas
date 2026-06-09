'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Check, X, Loader2 } from 'lucide-react'

function PasswordStrength({ password }: { password: string }) {
  const rules = [
    { label: 'Mínimo 8 caracteres', ok: password.length >= 8 },
    { label: 'Al menos una mayúscula', ok: /[A-Z]/.test(password) },
    { label: 'Al menos un número', ok: /[0-9]/.test(password) },
  ]
  if (!password) return null
  return (
    <ul className="mt-2 space-y-1">
      {rules.map(r => (
        <li key={r.label} className={`flex items-center gap-1.5 text-xs ${r.ok ? 'text-green-400' : 'text-slate-500'}`}>
          {r.ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
          {r.label}
        </li>
      ))}
    </ul>
  )
}

function isPasswordValid(p: string) {
  return p.length >= 8 && /[A-Z]/.test(p) && /[0-9]/.test(p)
}

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) router.replace('/forgot-password')
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isPasswordValid(password)) { setError('La contraseña no cumple los requisitos mínimos.'); return }
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return }
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Error al actualizar contraseña'); setLoading(false); return }
    setDone(true)
    setTimeout(() => router.replace('/login'), 2500)
  }

  if (!token) return null

  return (
    <>
      {done ? (
        <div className="text-center space-y-4 mt-6">
          <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
            <span className="text-2xl">✅</span>
          </div>
          <p className="text-slate-300">¡Contraseña actualizada! Redirigiendo al login...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Nueva contraseña</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="Mín. 8 caracteres"
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
            <PasswordStrength password={password} />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Confirmar contraseña</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                placeholder="Repetí tu contraseña"
                className="w-full px-4 py-2 pr-10 rounded-lg bg-slate-800 border border-slate-700 focus:outline-none focus:border-yellow-500 placeholder-slate-600"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirm && password !== confirm && (
              <p className="text-xs text-red-400 mt-1 flex items-center gap-1"><X className="w-3 h-3" /> Las contraseñas no coinciden</p>
            )}
            {confirm && password === confirm && isPasswordValid(password) && (
              <p className="text-xs text-green-400 mt-1 flex items-center gap-1"><Check className="w-3 h-3" /> Las contraseñas coinciden</p>
            )}
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              <p className="text-red-400 text-sm">{error}</p>
              {error.includes('expiró') && (
                <Link href="/forgot-password" className="text-yellow-400 hover:underline text-xs mt-1 block">
                  Solicitar nuevo link
                </Link>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !isPasswordValid(password) || password !== confirm}
            className="w-full py-3 bg-yellow-500 text-slate-900 font-semibold rounded-lg hover:bg-yellow-400 disabled:opacity-50 transition flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : 'Guardar contraseña'}
          </button>
        </form>
      )}
    </>
  )
}

export default function ResetPasswordPage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <img src="/logo.png" alt="Dacopas" className="w-14 h-14 object-contain" />
        </div>
        <h1 className="text-2xl font-bold text-center mb-6">Nueva contraseña</h1>
        <Suspense fallback={<p className="text-slate-400 text-sm text-center">Cargando...</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  )
}
