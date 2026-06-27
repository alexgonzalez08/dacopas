'use client'
import { useState, useRef } from 'react'
import { X, Info } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const STEPS = [
  {
    emoji: '🏆',
    title: '¿Qué son los Torneos?',
    text: 'Los Torneos son grupos privados donde competís con tus amigos, familia o compañeros de trabajo prediciendo los resultados del Mundial 2026.',
  },
  {
    emoji: '➕',
    title: 'Crear o unirse',
    text: 'Podés crear tu propio torneo y compartir el link o código de invitación, o unirte a uno existente con el código que te dieron.',
  },
  {
    emoji: '📊',
    title: 'Ranking en tiempo real',
    text: 'Cada vez que acertás un resultado acumulás puntos. El ranking del torneo se actualiza automáticamente después de cada partido.\n\nMarcador exacto → 3 pts · Ganador correcto → 1 pt',
  },
  {
    emoji: '🥅',
    title: 'Penales en eliminatorias',
    text: 'En partidos de Ronda de 32 en adelante, si predecís empate debés elegir quién gana en penales.\n\nMarcador exacto + penales correctos → 5 pts\nSolo penales correctos → 3 pts\nMarcador exacto + penales incorrectos → 3 pts',
  },
  {
    emoji: '🛡️',
    title: 'Solicitudes de ingreso',
    text: 'Por seguridad, para unirte a un torneo vía link el administrador debe aprobar tu solicitud. Si te unís con código, el ingreso es inmediato.',
  },
  {
    emoji: '📄',
    title: 'Acuerdos de Torneo',
    text: 'El admin puede crear acuerdos escritos para formalizar premios o reglas del torneo. Todos los miembros deben firmarlos (aceptar o rechazar). El estado cambia a Aprobado solo cuando todos aceptaron.',
  },
]

export function LeaguesInfoButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-yellow-400 transition-colors"
    >
      <Info className="w-4 h-4" />
      ¿Cómo funcionan?
    </button>
  )
}

export default function LeaguesInfoModal({
  userId,
  autoOpen,
}: {
  userId: string
  autoOpen: boolean
}) {
  const [open, setOpen] = useState(autoOpen)
  const [step, setStep] = useState(0)
  const touchStartX = useRef<number | null>(null)

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const delta = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(delta) < 50) return
    if (delta > 0 && step < STEPS.length - 1) setStep(s => s + 1)
    if (delta < 0 && step > 0) setStep(s => s - 1)
    touchStartX.current = null
  }

  function handleOpen() {
    setStep(0)
    setOpen(true)
  }

  function handleClose() {
    setOpen(false)
    const supabase = createClient()
    supabase.from('profiles').update({ leagues_info_seen: true }).eq('id', userId).then()
  }

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <>
      <LeaguesInfoButton onClick={handleOpen} />

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm">
          <div
            className="w-full max-w-sm bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-yellow-400 font-bold text-sm">Torneos</span>
                <span className="text-slate-600 text-xs">•</span>
                <span className="text-slate-500 text-xs">{step + 1} / {STEPS.length}</span>
              </div>
              <button onClick={handleClose} className="text-slate-500 hover:text-white transition p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contenido */}
            <div className="px-5 py-6 space-y-4">
              <div className="text-5xl text-center">{current.emoji}</div>
              <h2 className="text-xl font-bold text-white text-center">{current.title}</h2>
              <p className="text-sm text-slate-300 leading-relaxed text-center whitespace-pre-line">
                {current.text}
              </p>
            </div>

            {/* Dots */}
            <div className="flex justify-center gap-1.5 pb-4">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className={`rounded-full transition-all ${i === step ? 'w-5 h-2 bg-yellow-400' : 'w-2 h-2 bg-slate-700 hover:bg-slate-500'}`}
                />
              ))}
            </div>

            {/* Acciones */}
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
                <button
                  onClick={handleClose}
                  className="flex-1 py-2.5 text-sm font-semibold text-slate-900 bg-yellow-500 hover:bg-yellow-400 rounded-xl transition"
                >
                  ¡Entendido!
                </button>
              ) : (
                <button
                  onClick={() => setStep(s => s + 1)}
                  className="flex-1 py-2.5 text-sm font-semibold text-slate-900 bg-yellow-500 hover:bg-yellow-400 rounded-xl transition"
                >
                  →
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
