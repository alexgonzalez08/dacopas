'use client'
import { useState } from 'react'
import Link from 'next/link'


export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Error al enviar email'); setLoading(false); return }
    setSent(true)
    setLoading(false)
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <img src="/logo.png" alt="Dacopas" className="w-14 h-14 object-contain" />
        </div>
        <h1 className="text-2xl font-bold text-center mb-2">Recuperar contraseña</h1>

        {sent ? (
          <div className="text-center space-y-4 mt-6">
            <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
              <span className="text-2xl">📧</span>
            </div>
            <p className="text-slate-300">
              Si <span className="text-yellow-400 font-medium">{email}</span> tiene una cuenta, te enviamos un link.
            </p>
            <p className="text-slate-400 text-sm">
              Revisá tu bandeja de entrada. El link expira en 1 hora.
            </p>
            <Link href="/login" className="block mt-4 text-yellow-400 hover:underline text-sm">
              Volver al login
            </Link>
          </div>
        ) : (
          <>
            <p className="text-slate-400 text-sm text-center mb-6">
              Ingresá tu email y te enviamos un link para restablecer tu contraseña.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
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
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-yellow-500 text-slate-900 font-semibold rounded-lg hover:bg-yellow-400 disabled:opacity-50 transition"
              >
                {loading ? 'Enviando...' : 'Enviar link'}
              </button>
            </form>
            <p className="text-center text-slate-400 mt-4 text-sm">
              <Link href="/login" className="text-yellow-400 hover:underline">Volver al login</Link>
            </p>
          </>
        )}
      </div>
    </main>
  )
}
