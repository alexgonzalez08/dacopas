'use client'
import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

type UnsavedChangesContextValue = {
  setDirty: (key: string, dirty: boolean) => void
  isDirty: boolean
  navigate: (href: string) => void
  pendingHref: string | null
  confirmNavigation: () => void
  cancelNavigation: () => void
}

const UnsavedChangesContext = createContext<UnsavedChangesContextValue>({
  setDirty: () => {},
  isDirty: false,
  navigate: () => {},
  pendingHref: null,
  confirmNavigation: () => {},
  cancelNavigation: () => {},
})

export function UnsavedChangesProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const dirtyKeys = useRef<Set<string>>(new Set())
  const [isDirty, setIsDirty] = useState(false)
  const [pendingHref, setPendingHref] = useState<string | null>(null)

  const setDirty = useCallback((key: string, dirty: boolean) => {
    if (dirty) dirtyKeys.current.add(key)
    else dirtyKeys.current.delete(key)
    setIsDirty(dirtyKeys.current.size > 0)
  }, [])

  const navigate = useCallback((href: string) => {
    if (dirtyKeys.current.size > 0) {
      setPendingHref(href)
    } else {
      router.push(href)
    }
  }, [router])

  const confirmNavigation = useCallback(() => {
    if (!pendingHref) return
    const href = pendingHref
    setPendingHref(null)
    router.push(href)
  }, [pendingHref, router])

  const cancelNavigation = useCallback(() => setPendingHref(null), [])

  return (
    <UnsavedChangesContext.Provider value={{ setDirty, isDirty, navigate, pendingHref, confirmNavigation, cancelNavigation }}>
      {children}
      {pendingHref && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <p className="text-white font-semibold text-base mb-1">Cambios sin guardar</p>
            <p className="text-slate-400 text-sm mb-6">Tenés predicciones modificadas que no fueron guardadas. ¿Querés salir igual?</p>
            <div className="flex gap-3">
              <button
                onClick={cancelNavigation}
                className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-300 text-sm font-semibold hover:bg-slate-700 transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmNavigation}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-400 transition"
              >
                Salir sin guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </UnsavedChangesContext.Provider>
  )
}

export function useUnsavedChanges() {
  return useContext(UnsavedChangesContext)
}
