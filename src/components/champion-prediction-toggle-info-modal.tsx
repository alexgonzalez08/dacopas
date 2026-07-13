'use client'
import { useState } from 'react'
import { Info, X } from 'lucide-react'

export default function ChampionPredictionToggleInfoModal() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-slate-500 hover:text-yellow-400 transition"
        aria-label="¿Qué es esto?"
      >
        <Info className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <span className="text-yellow-400 font-bold text-sm">🏆 Predicción de Campeón</span>
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-white transition p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-6 space-y-3">
              <p className="text-sm text-slate-300 leading-relaxed">
                Además de los pronósticos partido a partido, los miembros pueden predecir quién sale campeón de la competencia.
              </p>
              <p className="text-sm text-slate-300 leading-relaxed">
                Si lo activás, cada miembro va a poder elegir su campeón, y ganará puntos aparte del ranking principal si acierta cuando termine la temporada.
              </p>
              <p className="text-sm text-slate-300 leading-relaxed">
                Se puede activar o desactivar hasta que pase la fecha límite del torneo; después queda fijo.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
