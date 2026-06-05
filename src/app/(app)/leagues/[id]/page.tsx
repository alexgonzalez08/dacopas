import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Medal } from 'lucide-react'
import CopyButton from './copy-button'

export default async function LeaguePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: league } = await supabase
    .from('leagues')
    .select('*')
    .eq('id', id)
    .single()

  if (!league) notFound()

  const { data: member } = await supabase
    .from('league_members')
    .select('user_id')
    .eq('league_id', id)
    .eq('user_id', user!.id)
    .single()

  if (!member) notFound()

  const [{ data: members }, { data: points }] = await Promise.all([
    supabase
      .from('league_members')
      .select('user_id, profiles(username)')
      .eq('league_id', id),
    supabase
      .from('league_points')
      .select('user_id, points, exact_results, correct_winner')
      .eq('league_id', id),
  ])

  const pointsMap = new Map((points ?? []).map(p => [p.user_id, p]))

  const leaderboard = (members ?? [])
    .map(m => ({
      user_id: m.user_id,
      profiles: (Array.isArray(m.profiles) ? m.profiles[0] : m.profiles) as unknown as { username: string } | null,
      points: pointsMap.get(m.user_id)?.points ?? 0,
      exact_results: pointsMap.get(m.user_id)?.exact_results ?? 0,
      correct_winner: pointsMap.get(m.user_id)?.correct_winner ?? 0,
    }))
    .sort((a, b) => b.points - a.points)

  const medalColors = ['text-yellow-400', 'text-slate-300', 'text-amber-600']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{league.name}</h1>
          <p className="text-sm text-slate-400 mt-1">
            Código: <span className="font-mono font-bold text-yellow-400">{league.code}</span>
          </p>
        </div>
        <CopyButton code={league.code} />
      </div>

      <div>
        <h2 className="font-semibold mb-3 text-slate-300">Tabla de posiciones</h2>
        <div className="space-y-2">
          {leaderboard.map((entry, i) => (
            <div
              key={entry.user_id}
              className={`flex items-center gap-4 rounded-xl px-4 py-3 ${entry.user_id === user!.id ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-slate-800'}`}
            >
              <span className={`w-6 text-center font-bold ${medalColors[i] ?? 'text-slate-400'}`}>
                {i < 3 ? <Medal className="w-5 h-5 inline" /> : i + 1}
              </span>
              <span className="flex-1 font-medium">
                {entry.profiles?.username ?? 'Usuario'}
              </span>
              <div className="text-right">
                <span className="text-lg font-bold text-yellow-400">{entry.points}</span>
                <span className="text-slate-500 text-sm"> pts</span>
              </div>
              <div className="text-xs text-slate-500 hidden sm:block">
                {entry.exact_results} exactos · {entry.correct_winner} ganador
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
