'use client'
import { useState, useMemo } from 'react'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import UserAvatar from '@/components/user-avatar'

type Entry = {
  uid: string
  points: number
  exact: number
  winner: number
  played: number
  username: string
  full_name: string | null
  avatar_url: string | null
  rank: number
}

const PAGE_SIZE = 10

const MEDAL_STYLES: Record<number, { medal: string; bg: string }> = {
  0: { medal: '🥇', bg: 'bg-yellow-500/10 border-yellow-500/30' },
  1: { medal: '🥈', bg: 'bg-slate-700/50 border-slate-600/30' },
  2: { medal: '🥉', bg: 'bg-amber-700/10 border-amber-600/30' },
}

export default function StatsClient({ leaderboard, currentUserId }: { leaderboard: Entry[]; currentUserId: string }) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return leaderboard
    return leaderboard.filter(e =>
      e.username.toLowerCase().includes(q) ||
      (e.full_name ?? '').toLowerCase().includes(q)
    )
  }, [search, leaderboard])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pageEntries = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function handleSearch(val: string) {
    setSearch(val)
    setPage(0)
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Buscar por nombre o alias..."
          className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-yellow-500 transition"
        />
      </div>

      {/* Tabla */}
      <div className="space-y-2">
        {pageEntries.length === 0 ? (
          <p className="text-center text-slate-500 text-sm py-8">No se encontraron resultados.</p>
        ) : pageEntries.map((entry) => {
          const r = entry.rank
          const style = MEDAL_STYLES[r] ?? { medal: null, bg: 'bg-slate-800 border-slate-700/50' }
          const isMe = entry.uid === currentUserId
          return (
            <div key={entry.uid} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${isMe ? 'bg-yellow-500/10 border-yellow-500/30' : style.bg}`}>
              <span className="w-7 text-center shrink-0">
                <span className={`text-xs font-bold ${r === 0 ? 'text-yellow-400' : r === 1 ? 'text-slate-300' : r === 2 ? 'text-amber-500' : 'text-slate-500'}`}>
                  #{r + 1}
                </span>
              </span>
              <UserAvatar username={entry.username} avatarUrl={entry.avatar_url} size="sm" />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold truncate ${isMe ? 'text-yellow-400' : 'text-white'}`}>
                  {entry.full_name || entry.username}
                  {isMe && <span className="text-xs text-yellow-500 ml-1">(vos)</span>}
                </p>
                <p className="text-xs text-slate-500">
                  {entry.exact} exactos · {entry.winner} ganador · {entry.played} jugados
                </p>
              </div>
              <span className="text-lg font-bold text-yellow-400 shrink-0">{entry.points} pts</span>
            </div>
          )
        })}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="flex items-center gap-1 px-3 py-2 text-sm text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>
          <span className="text-xs text-slate-500">
            Página {page + 1} de {totalPages} · {filtered.length} jugadores
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="flex items-center gap-1 px-3 py-2 text-sm text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Siguiente <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
