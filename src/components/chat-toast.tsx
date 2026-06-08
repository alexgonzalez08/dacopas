'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePathname, useRouter } from 'next/navigation'
import { X } from 'lucide-react'

type League = { id: string; name: string; image_url: string | null }

type Toast = {
  id: string
  leagueId: string
  leagueName: string
  leagueImage: string | null
  senderUsername: string
  content: string
}

export default function ChatToast({
  userId,
  leagues,
}: {
  userId: string
  leagues: League[]
}) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const pathname = usePathname()
  const router = useRouter()
  const leagueMap = new Map(leagues.map(l => [l.id, l]))

  useEffect(() => {
    if (leagues.length === 0) return
    const supabase = createClient()

    const channel = supabase
      .channel('global-chat-toast')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'league_chat_messages' },
        async (payload) => {
          const row = payload.new as any

          // Ignorar mensajes propios
          if (row.user_id === userId) return

          // Ignorar si el usuario está en la página de ese torneo con el chat abierto
          if (pathname.includes(`/leagues/${row.league_id}`)) return

          const league = leagueMap.get(row.league_id)
          if (!league) return

          // Traer username del remitente
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', row.user_id)
            .single()

          const toast: Toast = {
            id: `${row.id}-${Date.now()}`,
            leagueId: row.league_id,
            leagueName: league.name,
            leagueImage: league.image_url,
            senderUsername: profile?.username ?? 'Usuario',
            content: row.content,
          }

          setToasts(prev => [...prev.slice(-2), toast])

          // Auto-dismiss en 5 segundos
          const timer = setTimeout(() => dismiss(toast.id), 5000)
          timers.current.set(toast.id, timer)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId, leagues, pathname])

  function dismiss(id: string) {
    setToasts(prev => prev.filter(t => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) { clearTimeout(timer); timers.current.delete(id) }
  }

  function handleClick(toast: Toast) {
    dismiss(toast.id)
    router.push(`/leagues/${toast.leagueId}`)
  }

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-16 right-3 z-[60] flex flex-col gap-2 max-w-[320px] w-[calc(100vw-24px)]">
      {toasts.map(toast => (
        <div
          key={toast.id}
          onClick={() => handleClick(toast)}
          className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-2xl px-3 py-2.5 shadow-xl cursor-pointer hover:bg-slate-700 transition animate-in slide-in-from-right-4 duration-300"
        >
          {/* Foto del torneo */}
          <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-slate-700 flex items-center justify-center">
            {toast.leagueImage
              ? <img src={toast.leagueImage} alt={toast.leagueName} className="w-full h-full object-cover" />
              : <span className="text-lg">🏆</span>
            }
          </div>

          {/* Texto */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-sky-400 truncate">{toast.leagueName}</p>
            <p className="text-xs text-slate-300 truncate">
              <span className="font-medium text-white">{toast.senderUsername}:</span>{' '}
              {toast.content}
            </p>
          </div>

          {/* Cerrar */}
          <button
            onClick={e => { e.stopPropagation(); dismiss(toast.id) }}
            className="shrink-0 text-slate-500 hover:text-white transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
