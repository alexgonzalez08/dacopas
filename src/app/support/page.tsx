'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MessageSquareWarning, Send, CheckCircle2 } from 'lucide-react'
import BackButton from '@/components/back-button'

const SUBJECTS = [
  'Error en predicciones',
  'Problema con notificaciones',
  'Problema con mi cuenta',
  'El marcador no se actualizó',
  'Error en puntos de mi liga',
  'Otro problema',
]

export default function SupportPage() {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [username, setUsername] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setEmail(user.email ?? '')
      const { data } = await supabase.from('profiles').select('username').eq('id', user.id).single()
      setUsername(data?.username ?? null)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!subject || !message || !email) return
    setLoading(true)
    setError('')

    const res = await fetch('/api/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, subject, message, username }),
    })

    if (!res.ok) {
      setError('No se pudo enviar el reporte. Intentá de nuevo.')
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="max-w-lg mx-auto pt-12 px-4 text-center space-y-4">
        <CheckCircle2 className="w-14 h-14 text-green-400 mx-auto" />
        <h1 className="text-xl font-bold text-white">¡Reporte enviado!</h1>
        <p className="text-slate-400 text-sm">Recibimos tu mensaje. Te responderemos a <span className="text-white">{email}</span> a la brevedad.</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-6 pb-8 px-4 pt-6">
      <BackButton />
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
          <MessageSquareWarning className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Reportar problema</h1>
          <p className="text-sm text-slate-400">Te respondemos a la brevedad</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-slate-800 rounded-2xl p-5 space-y-4">
          <div>
            <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1.5 block">
              Email de contacto
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-yellow-500"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1.5 block">
              Tipo de problema
            </label>
            <select
              value={subject}
              onChange={e => setSubject(e.target.value)}
              required
              className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500"
            >
              <option value="" disabled>Seleccioná una opción</option>
              {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1.5 block">
              Descripción
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Describí el problema con el mayor detalle posible..."
              required
              rows={5}
              className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-yellow-500 resize-none"
            />
          </div>
        </div>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        <button
          type="submit"
          disabled={loading || !subject || !message || !email}
          className="w-full flex items-center justify-center gap-2 py-3 bg-yellow-500 text-slate-900 font-semibold rounded-xl hover:bg-yellow-400 disabled:opacity-50 transition"
        >
          {loading
            ? <span className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
            : <><Send className="w-4 h-4" /> Enviar reporte</>
          }
        </button>
      </form>
    </div>
  )
}
