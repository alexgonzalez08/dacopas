'use client'
import { useState } from 'react'
import { X, Flag, Loader2 } from 'lucide-react'

const REASONS = [
  'Contenido inapropiado',
  'Acoso o bullying',
  'Spam',
  'Contenido falso o engañoso',
  'Lenguaje ofensivo',
  'Otro',
]

export default function ReportModal({
  type,
  targetId,
  onClose,
}: {
  type: 'user' | 'message' | 'post'
  targetId: string
  onClose: () => void
}) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const typeLabel = { user: 'usuario', message: 'mensaje', post: 'post' }[type]

  async function handleSubmit() {
    if (!reason) return
    setLoading(true)
    await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, targetId, reason }),
    })
    setLoading(false)
    setDone(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div className="bg-slate-800 rounded-2xl w-full max-w-sm p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-red-400" />
            <h2 className="font-semibold text-white">Reportar {typeLabel}</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {done ? (
          <div className="text-center py-4">
            <p className="text-green-400 font-semibold mb-1">Reporte enviado</p>
            <p className="text-slate-400 text-sm">Gracias por ayudarnos a mantener Dacopas seguro.</p>
            <button onClick={onClose} className="mt-4 px-4 py-2 bg-slate-700 rounded-lg text-sm hover:bg-slate-600 transition">
              Cerrar
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-400 mb-3">¿Por qué querés reportar este {typeLabel}?</p>
            <div className="space-y-2 mb-4">
              {REASONS.map(r => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition border ${
                    reason === r
                      ? 'border-red-500 bg-red-500/10 text-white'
                      : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <button
              onClick={handleSubmit}
              disabled={!reason || loading}
              className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg text-sm disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Enviando...</> : 'Enviar reporte'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
