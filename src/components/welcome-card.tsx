'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { X, Users, ChevronRight } from 'lucide-react'

const STORAGE_KEY = 'dacopas_welcome_dismissed'

const STEPS = [
  {
    emoji: '🎉',
    title: (username: string) => `¡Bienvenido, ${username}!`,
    text: `Entraste a Dacopas, el lugar donde los pibes se la juegan prediciendo los partidos del Mundial 2026. Acá no hay suerte — hay criterio, olfato futbolero y mucho descaro. ¿Estás listo para demostrar quién sabe más de fútbol en tu grupo?`,
  },
  {
    emoji: '👥',
    title: () => '¡Buscá a tus amigos!',
    text: `Agregá a tus amigos desde la sección de Amistades. Buscalos por alias o nombre y mandales una solicitud. Porque esto no es un monólogo — el que gana solo no tiene a quién echarle en cara que se equivocó.`,
  },
  {
    emoji: '🏆',
    title: () => 'Armá tu torneo y ponele nombre',
    text: `Creá un torneo, poné el nombre que quieras — "Los Cracks del Laburo", "La Familia del Asado", lo que se les ocurra — e invitá a tus amigos con el código. El que quede último paga el asado. O las birras. O los dos.`,
  },
  {
    emoji: '🎯',
    title: () => '¿Cómo se puntúa el pique?',
    text: `Predecís el resultado exacto → 3 puntos. 🔥 Acertás quién gana → 1 punto. El que más puntos junte al final del Mundial se lleva la copa y los derechos eternos de joder a todos con que "yo lo sabía".`,
  },
  {
    emoji: '⏰',
    title: () => '¡No te quedés afuera!',
    text: `Tus predicciones se cierran 15 minutos antes de cada partido. Así que nada de ver el gol y después decir que lo ibas a poner. El que llega tarde al pique, que se vaya a mirar tele solo.`,
  },
  {
    emoji: '🍺',
    title: () => '¡A disfrutar del fútbol!',
    text: `Invitá a tus amigos, armá el grupo, hacé los piques y que el que pierda pague la ronda. El fútbol es mejor con amigos — y aún mejor cuando podés frotarles en la cara que acertaste el marcador exacto. ¡Dale Dacopas! 🏆`,
  },
]

export default function WelcomeCard({ username }: { username: string }) {
  const [step, setStep] = useState(0)
  const [closed, setClosed] = useState(true) // empieza cerrado hasta verificar localStorage

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setClosed(false)
  }, [])

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1')
    setClosed(true)
  }

  if (closed) return null

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">

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
