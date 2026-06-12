'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Props = {
  matchId: number
  initialHomeScore: number | null
  initialAwayScore: number | null
  initialStatus: string
}

export default function LiveScore({ matchId, initialHomeScore, initialAwayScore, initialStatus }: Props) {
  const [homeScore, setHomeScore] = useState(initialHomeScore)
  const [awayScore, setAwayScore] = useState(initialAwayScore)
  const [status, setStatus] = useState(initialStatus)
  const [flash, setFlash] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`match-${matchId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` },
        (payload) => {
          const m = payload.new as any
          if (m.home_score !== homeScore || m.away_score !== awayScore) {
            setFlash(true)
            setTimeout(() => setFlash(false), 1500)
          }
          setHomeScore(m.home_score)
          setAwayScore(m.away_score)
          setStatus(m.status)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [matchId])

  if (status === 'finished') {
    return (
      <div className="text-center">
        <div className="text-4xl font-black text-yellow-400">
          {homeScore} - {awayScore}
        </div>
        <span className="text-xs text-green-400 font-medium mt-1 block">Finalizado</span>
      </div>
    )
  }

  if (status === 'live') {
    return (
      <div className="text-center">
        <div className={`text-4xl font-black transition-colors duration-300 ${flash ? 'text-white' : 'text-green-400'} animate-pulse`}>
          {homeScore} - {awayScore}
        </div>
        <span className="text-xs text-green-400 font-medium mt-1 block animate-pulse">En curso</span>
      </div>
    )
  }

  return (
    <div className="text-center">
      <div className="text-2xl font-bold text-slate-500">VS</div>
      <span className="text-xs text-slate-500 mt-1 block">Programado</span>
    </div>
  )
}
