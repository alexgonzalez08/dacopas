'use client'
import { useState, type ReactNode } from 'react'

type TabId = 'prediccion' | 'alineaciones' | 'bracket' | 'posiciones' | 'historial'

type Tab = { id: TabId; label: string }

export default function MatchTabsClient({
  prediccionSection,
  alineacionesSection,
  bracketSection,
  posicionesSection,
  historialSection,
}: {
  prediccionSection: ReactNode
  alineacionesSection?: ReactNode
  bracketSection?: ReactNode
  posicionesSection?: ReactNode
  historialSection?: ReactNode
}) {
  const tabs: Tab[] = [
    { id: 'prediccion', label: 'Predicción' },
    ...(historialSection ? [{ id: 'historial' as TabId, label: 'Estadísticas' }] : []),
    ...(alineacionesSection ? [{ id: 'alineaciones' as TabId, label: 'Alineaciones' }] : []),
    ...(bracketSection ? [{ id: 'bracket' as TabId, label: 'Eliminatoria' }] : []),
    ...(posicionesSection ? [{ id: 'posiciones' as TabId, label: 'Posiciones' }] : []),
  ]

  const [active, setActive] = useState<TabId>('prediccion')

  return (
    <>
      {/* Tab bar */}
      <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur border-b border-slate-700/50 -mx-4 px-4">
        <div className="flex overflow-x-auto scrollbar-none">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                active === tab.id
                  ? 'border-yellow-400 text-yellow-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="mt-4 space-y-4">
        {active === 'prediccion' && prediccionSection}
        {active === 'alineaciones' && alineacionesSection}
        {active === 'bracket' && bracketSection}
        {active === 'posiciones' && posicionesSection}
        {active === 'historial' && historialSection}
      </div>
    </>
  )
}
