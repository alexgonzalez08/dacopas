'use client'
import { useState, useRef } from 'react'
import { X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const STEPS = [
  {
    emoji: '🌍',
    title: 'Nuevas competencias',
    text: 'Puede que se acabe el Mundial, pero en Dacopas seguimos. Sumamos nuevas competencias para compartir con tus amistades: 🇬🇧 Premier League, 🇪🇸 La Liga, 🇮🇹 Serie A y 🇨🇷 Liga Promerica.',
  },
  {
    emoji: '🔐',
    title: 'Torneos públicos o privados',
    text: 'Ahora podés unirte a torneos públicos organizados por Dacopas o crear tus propios torneos, privados o públicos. Vos decidís.',
  },
  {
    emoji: '🏆',
    title: 'Predicción de campeón',
    text: 'Nuestros torneos son más customizables: vos y tus amistades deciden si desean activar la opción de Predicción de campeón en sus torneos.\n\n📲 Bonus: ¡ya estamos disponibles en Google Play! Contale a tus amigos.',
  },
]

export default function FeaturesAnnouncementModal({
  userId,
  autoOpen,
}: {
  userId: string
  autoOpen: boolean
}) {
  const [open, setOpen] = useState(autoOpen)
  const [step, setStep] = useState(0)
  const touchStartX = useRef<number | null>(null)
  const router = useRouter()

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

  function markSeen() {
    const supabase = createClient()
    supabase.from('profiles').update({ features_announcement_seen: true }).eq('id', userId).then()
  }

  function handleClose() {
    setOpen(false)
    markSeen()
  }

  function handleGoToTournaments() {
    setOpen(false)
    markSeen()
    router.push('/leagues/new')
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
            <span className="text-yellow-400 font-bold text-sm">Novedades</span>
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
              onClick={handleGoToTournaments}
              className="flex-1 py-2.5 text-sm font-semibold text-slate-900 bg-yellow-500 hover:bg-yellow-400 rounded-xl transition"
            >
              Ir a mis torneos
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
