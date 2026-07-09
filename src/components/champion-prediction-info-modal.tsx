'use client'
import { useState } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const STEPS = [
  {
    emoji: '🏆',
    title: '¡Nueva función: Predicción Campeón!',
    text: 'Ahora también podés predecir quién sale campeón del Mundial, el otro finalista y el marcador de la final, antes de que se definan los semifinalistas.\nSe bloquea 15 minutos antes de la primera semifinal, así que no te quedes sin hacerla.',
  },
  {
    emoji: '⭐',
    title: '¿Cómo se puntúa?',
    text: null,
  },
]

const SCORING_ROWS: { finalists: boolean; score: boolean; penalty: boolean; pts: number }[] = [
  { finalists: true, score: true, penalty: true, pts: 15 },
  { finalists: true, score: true, penalty: false, pts: 12 },
  { finalists: true, score: false, penalty: true, pts: 10 },
  { finalists: true, score: false, penalty: false, pts: 8 },
  { finalists: false, score: true, penalty: true, pts: 5 },
  { finalists: false, score: true, penalty: false, pts: 3 },
  { finalists: false, score: false, penalty: true, pts: 2 },
  { finalists: false, score: false, penalty: false, pts: 1 },
]

function ScoringTable() {
  return (
    <div>
      <p className="text-xs text-slate-400 text-center mb-3">Sin el campeón correcto no sumás puntos. Con el campeón acertado:</p>
      <table className="w-full text-center border-collapse">
        <thead>
          <tr className="text-[9px] text-slate-500 uppercase tracking-wide">
            <th className="pb-1.5 font-medium">Finalistas</th>
            <th className="pb-1.5 font-medium">Marcador</th>
            <th className="pb-1.5 font-medium">Penales</th>
            <th className="pb-1.5 font-medium">Pts</th>
          </tr>
        </thead>
        <tbody>
          {SCORING_ROWS.map((row, i) => (
            <tr key={i} className="border-t border-slate-800">
              <td className="py-1.5 text-sm">{row.finalists ? '✓' : <span className="text-slate-600">—</span>}</td>
              <td className="py-1.5 text-sm">{row.score ? '✓' : <span className="text-slate-600">—</span>}</td>
              <td className="py-1.5 text-sm">{row.penalty ? '✓' : <span className="text-slate-600">—</span>}</td>
              <td className="py-1.5 text-sm font-bold text-yellow-400">{row.pts}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[10px] text-slate-500 text-center mt-2">
        "Penales" = predijiste empate y acertaste quién gana la tanda
      </p>
    </div>
  )
}

export default function ChampionPredictionInfoModal({
  userId,
  autoOpen,
}: {
  userId: string
  autoOpen: boolean
}) {
  const [open, setOpen] = useState(autoOpen)
  const [step, setStep] = useState(0)

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  function markSeen() {
    setOpen(false)
    const supabase = createClient()
    supabase.from('profiles').update({ champion_prediction_info_seen: true }).eq('id', userId).then()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-yellow-400 font-bold text-sm">Novedad</span>
            <span className="text-slate-600 text-xs">•</span>
            <span className="text-slate-500 text-xs">{step + 1} / {STEPS.length}</span>
          </div>
          <button onClick={markSeen} className="text-slate-500 hover:text-white transition p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-6 space-y-4">
          <div className="text-5xl text-center">{current.emoji}</div>
          <h2 className="text-xl font-bold text-white text-center">{current.title}</h2>
          {current.text ? (
            <p className="text-sm text-slate-300 leading-relaxed text-center whitespace-pre-line">
              {current.text}
            </p>
          ) : (
            <ScoringTable />
          )}
        </div>

        <div className="flex justify-center gap-1.5 pb-4">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`rounded-full transition-all ${i === step ? 'w-5 h-2 bg-yellow-400' : 'w-2 h-2 bg-slate-700 hover:bg-slate-500'}`}
            />
          ))}
        </div>

        <div className="px-5 pb-5 flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="py-2.5 px-4 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
            >
              ←
            </button>
          )}
          {isLast ? (
            <>
              <button
                onClick={markSeen}
                className="py-2.5 px-4 text-sm text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
              >
                Ahora no
              </button>
              <Link
                href="/predictions"
                onClick={markSeen}
                className="flex-1 py-2.5 text-sm font-semibold text-slate-900 bg-yellow-500 hover:bg-yellow-400 rounded-xl transition text-center"
              >
                Ir a Predicciones →
              </Link>
            </>
          ) : (
            <button
              onClick={() => setStep(s => s + 1)}
              className="flex-1 py-2.5 text-sm font-semibold text-slate-900 bg-yellow-500 hover:bg-yellow-400 rounded-xl transition"
            >
              Siguiente →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
