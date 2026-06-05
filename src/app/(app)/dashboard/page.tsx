import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Users, ChevronRight } from 'lucide-react'
import TeamFlag from '@/components/team-flag'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: memberships }, { data: nextMatches }] = await Promise.all([
    supabase
      .from('league_members')
      .select('leagues(id, name, code)')
      .eq('user_id', user!.id),
    supabase
      .from('matches')
      .select('*')
      .eq('status', 'scheduled')
      .gte('match_date', new Date().toISOString())
      .order('match_date', { ascending: true })
      .limit(3),
  ])

  const leagues = memberships?.map(m => m.leagues).filter(Boolean) ?? []

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Ligas */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-yellow-400" /> Mis Ligas
          </h2>
          <Link href="/leagues/new" className="text-sm text-yellow-400 hover:underline">
            + Nueva →
          </Link>
        </div>
        {leagues.length === 0 ? (
          <p className="text-slate-400 text-sm">No estás en ninguna liga todavía.</p>
        ) : (
          <div className="space-y-2">
            {leagues.map((league: any) => (
              <Link
                key={league.id}
                href={`/leagues/${league.id}`}
                className="flex items-center justify-between bg-slate-800 rounded-xl px-4 py-3 hover:bg-slate-700 transition"
              >
                <span className="font-medium">{league.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-400">{league.code}</span>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </div>
              </Link>
            ))}
          </div>
        )}
        <div className="flex gap-3 mt-3">
          <Link href="/leagues/new" className="flex-1 py-2.5 text-center bg-yellow-500 text-slate-900 font-semibold rounded-lg hover:bg-yellow-400 transition text-sm">
            + Crear liga
          </Link>
          <Link href="/leagues/new?join=1" className="flex-1 py-2.5 text-center bg-slate-700 text-white font-semibold rounded-lg hover:bg-slate-600 transition text-sm">
            Unirse a liga
          </Link>
        </div>
      </div>

      {/* Próximos partidos */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg">Próximos partidos</h2>
          <Link href="/predictions" className="text-sm text-yellow-400 hover:underline">
            Ver todos →
          </Link>
        </div>
        {!nextMatches?.length ? (
          <p className="text-slate-400 text-sm">No hay partidos programados próximamente.</p>
        ) : (
          <div className="space-y-3">
            {nextMatches.map(match => (
              <Link
                key={match.id}
                href="/predictions"
                className="flex items-center justify-between bg-slate-800 rounded-xl p-4 hover:bg-slate-700 transition"
              >
                <div className="flex items-center gap-3 font-medium text-sm">
                  <TeamFlag name={match.home_team} flagUrl={match.home_team_flag} />
                  <span className="text-slate-500">vs</span>
                  <TeamFlag name={match.away_team} flagUrl={match.away_team_flag} />
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap">
                  {new Date(match.match_date).toLocaleDateString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
