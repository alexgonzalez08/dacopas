'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Info, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ChampionVsFinalInfoModal({
  userId,
  autoOpen = false,
}: {
  userId?: string
  autoOpen?: boolean
}) {
  const [open, setOpen] = useState(autoOpen)

  function handleClose() {
    setOpen(false)
    if (userId) {
      const supabase = createClient()
      supabase.from('profiles').update({ champion_vs_final_info_seen: true }).eq('id', userId).then()
    }
  }

  return (
    <>
      {!autoOpen && (
        <button
          onClick={() => setOpen(true)}
          className="text-slate-500 hover:text-yellow-400 transition"
          aria-label="¿Cómo se relaciona esto con el partido de la Final?"
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <span className="text-yellow-400 font-bold text-sm">Predicción Campeón</span>
              <button onClick={handleClose} className="text-slate-500 hover:text-white transition p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-6 space-y-4">
              <div className="text-4xl text-center">🏆⚽</div>
              <p className="text-sm text-yellow-400 font-semibold leading-relaxed text-center">
                ¡No olvides agregar tu predicción del campeón del Mundial antes de que empiecen las semifinales!
              </p>
              <h2 className="text-lg font-bold text-white text-center">No tiene relación con el partido de la Final</h2>
              <p className="text-sm text-slate-300 leading-relaxed text-center">
                Esta predicción es <span className="text-yellow-400 font-semibold">independiente</span> de tu pronóstico para el partido de la Final (el que hacés en Predicciones o el Bracket una vez que se conocen los 2 finalistas).
              </p>
              <p className="text-sm text-slate-300 leading-relaxed text-center">
                Podés poner acá un marcador distinto al que pongas en el pronóstico del partido — cada una suma puntos por separado.
              </p>
            </div>

            <div className="px-5 pb-5">
              <Link
                href="/predictions#champion-prediction"
                onClick={handleClose}
                className="block w-full py-2.5 text-sm font-semibold text-slate-900 bg-yellow-500 hover:bg-yellow-400 rounded-xl transition text-center"
              >
                Ir a mi predicción →
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
