'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { X, Users, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const STEPS = [
  {
    emoji: '🎉',
    title: (username: string) => `¡Hola, ${username}!`,
    text: `Entraste a Dacopas, el lugar donde la gente se la juega prediciendo los partidos del Mundial 2026. Acá no hay suerte — hay criterio, olfato futbolero y mucho descaro. ¿Estás para demostrar quién sabe más de fútbol en tu grupo?`,
  },
  {
    emoji: '👥',
    title: () => '¡Buscá a tus amigos!',
    text: `Agregá a tus amigos desde la sección de Amistades. Buscalos por alias o nombre y mandales una solicitud. Porque esto no es un monólogo — quien gana en solitario no tiene a quién echarle en cara que se equivocó.`,
  },
  {
    emoji: '🏆',
    title: () => 'Armá tu liga y ponele nombre',
    text: `Creá una liga, poné el nombre que quieras — "Los Cracks del Laburo", "La Familia del Asado", lo que se les ocurra — e invitá a tus amigos con el código. Quien quede en último lugar paga el asado. O las birras. O los dos.`,
  },
  {
    emoji: '👑',
    title: () => 'Torneos con roles',
    text: `Cada torneo tiene su jerarquía. La persona Admin crea e invita directamente. Las Moderadoras y Moderadores pueden proponer invitados — el Admin aprueba. Y quienes participan, a darle al pronóstico. También podés solicitar unirte a torneos de tus amigos.`,
  },
  {
    emoji: '🎯',
    title: () => '¿Cómo se puntúa?',
    text: `Predecís el resultado exacto → 3 puntos. 🔥 Acertás quién gana → 1 punto. Quien más puntos junte al final del Mundial se lleva la copa y los derechos eternos de joder a todos con que "yo lo sabía".`,
  },
  {
    emoji: '⏰',
    title: () => '¡No te quedés afuera!',
    text: `Tus predicciones se cierran 15 minutos antes de cada partido. Así que nada de ver el gol y después decir que lo ibas a poner. Quien llega tarde al pique se queda sin poder predecir.`,
  },
  {
    emoji: '🍺',
    title: () => '¡A disfrutar del fútbol!',
    text: `Invitá a tus amigos, armá el grupo, hacé los piques y que quien pierda pague la ronda. El fútbol es mejor con amigos — y aún mejor cuando podés frotarles en la cara que acertaste el marcador exacto. ¡Dale Dacopas! 🏆`,
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
              className="flex-1 py-2.5 text-sm font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
            >
              Atrás
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
              className="flex-1 py-2.5 text-sm font-semibold text-slate-900 bg-yellow-500 hover:bg-yellow-400 rounded-xl transition flex items-center justify-center gap-2"
            >
              Siguiente <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
