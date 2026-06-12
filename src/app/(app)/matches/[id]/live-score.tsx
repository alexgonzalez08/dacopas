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

    // Realtime
    const channel = supabase
      .channel(`match-${matchId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` },
        (payload) => {
          const m = payload.new as any
          update(m.home_score, m.away_score, m.status)
        }
      )
      .subscribe()

    // Polling cada 30s como fallback
    const poll = setInterval(async () => {
      const { data } = await supabase
        .from('matches')
        .select('home_score, away_score, status')
        .eq('id', matchId)
        .single()
      if (data) update(data.home_score, data.away_score, data.status)
    }, 30_000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(poll)
    }
  }, [matchId])

  function update(h: number | null, a: number | null, s: string) {
    setHomeScore(prev => {
      if (prev !== h || awayScore !== a) {
        setFlash(true)
        setTimeout(() => setFlash(false), 1500)
      }
      return h
    })
    setAwayScore(a)
    setStatus(s)
  }

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
