'use client'
import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

type StatsEntry = {
  rank: number
  label: string
  sublabel?: string
  value: string
  valueLabel?: string
}

type StatsBlock = {
  title: string
  emoji: string
  entries: StatsEntry[]
}

type StatsPost = {
  id: string
  metadata: { blocks: StatsBlock[] } | null
}

const LS_PREFIX = 'stats_announcement_seen_'

const BROMAS = [
  'algunos de pura casualidad',
  'otros con hojas de cálculo a las 3am',
  'varios gracias al olfato de la abuela',
  'y unos pocos que en realidad nunca ven fútbol pero no lo admiten',
]

const COPY_TOPS = [
  'Le pegó al arco cuando nadie lo esperaba.',
  'Sabía algo que los demás no sabían. O tuvo suerte. Igual lo anotamos.',
  'Los datos no mienten. Esta persona sí entiende, o simula muy bien.',
  'El fútbol tiene esas cosas: de repente aparece alguien y te gana a todos.',
]

export default function StatsAnnouncementModal({
  statsPosts,
  username,
}: {
  statsPosts: StatsPost[]
  username: string
}) {
  const [open, setOpen] = useState(false)

  // Usar el ID del primer post como clave — si se regeneran los stats, se muestra de nuevo
  const firstId = statsPosts[0]?.id
  const lsKey = firstId ? `${LS_PREFIX}${firstId}` : null

  useEffect(() => {
    if (!lsKey || statsPosts.length === 0) return
    if (localStorage.getItem(lsKey)) return
    // Pequeño delay para no chocar con el welcome modal
    const t = setTimeout(() => setOpen(true), 600)
    return () => clearTimeout(t)
  }, [lsKey, statsPosts.length])

  function handleClose() {
    if (lsKey) localStorage.setItem(lsKey, '1')
    setOpen(false)
  }

  if (!open) return null

  // Extraer top 1 de cada bloque para mostrar en el modal
  const highlights: { emoji: string; name: string; copy: string }[] = statsPosts
    .flatMap(p => p.metadata?.blocks ?? [])
    .slice(0, 4)
    .map((block, i) => ({
      emoji: block.emoji,
      name: block.entries[0]?.label ?? '—',
      copy: COPY_TOPS[i] ?? COPY_TOPS[0],
    }))

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm px-4 pb-6 sm:pb-0">
      <div className="w-full max-w-sm bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            <span className="text-yellow-400 font-bold text-sm">Estadísticas · Primera Ronda</span>
          </div>
          <button onClick={handleClose} className="text-slate-500 hover:text-white transition p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido */}
        <div className="px-5 py-5 space-y-4">
          <div className="text-center space-y-1">
            <p className="text-3xl">🏆</p>
            <h2 className="text-lg font-bold text-white leading-tight">
              Ya hay gente que sabe de fútbol.<br />
              <span className="text-yellow-400">O que tuvo más suerte que idea.</span>
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Terminó la primera ronda y los números hablan solos —<br />
              {BROMAS[Math.floor(Math.random() * BROMAS.length)]}.
            </p>
          </div>

          {/* Top 1 de cada stat */}
          {highlights.length > 0 && (
            <div className="space-y-2">
              {highlights.map((h, i) => (
                <div key={i} className="flex items-start gap-3 bg-slate-800 rounded-xl px-3 py-2.5">
                  <span className="text-lg shrink-0 mt-0.5">{h.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-yellow-400 truncate">{h.name}</p>
                    <p className="text-xs text-slate-400 leading-relaxed">{h.copy}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-slate-500 text-center">
            Felicitaciones a los que entienden. Y también a los que no entienden nada pero igual le atinaron.
          </p>
        </div>

        {/* Acción */}
        <div className="px-5 pb-5">
          <button
            onClick={handleClose}
            className="w-full py-2.5 text-sm font-semibold text-slate-900 bg-yellow-500 hover:bg-yellow-400 rounded-xl transition"
          >
            Ver el ranking completo 👇
          </button>
        </div>
      </div>
    </div>
  )
}
