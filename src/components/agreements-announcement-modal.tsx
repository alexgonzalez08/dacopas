'use client'
import { useState, useEffect } from 'react'
import { X, FileText } from 'lucide-react'

const LS_KEY = 'agreements_announcement_seen'

export default function AgreementsAnnouncementModal({ leaguesInfoSeen }: { leaguesInfoSeen: boolean }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!leaguesInfoSeen) return
    if (localStorage.getItem(LS_KEY)) return
    setOpen(true)
  }, [leaguesInfoSeen])

  function handleClose() {
    localStorage.setItem(LS_KEY, '1')
    setOpen(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <span className="text-yellow-400 font-bold text-sm">¡Novedad!</span>
          <button onClick={handleClose} className="text-slate-500 hover:text-white transition p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido */}
        <div className="px-5 py-6 space-y-4 text-center">
          <div className="text-5xl">📄</div>
          <h2 className="text-xl font-bold text-white">Llegaron los Acuerdos</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Ya podés formalizar los premios y reglas que acordaron en la mesa de discusión.
            El admin crea el acuerdo, todos los miembros lo firman y queda registrado para siempre.
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-slate-400 bg-slate-800 rounded-xl px-4 py-3">
            <FileText className="w-4 h-4 text-yellow-400 shrink-0" />
            <span>Revisá la pestaña <span className="text-yellow-400 font-semibold">Acuerdos</span> en tus torneos</span>
          </div>
        </div>

        {/* Acción */}
        <div className="px-5 pb-5">
          <button
            onClick={handleClose}
            className="w-full py-2.5 text-sm font-semibold text-slate-900 bg-yellow-500 hover:bg-yellow-400 rounded-xl transition"
          >
            ¡Entendido!
          </button>
        </div>
      </div>
    </div>
  )
}
