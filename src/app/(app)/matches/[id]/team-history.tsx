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

function FlagCircle({ flag, name }: { flag: string | null; name: string }) {
  if (flag?.startsWith('http')) {
    return (
      <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-600 shrink-0">
        <img src={flag} alt={name} className="w-full h-full object-cover" />
      </div>
    )
  }
  return (
    <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center shrink-0 text-xl border border-slate-600">
      {flag ?? '🏳️'}
    </div>
  )
}

function MatchRow({ match, team }: { match: PastMatch; team: string }) {
  const isHome = match.home_team === team
  const myFlag = isHome ? match.home_team_flag : match.away_team_flag
  const oppFlag = isHome ? match.away_team_flag : match.home_team_flag
  const oppName = isHome ? match.away_team : match.home_team
  const goalsFor = isHome ? match.home_score : match.away_score
  const goalsAgainst = isHome ? match.away_score : match.home_score
  const penFor = isHome ? match.penalty_home : match.penalty_away
  const penAgainst = isHome ? match.penalty_away : match.penalty_home

  let result: 'W' | 'D' | 'L'
  if (goalsFor > goalsAgainst) result = 'W'
  else if (goalsFor < goalsAgainst) result = 'L'
  else if (penFor != null && penAgainst != null) result = penFor > penAgainst ? 'W' : 'L'
  else result = 'D'

  const pillColor = result === 'W' ? 'bg-green-600' : result === 'L' ? 'bg-red-600' : 'bg-yellow-600'

  return (
    <div className="flex items-center gap-2">
      <FlagCircle flag={myFlag} name={team} />
      <div className={`flex-1 flex items-center justify-center px-2 py-1.5 rounded-lg ${pillColor} whitespace-nowrap`}>
        <span className="text-sm font-bold tabular-nums text-white">
          {goalsFor} - {goalsAgainst}{penFor != null && penAgainst != null ? ` (${penFor}-${penAgainst})` : ''}
        </span>
      </div>
      <FlagCircle flag={oppFlag} name={oppName} />
    </div>
  )
}

function TeamColumn({ team, flag, matches }: { team: string; flag: string | null; matches: PastMatch[] }) {
  return (
    <div className="flex-1 min-w-0 space-y-2.5">
      <div className="flex items-center gap-2 mb-3">
        <FlagCircle flag={flag} name={team} />
        <span className="text-xs font-semibold text-slate-300 truncate">{team}</span>
      </div>
      {matches.length === 0
        ? <p className="text-xs text-slate-500">Sin partidos previos</p>
        : matches.map(m => <MatchRow key={m.id} match={m} team={team} />)
      }
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
      <p className="text-sm font-bold text-white">Últimos partidos</p>
      <div className="flex gap-4 items-start">
        <TeamColumn team={homeTeam} flag={homeFlag} matches={homePastMatches} />
        <div className="w-px bg-slate-700 self-stretch shrink-0" />
        <TeamColumn team={awayTeam} flag={awayFlag} matches={awayPastMatches} />
      </div>
    </div>
  )
}
