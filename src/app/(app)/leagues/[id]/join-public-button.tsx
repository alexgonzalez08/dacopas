'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, UserPlus } from 'lucide-react'

export default function JoinPublicButton({ leagueId, leagueName }: { leagueId: string; leagueName: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleJoin() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/leagues/join-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId, leagueName }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Error al unirte al torneo')
        setLoading(false)
        return
      }
      router.refresh()
    } catch {
      setError('Error al unirte al torneo')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleJoin}
        disabled={loading}
        className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold rounded-2xl transition flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
        Unirme al torneo
      </button>
      {error && <p className="text-red-400 text-sm text-center">{error}</p>}
    </div>
  )
}
