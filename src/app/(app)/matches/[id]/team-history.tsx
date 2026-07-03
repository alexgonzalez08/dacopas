import TeamFlag from '@/components/team-flag'

type PastMatch = {
  id: number
  home_team: string
  away_team: string
  home_team_flag: string | null
  away_team_flag: string | null
  home_score: number
  away_score: number
  penalty_home: number | null
  penalty_away: number | null
  stage: string
  group_name: string | null
  match_date: string
}

const STAGE_SHORT: Record<string, string> = {
  group: 'Grupos',
  round_of_32: 'R32',
  round_of_16: 'Octavos',
  quarter: 'Cuartos',
  semi: 'Semis',
  third_place: '3er Puesto',
  final: 'Final',
}

function ResultBadge({ result }: { result: 'W' | 'D' | 'L' }) {
  const styles = {
    W: 'bg-green-500/20 text-green-400 border-green-500/30',
    D: 'bg-slate-600/40 text-slate-400 border-slate-600/40',
    L: 'bg-red-500/20 text-red-400 border-red-500/30',
  }
  const labels = { W: 'G', D: 'E', L: 'P' }
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${styles[result]}`}>
      {labels[result]}
    </span>
  )
}

function TeamColumn({ team, flag, matches }: { team: string; flag: string | null; matches: PastMatch[] }) {
  return (
    <div className="flex-1 min-w-0 space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <TeamFlag name={team} flagUrl={flag} size="lg" showName={false} />
        <span className="text-sm font-semibold text-white truncate">{team}</span>
      </div>

      {matches.length === 0 ? (
        <p className="text-xs text-slate-500">Sin partidos previos</p>
      ) : (
        <div className="space-y-1.5">
          {matches.map(m => {
            const isHome = m.home_team === team
            const opponent = isHome ? m.away_team : m.home_team
            const opponentFlag = isHome ? m.away_team_flag : m.home_team_flag
            const goalsFor = isHome ? m.home_score : m.away_score
            const goalsAgainst = isHome ? m.away_score : m.home_score
            const penFor = isHome ? m.penalty_home : m.penalty_away
            const penAgainst = isHome ? m.penalty_away : m.penalty_home

            let result: 'W' | 'D' | 'L'
            if (goalsFor > goalsAgainst) result = 'W'
            else if (goalsFor < goalsAgainst) result = 'L'
            else if (penFor != null && penAgainst != null) result = penFor > penAgainst ? 'W' : 'L'
            else result = 'D'

            const stageLabel = m.group_name ? `Gr. ${m.group_name}` : (STAGE_SHORT[m.stage] ?? m.stage)

            return (
              <div key={m.id} className="flex items-center gap-2 bg-slate-700/30 rounded-lg px-2.5 py-2">
                <ResultBadge result={result} />
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <TeamFlag name={opponent} flagUrl={opponentFlag} size="sm" showName={false} />
                  <span className="text-xs text-slate-300 truncate">{opponent}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-bold tabular-nums text-white">
                    {goalsFor}-{goalsAgainst}
                    {penFor != null && penAgainst != null && (
                      <span className="text-[10px] text-slate-400 ml-1">({penFor}-{penAgainst})</span>
                    )}
                  </span>
                  <p className="text-[10px] text-slate-500">{stageLabel}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function TeamHistory({
  homeTeam, homeFlag, homePastMatches,
  awayTeam, awayFlag, awayPastMatches,
}: {
  homeTeam: string
  homeFlag: string | null
  homePastMatches: PastMatch[]
  awayTeam: string
  awayFlag: string | null
  awayPastMatches: PastMatch[]
}) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Partidos anteriores en el torneo</p>
      <div className="flex gap-4 items-start">
        <TeamColumn team={homeTeam} flag={homeFlag} matches={homePastMatches} />
        <div className="w-px bg-slate-700 self-stretch shrink-0" />
        <TeamColumn team={awayTeam} flag={awayFlag} matches={awayPastMatches} />
      </div>
    </div>
  )
}
