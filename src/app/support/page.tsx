'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MessageSquareWarning, Send, CheckCircle2, ImagePlus, X } from 'lucide-react'
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
  const router = useRouter()
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [username, setUsername] = useState<string | null>(null)
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const imageRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setEmail(user.email ?? '')
      const { data } = await supabase.from('profiles').select('username').eq('id', user.id).single()
      setUsername(data?.username ?? null)
    })
  }, [])

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('La imagen no puede superar 5MB'); return }
    setImage(file)
    setImagePreview(URL.createObjectURL(file))
    setError('')
  }

  function removeImage() {
    setImage(null)
    setImagePreview(null)
    if (imageRef.current) imageRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!subject || !message || !email) return
    setLoading(true)
    setError('')

    const formData = new FormData()
    formData.append('email', email)
    formData.append('subject', subject)
    formData.append('message', message)
    if (username) formData.append('username', username)
    if (image) formData.append('image', image)

    const res = await fetch('/api/support', {
      method: 'POST',
      body: formData,
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
        <p className="text-slate-400 text-sm">Recibimos tu mensaje. Te responderemos a la brevedad desde <span className="text-white">alex@dacopas.com</span>.</p>
        <button
          onClick={() => router.back()}
          className="mt-4 px-6 py-2.5 bg-slate-700 text-slate-300 text-sm font-semibold rounded-xl hover:bg-slate-600 transition"
        >
          Volver
        </button>
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

          {/* Imagen opcional */}
          <div>
            <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1.5 block">
              Captura de pantalla <span className="text-slate-500 normal-case font-normal">(opcional)</span>
            </label>
            <p className="text-xs text-slate-500 mb-2.5">
              Una imagen vale más que mil palabras. Si podés adjuntar una captura de la pantalla donde ocurre el problema, nos ayudará a resolverlo mucho más rápido.
            </p>
            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Vista previa"
                  className="w-full max-h-48 object-contain rounded-xl bg-slate-900 border border-slate-600"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 w-7 h-7 bg-slate-800/80 text-slate-300 hover:text-white rounded-full flex items-center justify-center transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => imageRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-slate-600 rounded-xl text-sm text-slate-400 hover:text-slate-200 hover:border-slate-400 transition"
              >
                <ImagePlus className="w-4 h-4" />
                Adjuntar imagen (PNG, JPG — máx 5MB)
              </button>
            )}
            <input
              ref={imageRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={handleImageChange}
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
