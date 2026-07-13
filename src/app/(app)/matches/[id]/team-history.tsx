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

  const pillColor = result === 'W'
    ? 'bg-green-500/10 border border-green-500/20 text-green-400'
    : result === 'L'
    ? 'bg-red-500/10 border border-red-500/20 text-red-400'
    : 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400'

  return (
    <div className="flex items-center gap-2">
      <FlagCircle flag={myFlag} name={team} />
      <div className={`flex-1 flex flex-col items-center justify-center px-2 py-1.5 rounded-lg ${pillColor}`}>
        <span className="text-sm font-bold tabular-nums leading-none">
          {goalsFor} - {goalsAgainst}
        </span>
        {penFor != null && penAgainst != null && (penFor > 0 || penAgainst > 0) && (
          <span className="text-[10px] tabular-nums opacity-80 leading-none mt-0.5">({penFor}-{penAgainst})</span>
        )}
      </div>
      <FlagCircle flag={oppFlag} name={oppName} />
    </div>
  )
}

function calcStats(team: string, matches: PastMatch[]) {
  let w = 0, d = 0, l = 0, gf = 0, ga = 0, cs = 0
  for (const m of matches) {
    const isHome = m.home_team === team
    const goalsFor = isHome ? m.home_score : m.away_score
    const goalsAgainst = isHome ? m.away_score : m.home_score
    const penFor = isHome ? m.penalty_home : m.penalty_away
    const penAgainst = isHome ? m.penalty_away : m.penalty_home
    gf += goalsFor
    ga += goalsAgainst
    if (goalsAgainst === 0) cs++
    if (goalsFor > goalsAgainst) w++
    else if (goalsFor < goalsAgainst) l++
    else if (penFor != null && penAgainst != null) penFor > penAgainst ? w++ : l++
    else d++
  }
  return { w, d, l, gf, ga, cs }
}

function TeamColumn({ team, flag, matches }: { team: string; flag: string | null; matches: PastMatch[] }) {
  const stats = calcStats(team, matches)
  return (
    <div className="flex-1 min-w-0 space-y-2.5">
      <div className="flex items-center gap-2 mb-1">
        <FlagCircle flag={flag} name={team} />
        <span className="text-xs font-semibold text-slate-300 truncate">{team}</span>
      </div>

      <div className="grid grid-cols-2 gap-x-2 gap-y-1 bg-slate-700/40 rounded-xl px-3 py-2.5 mb-3">
        <div className="text-center">
          <p className="text-base font-bold text-white">{stats.w}<span className="text-green-400">-</span>{stats.d}<span className="text-yellow-400">-</span>{stats.l}</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">G-E-P</p>
        </div>
        <div className="text-center">
          <p className="text-base font-bold text-white">{stats.gf}<span className="text-slate-500 text-sm font-normal"> / </span>{stats.ga}</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">GF / GC</p>
        </div>
        <div className="col-span-2 border-t border-slate-700/60 mt-1 pt-1 text-center">
          <p className="text-sm font-bold text-white">{stats.cs} <span className="text-xs font-normal text-slate-400">{stats.cs === 1 ? 'portería en cero' : 'porterías en cero'}</span></p>
        </div>
      </div>

      {matches.length === 0
        ? <p className="text-xs text-slate-500">Sin partidos en la temporada actual</p>
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
    <div className="bg-slate-800 -mx-4 sm:mx-0 sm:rounded-2xl px-4 py-5 space-y-4">
      <p className="text-sm font-bold text-white">Temporada actual</p>
      <div className="flex gap-4 items-start">
        <TeamColumn team={homeTeam} flag={homeFlag} matches={homePastMatches} />
        <div className="w-px bg-slate-700 self-stretch shrink-0" />
        <TeamColumn team={awayTeam} flag={awayFlag} matches={awayPastMatches} />
      </div>
    </div>
  )
}
