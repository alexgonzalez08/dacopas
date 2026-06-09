'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MoreVertical, Flag, LogOut, Loader2, X, Pencil, StopCircle } from 'lucide-react'
import { leaveLeague } from '@/lib/leagues'
import ReportModal from '@/components/report-modal'
import EditLeague from './edit-league'

export default function LeagueHeaderMenu({
  leagueId,
  leagueName,
  userId,
  userRole,
  initialName,
  initialDescription,
  initialImageUrl,
}: {
  leagueId: string
  leagueName: string
  userId: string
  userRole: string
  initialName: string
  initialDescription: string | null
  initialImageUrl: string | null
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [showLeave, setShowLeave] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [leaveError, setLeaveError] = useState('')
  const [showEnd, setShowEnd] = useState(false)
  const [ending, setEnding] = useState(false)
  const [endError, setEndError] = useState('')

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

  async function handleEnd() {
    setEnding(true)
    setEndError('')
    const res = await fetch('/api/leagues/end', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leagueId }),
    })
    if (!res.ok) {
      const d = await res.json()
      setEndError(d.error ?? 'Error al terminar el torneo.')
      setEnding(false)
      return
    }
    router.refresh()
    setShowEnd(false)
    setEnding(false)
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
              {userRole === 'admin' && (
                <>
                  <button
                    onClick={() => { setShowEdit(true); setOpen(false) }}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-600 w-full transition"
                  >
                    <Pencil className="w-3.5 h-3.5 text-yellow-400" /> Editar torneo
                  </button>
                  <button
                    onClick={() => { setShowEnd(true); setOpen(false) }}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-orange-400 hover:bg-slate-600 w-full transition"
                  >
                    <StopCircle className="w-3.5 h-3.5" /> Terminar torneo
                  </button>
                </>
              )}
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

      {/* Modal editar — controlado externamente */}
      <EditLeague
        leagueId={leagueId}
        initialName={initialName}
        initialDescription={initialDescription}
        initialImageUrl={initialImageUrl}
        externalOpen={showEdit}
        onExternalClose={() => setShowEdit(false)}
      />

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

      {/* Modal terminar torneo */}
      {showEnd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60" onClick={() => setShowEnd(false)}>
          <div className="bg-slate-800 rounded-2xl p-5 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white flex items-center gap-2"><StopCircle className="w-4 h-4 text-orange-400" /> Terminar torneo</h2>
              <button onClick={() => setShowEnd(false)} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-sm text-slate-400">
              Al terminar <span className="font-semibold text-white">"{leagueName}"</span>, no se sumarán más puntos. Se notificará a todos los miembros y se publicará el resultado final.
            </p>
            <p className="text-xs text-orange-400/80">Esta acción es permanente e irreversible.</p>
            {endError && <p className="text-xs text-red-400">{endError}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleEnd}
                disabled={ending}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-lg text-sm disabled:opacity-50 transition"
              >
                {ending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <StopCircle className="w-3.5 h-3.5" />}
                Sí, terminar
              </button>
              <button
                onClick={() => setShowEnd(false)}
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
