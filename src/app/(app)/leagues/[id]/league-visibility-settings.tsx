'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Globe, Lock, Loader2 } from 'lucide-react'

export default function LeagueVisibilitySettings({
  leagueId,
  initialIsPublic,
}: {
  leagueId: string
  initialIsPublic: boolean
}) {
  const [isPublic, setIsPublic] = useState(initialIsPublic)
  const [saving, setSaving] = useState(false)

  async function handleToggle(checked: boolean) {
    setIsPublic(checked)
    setSaving(true)
    const supabase = createClient()
    await supabase.from('leagues').update({ is_public: checked }).eq('id', leagueId)
    setSaving(false)
  }

  return (
    <div className="bg-slate-800 rounded-2xl p-4 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-slate-300 flex items-center gap-2">
          {isPublic ? <Globe className="w-4 h-4 text-yellow-400" /> : <Lock className="w-4 h-4 text-yellow-400" />}
          {isPublic ? 'Torneo público' : 'Torneo privado'}
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
        </h2>
        <button
          type="button"
          role="switch"
          aria-checked={isPublic}
          aria-label="Hacer público este torneo"
          disabled={saving}
          onClick={() => handleToggle(!isPublic)}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${isPublic ? 'bg-yellow-500' : 'bg-slate-600'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isPublic ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>
      <p className="text-xs text-slate-500">
        {isPublic
          ? 'Cualquiera con el link se une sin pedir permiso'
          : 'Quien entre por el link debe solicitar unirse'}
      </p>
    </div>
  )
}
