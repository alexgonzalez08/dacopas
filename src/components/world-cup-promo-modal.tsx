'use client'
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

const STORAGE_KEY = 'world_cup_weekend_modal_v1'

export default function WorldCupPromoModal() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setVisible(true)
      }
    } catch {}
  }, [])

  function close() {
    try { localStorage.setItem(STORAGE_KEY, '1') } catch {}
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />
      <div className="relative w-full max-w-sm bg-slate-900 border border-yellow-500/30 rounded-3xl overflow-hidden shadow-2xl">
        {/* Banner superior */}
        <div className="bg-gradient-to-r from-yellow-600/30 via-yellow-500/20 to-slate-800 px-5 pt-5 pb-4 flex items-start gap-3">
          <span className="text-4xl leading-none">🌎</span>
          <div className="flex-1">
            <p className="text-xs text-yellow-400 font-semibold uppercase tracking-wider mb-1">Mundial 2026</p>
            <h2 className="text-lg font-bold text-white leading-tight">
              ¡Se viene el primer fin de semana mundialista!
            </h2>
          </div>
          <button onClick={close} className="text-slate-500 hover:text-white transition p-1 -mt-1 -mr-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-slate-300 leading-relaxed">
            Usá la <span className="text-yellow-400 font-semibold">mesa de discusión de tus torneos</span> para coordinar con amigos y familia:
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-3 bg-slate-800/60 rounded-xl px-3 py-2.5">
              <span className="text-xl">📺</span>
              <p className="text-sm text-slate-200">¿En casa de quién vemos los partidos?</p>
            </div>
            <div className="flex items-center gap-3 bg-slate-800/60 rounded-xl px-3 py-2.5">
              <span className="text-xl">🥩</span>
              <p className="text-sm text-slate-200">¿Quién trae la parrillada?</p>
            </div>
            <div className="flex items-center gap-3 bg-slate-800/60 rounded-xl px-3 py-2.5">
              <span className="text-xl">🍺</span>
              <p className="text-sm text-slate-200">¿Quién paga las birras?</p>
            </div>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed pt-1">
            Aprovechá la mesa de discusión interna de los torneos para organizarse.
          </p>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={close}
            className="flex-1 py-3 bg-yellow-500 text-slate-900 font-bold rounded-xl hover:bg-yellow-400 transition text-sm"
          >
            ¡Vamos! ⚽
          </button>
        </div>
      </div>
    </div>
  )
}
