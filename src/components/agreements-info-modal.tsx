'use client'
import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'

const STEPS = [
  {
    emoji: '📄',
    title: '¿Qué son los Acuerdos?',
    text: 'Los Acuerdos son contratos internos del torneo. El admin los crea para formalizar por escrito los premios, reglas especiales o cualquier compromiso que hayan acordado en la mesa de discusión.',
  },
  {
    emoji: '✍️',
    title: 'Tu firma importa',
    text: 'Cada miembro debe aceptar o rechazar el acuerdo. El acuerdo solo queda Aprobado cuando todos los miembros lo aceptaron. Si alguien lo rechaza, queda Denegado.',
  },
  {
    emoji: '🔒',
    title: 'Sin marcha atrás',
    text: 'Una vez que el acuerdo fue aprobado o denegado, el admin no puede editarlo. Esto garantiza que todos vieron y firmaron la misma versión.',
  },
  {
    emoji: '🔔',
    title: 'Te avisamos',
    text: 'Cuando el admin crea un acuerdo nuevo, todos los miembros reciben una notificación para que no se pierdan ningún compromiso del torneo.',
  },
]

const LS_KEY = 'agreements_info_seen'

export default function AgreementsInfoModal() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const touchStartX = useRef<number | null>(null)

  useEffect(() => {
    const alreadySeen = localStorage.getItem(LS_KEY)
    if (!alreadySeen) setOpen(true)
  }, [])

  function handleClose() {
    localStorage.setItem(LS_KEY, '1')
    setOpen(false)
  }

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

  if (!open) return null

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm">
      <div
        className="w-full max-w-sm bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-yellow-400 font-bold text-sm">Acuerdos</span>
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
  )
}
