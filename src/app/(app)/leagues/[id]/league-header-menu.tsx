'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MoreVertical, Flag, LogOut, Loader2, X } from 'lucide-react'
import { leaveLeague } from '@/lib/leagues'
import ReportModal from '@/components/report-modal'

export default function LeagueHeaderMenu({
  leagueId,
  leagueName,
  userId,
  userRole,
}: {
  leagueId: string
  leagueName: string
  userId: string
  userRole: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [showLeave, setShowLeave] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [leaveError, setLeaveError] = useState('')

  async function handleLeave() {
    setLeaving(true)
    setLeaveError('')
    try {
      await leaveLeague(leagueId, userId)
      router.push('/leagues/new')
    } catch {
      setLeaveError('No se pudo abandonar el torneo.')
      setLeaving(false)
    }
  }

  return (
    <>
      {/* Menú 3 puntos */}
      <div className="relative">
        <button
          onClick={() => setOpen(v => !v)}
          className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700 transition"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-8 bg-slate-700 rounded-xl shadow-xl z-40 overflow-hidden min-w-44">
              <button
                onClick={() => { setShowReport(true); setOpen(false) }}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-600 w-full transition"
              >
                <Flag className="w-3.5 h-3.5 text-red-400" /> Reportar torneo
              </button>
              {userRole !== 'admin' && (
                <button
                  onClick={() => { setShowLeave(true); setOpen(false) }}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-slate-600 w-full transition"
                >
                  <LogOut className="w-3.5 h-3.5" /> Abandonar torneo
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal abandonar */}
      {showLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60" onClick={() => setShowLeave(false)}>
          <div className="bg-slate-800 rounded-2xl p-5 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white">Abandonar torneo</h2>
              <button onClick={() => setShowLeave(false)} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-sm text-slate-400">
              ¿Seguro que querés abandonar <span className="font-semibold text-white">"{leagueName}"</span>? No seguirás acumulando puntos.
            </p>
            {leaveError && <p className="text-xs text-red-400">{leaveError}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleLeave}
                disabled={leaving}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg text-sm disabled:opacity-50 transition"
              >
                {leaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                Sí, abandonar
              </button>
              <button
                onClick={() => setShowLeave(false)}
                className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold rounded-lg text-sm transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {showReport && (
        <ReportModal type="user" targetId={leagueId} onClose={() => setShowReport(false)} />
      )}
    </>
  )
}
