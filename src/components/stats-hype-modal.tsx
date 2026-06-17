'use client'
import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

const LS_KEY = 'stats_hype_modal_seen_v1'

export default function StatsHypeModal() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(LS_KEY)) return
    const t = setTimeout(() => setOpen(true), 800)
    return () => clearTimeout(t)
  }, [])

  function handleClose() {
    localStorage.setItem(LS_KEY, '1')
    setOpen(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm px-4 pb-6 sm:pb-0">
      <div className="w-full max-w-sm bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-yellow-400 font-bold text-sm">Dacopas</span>
            <span className="text-slate-600 text-xs">·</span>
            <span className="text-slate-500 text-xs">Primera Jornada</span>
          </div>
          <button onClick={handleClose} className="text-slate-500 hover:text-white transition p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido */}
        <div className="px-5 py-6 space-y-4 text-center">
          <div className="text-5xl">📊</div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white leading-snug">
              Mañana llegan las estadísticas<br />
              <span className="text-yellow-400">de la primera jornada</span>
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Una jornada que estuvo llena de sorpresas, goleadas inesperadas y algún que otro resultado que nadie vio venir.
            </p>
          </div>

          <div className="bg-slate-800 rounded-xl px-4 py-4 space-y-3 text-left">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider text-center">Lo que se viene</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <span className="text-lg shrink-0">🏆</span>
                <p className="text-sm text-slate-300">¿Quién acumuló más puntos en un solo torneo?</p>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-lg shrink-0">🎯</span>
                <p className="text-sm text-slate-300">¿Quién clavó más resultados exactos?</p>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-lg shrink-0">🤯</span>
                <p className="text-sm text-slate-300">¿Qué partido nadie pudo adivinar?</p>
              </div>
            </div>
          </div>

          <p className="text-sm text-slate-400 italic leading-relaxed">
            ¿Creés que estás en el top?<br />
            ¿O tus amistades saben más de fútbol que el abuelo que lleva 40 años viendo el deporte?
          </p>
        </div>

        {/* Acción */}
        <div className="px-5 pb-5">
          <button
            onClick={handleClose}
            className="w-full py-2.5 text-sm font-semibold text-slate-900 bg-yellow-500 hover:bg-yellow-400 rounded-xl transition"
          >
            Mañana lo vemos 👀
          </button>
        </div>
      </div>
    </div>
  )
}
