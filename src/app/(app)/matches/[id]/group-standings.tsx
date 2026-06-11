type Match = {
  home_team: string
  away_team: string
  home_score: number | null
  away_score: number | null
  status: string
}

type Standing = {
  team: string
  played: number
  won: number
  drawn: number
  lost: number
  gf: number
  ga: number
  gd: number
  points: number
}

function calcStandings(matches: Match[]): Standing[] {
  const table: Record<string, Standing> = {}

  function ensure(team: string) {
    if (!table[team]) table[team] = { team, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 }
  }

  for (const m of matches) {
    if (m.status !== 'finished' || m.home_score === null || m.away_score === null) {
      ensure(m.home_team)
      ensure(m.away_team)
      continue
    }
    ensure(m.home_team)
    ensure(m.away_team)
    const h = table[m.home_team]
    const a = table[m.away_team]
    h.played++; a.played++
    h.gf += m.home_score; h.ga += m.away_score
    a.gf += m.away_score; a.ga += m.home_score
    if (m.home_score > m.away_score) { h.won++; h.points += 3; a.lost++ }
    else if (m.home_score < m.away_score) { a.won++; a.points += 3; h.lost++ }
    else { h.drawn++; h.points++; a.drawn++; a.points++ }
  }

  return Object.values(table)
    .map(s => ({ ...s, gd: s.gf - s.ga }))
    .sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf)
}

export default function GroupStandings({
  groupName,
  matches,
  highlightTeams,
}: {
  groupName: string
  matches: Match[]
  highlightTeams: string[]
}) {
  const standings = calcStandings(matches)

  return (
    <div className="bg-slate-800 rounded-2xl p-5">
      <h2 className="font-semibold mb-4 text-slate-300">{groupName ? `Tabla — Grupo ${groupName}` : 'Fase de Grupos'}</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-500 text-xs">
              <th className="text-left pb-2 w-6">#</th>
              <th className="text-left pb-2">Equipo</th>
              <th className="text-center pb-2">PJ</th>
              <th className="text-center pb-2">G</th>
              <th className="text-center pb-2">E</th>
              <th className="text-center pb-2">P</th>
              <th className="text-center pb-2">GD</th>
              <th className="text-center pb-2 text-yellow-400">Pts</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, i) => (
              <tr
                key={s.team}
                className={`border-t border-slate-700 ${highlightTeams.includes(s.team) ? 'text-white' : 'text-slate-400'}`}
              >
                <td className="py-2 text-slate-500 text-xs">{i + 1}</td>
                <td className="py-2 font-medium">
                  {i < 2 && <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-2 mb-0.5" />}
                  {s.team}
                </td>
                <td className="py-2 text-center">{s.played}</td>
                <td className="py-2 text-center">{s.won}</td>
                <td className="py-2 text-center">{s.drawn}</td>
                <td className="py-2 text-center">{s.lost}</td>
                <td className="py-2 text-center">{s.gd > 0 ? `+${s.gd}` : s.gd}</td>
                <td className="py-2 text-center font-bold text-yellow-400">{s.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-slate-500 mt-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-1" />
          Clasifican a octavos
        </p>
      </div>
    </div>
  )
}
