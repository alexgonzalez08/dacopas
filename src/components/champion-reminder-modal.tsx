'use client'
import { useState } from 'react'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ChampionReminderModal({
  userId,
  autoOpen,
}: {
  userId: string
  autoOpen: boolean
}) {
  const [open, setOpen] = useState(autoOpen)

  function handleClose() {
    setOpen(false)
    const supabase = createClient()
    supabase.from('profiles').update({ champion_reminder_seen: true }).eq('id', userId).then()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <span className="text-yellow-400 font-bold text-sm">Recordatorio</span>
          <button onClick={handleClose} className="text-slate-500 hover:text-white transition p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido */}
        <div className="px-5 py-6 space-y-4">
          <div className="text-5xl text-center">🏆</div>
          <h2 className="text-xl font-bold text-white text-center">¡Elegí a tu campeón!</h2>
          <p className="text-sm text-slate-300 leading-relaxed text-center">
            Mañana arranca la semifinal del Mundial. Si todavía no predijiste quién se corona campeón, hacelo antes de que empiece el primer partido de semifinal — una vez que arranque, no vas a poder cambiar tu predicción.
          </p>
        </div>

        {/* Acciones */}
        <div className="px-5 pb-5">
          <button
            onClick={handleClose}
            className="w-full py-2.5 text-sm font-semibold text-slate-900 bg-yellow-500 hover:bg-yellow-400 rounded-xl transition"
          >
            ¡Dale, voy a predecir!
          </button>
        </div>
      </div>
    </div>
  )
}
