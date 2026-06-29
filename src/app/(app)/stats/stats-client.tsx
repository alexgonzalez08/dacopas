'use client'
import { useState, useMemo, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
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

type Competition = {
  name: string
  matchCount: number
  leaderboard: Entry[]
}

const PAGE_SIZE = 10

const MEDAL_STYLES: Record<number, { medal: string; bg: string }> = {
  0: { medal: '🥇', bg: 'bg-yellow-500/10 border-yellow-500/30' },
  1: { medal: '🥈', bg: 'bg-slate-400/10 border-slate-400/30' },
  2: { medal: '🥉', bg: 'bg-amber-700/10 border-amber-600/30' },
}

function CompetitionLeaderboard({ competition, currentUserId }: { competition: Competition; currentUserId: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const listRef = useRef<HTMLDivElement>(null)

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return competition.leaderboard
    return competition.leaderboard.filter(e =>
      e.username.toLowerCase().includes(q) ||
      (e.full_name ?? '').toLowerCase().includes(q)
    )
  }, [search, competition.leaderboard])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pageEntries = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function goToPage(p: number) {
    setPage(p)
    setTimeout(() => {
      listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 0)
  }

  function handleSearch(val: string) {
    setSearch(val)
    setPage(0)
  }

  return (
    <div className="space-y-4 pt-4 px-4 pb-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Buscar por nombre o alias..."
          className="w-full bg-slate-700 border border-slate-600 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-yellow-500 transition"
        />
      </div>

      {/* Tabla */}
      <div ref={listRef} className="space-y-2">
        {pageEntries.length === 0 ? (
          <p className="text-center text-slate-500 text-sm py-8">No se encontraron resultados.</p>
        ) : pageEntries.map((entry) => {
          const r = entry.rank
          const style = MEDAL_STYLES[r] ?? { medal: null, bg: 'bg-slate-700/50 border-slate-600/50' }
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
            onClick={() => goToPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="flex items-center gap-1 px-3 py-2 text-sm text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-xl transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>
          <span className="text-xs text-slate-500">
            Página {page + 1} de {totalPages} · {filtered.length} jugadores
          </span>
          <button
            onClick={() => goToPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="flex items-center gap-1 px-3 py-2 text-sm text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-xl transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Siguiente <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}

export default function StatsClient({ competitions, currentUserId }: { competitions: Competition[]; currentUserId: string }) {
  const [openCompetitions, setOpenCompetitions] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(competitions.map((c, i) => [c.name, i === 0]))
  )

  function toggle(name: string) {
    setOpenCompetitions(v => ({ ...v, [name]: !v[name] }))
  }

  return (
    <div className="space-y-3">
      {competitions.map(competition => (
        <div key={competition.name} className="bg-slate-800 rounded-2xl overflow-hidden">
          <button
            onClick={() => toggle(competition.name)}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-700 transition group"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white group-hover:text-yellow-400 transition">{competition.name}</span>
              <span className="text-xs text-slate-500">{competition.leaderboard.length} jugadores · {competition.matchCount} partidos</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${openCompetitions[competition.name] ? 'rotate-180' : ''}`} />
          </button>

          {openCompetitions[competition.name] && (
            <div className="border-t border-slate-700/50">
              <CompetitionLeaderboard competition={competition} currentUserId={currentUserId} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
