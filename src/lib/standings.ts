export type StandingMatch = {
  home_team: string
  away_team: string
  home_score: number | null
  away_score: number | null
  status: string
}

export type Standing = {
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

export function calcStandings(matches: StandingMatch[]): Standing[] {
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
