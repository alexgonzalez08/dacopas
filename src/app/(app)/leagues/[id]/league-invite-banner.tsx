'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { joinLeague } from '@/lib/leagues'
import { Check, X, Loader2, Users } from 'lucide-react'

export default function LeagueInviteBanner({
  leagueId,
  leagueCode,
  leagueName,
  notificationId,
}: {
  leagueId: string
  leagueCode: string
  leagueName: string
  notificationId: string | null
}) {
  const router = useRouter()
  const [joining, setJoining] = useState(false)
  const [declining, setDeclining] = useState(false)
  const [joined, setJoined] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAccept() {
    setJoining(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      await joinLeague(leagueCode, user!.id)

      // Marcar notificación como procesada (la eliminamos para que no aparezca más)
      if (notificationId) {
        await supabase.from('notifications').delete().eq('id', notificationId)
      }

      setJoined(true)
      // Recargar la página para que se muestre como miembro
      setTimeout(() => router.refresh(), 1200)
    } catch (err: any) {
      setError(err.message)
      setJoining(false)
    }
  }

  async function handleDecline() {
    setDeclining(true)
    const supabase = createClient()
    if (notificationId) {
      await supabase.from('notifications').delete().eq('id', notificationId)
    }
    router.push('/dashboard')
  }

  if (joined) {
    return (
      <div className="bg-green-500/10 border border-green-500/30 rounded-2xl px-4 py-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
          <Check className="w-4 h-4 text-green-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-green-400">¡Te uniste al torneo!</p>
          <p className="text-xs text-slate-400">Ya sos participante de "{leagueName}"</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl px-4 py-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
          <Users className="w-4 h-4 text-blue-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Fuiste invitado a este torneo</p>
          <p className="text-xs text-slate-400">¿Querés unirte a "{leagueName}"?</p>
        </div>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleAccept}
          disabled={joining || declining}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-yellow-500 text-slate-900 font-semibold rounded-lg hover:bg-yellow-400 disabled:opacity-50 transition"
        >
          {joining ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Aceptar
        </button>
        <button
          onClick={handleDecline}
          disabled={joining || declining}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-slate-700 text-slate-300 font-semibold rounded-lg hover:bg-slate-600 disabled:opacity-50 transition"
        >
          {declining ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
          Declinar
        </button>
      </div>
    </div>
  )
}
