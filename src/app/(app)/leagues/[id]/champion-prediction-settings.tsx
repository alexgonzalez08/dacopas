'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Trophy, Loader2 } from 'lucide-react'
import ChampionPredictionToggleInfoModal from '@/components/champion-prediction-toggle-info-modal'

export default function ChampionPredictionSettings({
  leagueId,
  isWorldCup,
  championSupported = true,
  initialEnabled,
  lockPassed,
}: {
  leagueId: string
  isWorldCup: boolean
  championSupported?: boolean
  initialEnabled: boolean
  lockPassed: boolean
}) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [saving, setSaving] = useState(false)

  // El Mundial ya está por terminar y sus torneos ya tienen predicciones enviadas —
  // no se puede desactivar, así que ni se muestra el control.
  if (isWorldCup) return null

  // Competencias cuyo campeón se define por liguilla/playoff (no por tabla) todavía no
  // tienen soporte para esto — se muestra deshabilitado en vez de ocultarlo.
  if (!championSupported) {
    return (
      <div className="bg-slate-800 rounded-2xl p-4 space-y-2">
        <h2 className="font-semibold text-slate-300 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-slate-500" />
          Predicción de Campeón
        </h2>
        <p className="text-xs text-slate-500">Todavía no disponible para esta competencia.</p>
      </div>
    )
  }

  async function handleToggle(checked: boolean) {
    setEnabled(checked)
    setSaving(true)
    const supabase = createClient()
    await supabase.from('leagues').update({ champion_prediction_enabled: checked }).eq('id', leagueId)
    setSaving(false)
  }

  return (
    <div className="bg-slate-800 rounded-2xl p-4 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-slate-300 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-400" />
          Predicción de Campeón
          <ChampionPredictionToggleInfoModal />
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
        </h2>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Habilitar predicción de campeón para este torneo"
          disabled={lockPassed || saving}
          onClick={() => handleToggle(!enabled)}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${enabled ? 'bg-yellow-500' : 'bg-slate-600'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>
      {lockPassed && (
        <p className="text-xs text-slate-500">Ya pasó la fecha límite para activar/desactivar esto.</p>
      )}
    </div>
  )
}
