'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function UnsavedChangesGuard({ isDirty }: { isDirty: boolean }) {
  const router = useRouter()
  const [pendingHref, setPendingHref] = useState<string | null>(null)

  useEffect(() => {
    if (!isDirty) return

    function handleClick(e: MouseEvent) {
      const anchor = (e.target as Element).closest('a')
      if (!anchor) return
      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#') || href.startsWith('mailto:')) return
      e.preventDefault()
      e.stopPropagation()
      setPendingHref(href)
    }

    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [isDirty])

  if (!pendingHref) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
      <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <p className="text-white font-semibold text-base mb-1">Cambios sin guardar</p>
        <p className="text-slate-400 text-sm mb-6">Tenés predicciones modificadas que no fueron guardadas. ¿Querés salir igual?</p>
        <div className="flex gap-3">
          <button
            onClick={() => setPendingHref(null)}
            className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-300 text-sm font-semibold hover:bg-slate-700 transition"
          >
            Cancelar
          </button>
          <button
            onClick={() => { setPendingHref(null); router.push(pendingHref) }}
            className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-400 transition"
          >
            Salir sin guardar
          </button>
        </div>
      </div>
    </div>
  )
}
