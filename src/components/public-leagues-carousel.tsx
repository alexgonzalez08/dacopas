'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trophy, X, UserPlus, Loader2 } from 'lucide-react'
import Link from 'next/link'

type PublicLeague = { id: string; name: string; image_url: string | null; competition_name: string | null }

export default function PublicLeaguesCarousel({ leagues }: { leagues: PublicLeague[] }) {
  const router = useRouter()
  const [dismissed, setDismissed] = useState(false)
  const [joining, setJoining] = useState<string | null>(null)

  if (leagues.length === 0 || dismissed) return null

  async function handleJoin(e: React.MouseEvent, league: PublicLeague) {
    e.preventDefault()
    e.stopPropagation()
    setJoining(league.id)
    try {
      const res = await fetch('/api/leagues/join-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId: league.id, leagueName: league.name }),
      })
      if (res.ok) {
        router.push(`/leagues/${league.id}`)
        return
      }
    } finally {
      setJoining(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-400">🌐 Torneos públicos para descubrir</h2>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 text-slate-600 hover:text-slate-400 transition"
          aria-label="Cerrar torneos públicos"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {leagues.map(league => (
          <Link
            key={league.id}
            href={`/leagues/${league.id}`}
            className="flex-shrink-0 w-40 bg-slate-800 rounded-2xl p-3 flex flex-col gap-2 border border-slate-700 hover:border-yellow-500/50 transition"
          >
            <div className="w-full h-20 rounded-xl overflow-hidden bg-slate-700 flex items-center justify-center">
              {league.image_url
                ? <img src={league.image_url} alt={league.name} className="w-full h-full object-cover" />
                : <Trophy className="w-6 h-6 text-yellow-400" />
              }
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{league.name}</p>
              <p className="text-[11px] text-slate-500 truncate">🏆 {league.competition_name ?? 'FIFA World Cup'}</p>
            </div>
            <button
              onClick={(e) => handleJoin(e, league)}
              disabled={joining === league.id}
              className="w-full flex items-center justify-center gap-1 text-xs px-2 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-semibold rounded-xl transition disabled:opacity-50"
            >
              {joining === league.id
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <UserPlus className="w-3.5 h-3.5" />
              }
              Unirme
            </button>
          </Link>
        ))}
      </div>
    </div>
  )
}
