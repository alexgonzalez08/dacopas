'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { X, Users, ChevronRight, ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const STEPS = [
  {
    emoji: '⚽',
    title: (username: string) => `Hola, ${username}`,
    text: `Dacopas es un juego de pronósticos para el Mundial 2026. Predecís los resultados de los partidos, acumulás puntos y competís contra la gente que vos elegís. Simple.`,
  },
  {
    emoji: '👥',
    title: () => 'Primero, agregá amigos',
    text: `Buscá a tus amigos por nombre o alias en la sección de Amistades y mandales una solicitud. Sin amigos conectados, el juego no tiene mucha gracia.`,
  },
  {
    emoji: '🏆',
    title: () => 'Creá un torneo',
    text: `Podés crear un torneo, ponerle el nombre que quieras e invitar a quien quieras con un código. También podés sumarte a torneos que ya existen si alguien te comparte el link.`,
  },
  {
    emoji: '👑',
    title: () => 'Roles dentro del torneo',
    text: `El Admin crea e invita directamente. Los Moderadores pueden sugerir invitados, pero el Admin aprueba. El resto participa y pronostica. Cada torneo funciona de forma independiente.`,
  },
  {
    emoji: '🎯',
    title: () => 'Cómo se puntúa',
    text: `Resultado exacto → 3 puntos. Acertar quién gana → 1 punto. Los empates también cuentan si los predecís. Al final del Mundial gana quien más puntos tenga.`,
  },
  {
    emoji: '⏰',
    title: () => 'Límite de tiempo',
    text: `Las predicciones se cierran 15 minutos antes de cada partido. Después de ese momento ya no podés cargar ni modificar nada para ese partido.`,
  },
  {
    emoji: '✅',
    title: () => 'Ya está, eso es todo',
    text: `Creá tu torneo, sumá gente y empezá a pronosticar cuando arranquen los partidos. Si tenés dudas, cada sección tiene su propia ayuda.`,
  },
]

export default function WelcomeCard({ username, userId }: { username: string; userId: string }) {
  const [step, setStep] = useState(0)
  const [closed, setClosed] = useState(false)
  const touchStartX = useRef<number | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('profiles').update({ welcome_seen: true }).eq('id', userId).then()
  }, [userId])

  function dismiss() {
    setClosed(true)
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const delta = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(delta) < 50) return // swipe mínimo de 50px
    if (delta > 0 && step < STEPS.length - 1) setStep(s => s + 1) // swipe izquierda → siguiente
    if (delta < 0 && step > 0) setStep(s => s - 1) // swipe derecha → anterior
    touchStartX.current = null
  }

  if (closed) return null

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
            <span className="text-yellow-400 font-bold text-sm">Dacopas</span>
            <span className="text-slate-600 text-xs">•</span>
            <span className="text-slate-500 text-xs">{step + 1} / {STEPS.length}</span>
          </div>
          <button onClick={() => dismiss()} className="text-slate-500 hover:text-white transition p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido */}
        <div className="px-5 py-6 space-y-4">
          <div className="text-5xl text-center">{current.emoji}</div>
          <h2 className="text-xl font-bold text-white text-center">
            {current.title(username)}
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed text-center">
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
              className="py-2.5 px-4 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition flex items-center justify-center"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          {isLast ? (
            <Link
              href="/leagues/new"
              onClick={() => dismiss()}
              className="flex-1 py-2.5 text-sm font-semibold text-slate-900 bg-yellow-500 hover:bg-yellow-400 rounded-xl transition flex items-center justify-center gap-2"
            >
              <Users className="w-4 h-4" /> Crear mi torneo
            </Link>
          ) : (
            <button
              onClick={() => setStep(s => s + 1)}
              className="flex-1 py-2.5 text-sm font-semibold text-slate-900 bg-yellow-500 hover:bg-yellow-400 rounded-xl transition flex items-center justify-center"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
