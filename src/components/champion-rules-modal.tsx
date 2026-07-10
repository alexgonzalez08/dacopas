'use client'
import { useState } from 'react'
import { HelpCircle, X } from 'lucide-react'
import ChampionScoringTable from '@/components/champion-scoring-table'

export default function ChampionRulesModal() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-slate-500 hover:text-yellow-400 transition"
        aria-label="Reglas de la predicción de campeón"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <span className="text-yellow-400 font-bold text-sm">Reglas · Predicción Campeón</span>
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-white transition p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-6 space-y-4">
              <div className="text-4xl text-center">🏆</div>
              <p className="text-sm text-slate-300 leading-relaxed text-center">
                Elegí quién sale campeón del Mundial, el otro finalista y el marcador de la final, antes de que se definan los semifinalistas.
              </p>
              <p className="text-sm text-slate-300 leading-relaxed text-center">
                Se bloquea 15 minutos antes de que arranque la primera semifinal.
              </p>
              <ChampionScoringTable />
            </div>

            <div className="px-5 pb-5">
              <button
                onClick={() => setOpen(false)}
                className="w-full py-2.5 text-sm font-semibold text-slate-900 bg-yellow-500 hover:bg-yellow-400 rounded-xl transition"
              >
                ¡Entendido!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
