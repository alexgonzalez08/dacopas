import Link from 'next/link'

type KnockoutMatch = {
  id: number
  home_team: string
  away_team: string
  home_team_flag: string | null
  away_team_flag: string | null
  home_score: number | null
  away_score: number | null
  penalty_home: number | null
  penalty_away: number | null
  status: string
  bracket_position: number | null
  match_date: string
}

function Flag({ flag, name }: { flag: string | null; name: string }) {
  if (!flag) return <span className="text-lg">🏳️</span>
  if (flag.startsWith('http')) return <img src={flag} alt={name} className="w-5 h-5 object-contain" />
  return <span className="text-lg">{flag}</span>
}

function MatchRow({ m, currentId }: { m: KnockoutMatch; currentId: number }) {
  const finished = m.status === 'finished'
  const isCurrent = m.id === currentId
  const homeWins = finished && m.home_score !== null && m.away_score !== null &&
    (m.home_score > m.away_score ||
      (m.home_score === m.away_score && m.penalty_home !== null && m.penalty_home > (m.penalty_away ?? 0)))
  const awayWins = finished && !homeWins && m.home_score !== null

  return (
    <Link
      href={`/matches/${m.id}`}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition ${
        isCurrent
          ? 'bg-yellow-500/10 border border-yellow-500/30'
          : 'bg-slate-700/40 hover:bg-slate-700/70'
      }`}
    >
      {/* Home */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Flag flag={m.home_team_flag} name={m.home_team} />
        <span className={`text-sm truncate ${homeWins ? 'text-white font-semibold' : 'text-slate-300'}`}>
          {m.home_team}
        </span>
      </div>

      {/* Score */}
      <div className="shrink-0 text-center w-16">
        {finished && m.home_score !== null ? (
          <div>
            <span className={`text-sm font-bold tabular-nums ${homeWins ? 'text-white' : awayWins ? 'text-slate-400' : 'text-white'}`}>
              {m.home_score}
            </span>
            <span className="text-slate-500 mx-1">-</span>
            <span className={`text-sm font-bold tabular-nums ${awayWins ? 'text-white' : homeWins ? 'text-slate-400' : 'text-white'}`}>
              {m.away_score}
            </span>
            {m.penalty_home !== null && (
              <p className="text-[10px] text-slate-500 leading-none mt-0.5">
                pen. {m.penalty_home}-{m.penalty_away}
              </p>
            )}
          </div>
        ) : (
          <span className="text-xs text-slate-500">vs</span>
        )}
      </div>

      {/* Away */}
      <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
        <span className={`text-sm truncate text-right ${awayWins ? 'text-white font-semibold' : 'text-slate-300'}`}>
          {m.away_team}
        </span>
        <Flag flag={m.away_team_flag} name={m.away_team} />
      </div>
    </Link>
  )
}

const STAGE_LABELS: Record<string, string> = {
  round_of_32: 'Ronda de 32',
  round_of_16: 'Octavos de Final',
  quarter: 'Cuartos de Final',
  semi: 'Semifinales',
  third_place: 'Tercer Puesto',
  final: 'Final',
}

export default function EliminatoriaSection({
  stageMatches,
  currentMatchId,
  stage,
}: {
  stageMatches: KnockoutMatch[]
  currentMatchId: number
  stage: string
}) {
  const sorted = [...stageMatches].sort((a, b) => {
    if (a.bracket_position != null && b.bracket_position != null) return a.bracket_position - b.bracket_position
    return new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
  })

  return (
    <div className="bg-slate-800 rounded-2xl p-5 space-y-3">
      <h2 className="font-semibold text-slate-300">{STAGE_LABELS[stage] ?? stage}</h2>
      <div className="space-y-2">
        {sorted.map(m => (
          <MatchRow key={m.id} m={m} currentId={currentMatchId} />
        ))}
      </div>
      <div className="pt-1">
        <Link href="/bracket" className="text-xs text-yellow-400 hover:text-yellow-300 transition">
          Ver bracket completo →
        </Link>
      </div>
    </div>
  )
}
