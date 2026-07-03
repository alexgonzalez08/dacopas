import { Users } from 'lucide-react'
import PlayerAvatar from './player-avatar'

type Player = {
  id: number
  name: string
  number: number
  pos: string
  grid: string | null
}

type LineupTeam = {
  team: { id: number; name: string; logo: string }
  formation: string
  startXI: { player: Player }[]
  substitutes: { player: Player }[]
}

async function fetchLineups(externalId: string): Promise<LineupTeam[] | null> {
  try {
    const res = await fetch(
      `https://v3.football.api-sports.io/fixtures/lineups?fixture=${externalId}`,
      {
        headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY! },
        next: { revalidate: 300 },
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    if (!data.response || data.response.length === 0) return null
    return data.response
  } catch {
    return null
  }
}

function parseGrid(grid: string | null): { row: number; col: number } | null {
  if (!grid) return null
  const parts = grid.split(':').map(Number)
  if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return null
  return { row: parts[0], col: parts[1] }
}

function shortName(name: string) {
  const parts = name.split(' ')
  return parts.length > 1 ? parts[parts.length - 1] : name
}

type PlacedPlayer = Player & { row: number; col: number; colsInRow: number }

function buildRows(players: { player: Player }[]): Map<number, PlacedPlayer[]> {
  const rows = new Map<number, PlacedPlayer[]>()
  for (const { player } of players) {
    const g = parseGrid(player.grid)
    if (!g) continue
    if (!rows.has(g.row)) rows.set(g.row, [])
    rows.get(g.row)!.push({ ...player, row: g.row, col: g.col, colsInRow: 0 })
  }
  for (const [, rowPlayers] of rows) {
    const count = rowPlayers.length
    rowPlayers.forEach(p => { p.colsInRow = count })
    rowPlayers.sort((a, b) => a.col - b.col)
  }
  return rows
}

function PitchView({ home, away }: { home: LineupTeam; away: LineupTeam }) {
  const homeRows = buildRows(home.startXI)
  const awayRows = buildRows(away.startXI)

  const homeMaxRow = Math.max(...[...homeRows.keys()], 1)
  const awayMaxRow = Math.max(...[...awayRows.keys()], 1)

  // Home: GK (row 1) at bottom (~88%), last row at ~54%
  // Away: GK (row 1) at top (~12%), last row at ~46%
  // Non-linear spacing: el último gap (MID→FWD) es 1.6x más grande que los demás
  function calcY(row: number, maxRow: number, start: number, dir: 1 | -1) {
    if (maxRow === 1) return start
    const n = maxRow - 1
    const totalRange = 39
    const baseGap = totalRange / (n - 1 + 1.6)
    let y = start
    for (let r = 2; r <= row; r++) {
      y += dir * (r === maxRow ? baseGap * 1.6 : baseGap)
    }
    return y
  }
  function homeY(row: number) { return calcY(row, homeMaxRow, 91, -1) }
  function awayY(row: number) { return calcY(row, awayMaxRow, 9, 1) }
  function xPct(col: number, total: number) {
    return (col / (total + 1)) * 100
  }

  const allHomePlayers: PlacedPlayer[] = [...homeRows.values()].flat()
  const allAwayPlayers: PlacedPlayer[] = [...awayRows.values()].flat()

  return (
    <div className="space-y-3">
      {/* Pitch */}
      <div className="relative w-full overflow-hidden" style={{ paddingBottom: '205%', background: '#2d6a35' }}>
        {/* Pitch markings */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 145" preserveAspectRatio="none">
          {/* Outer border */}
          <rect x="3" y="3" width="94" height="139" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.6" />
          {/* Center line */}
          <line x1="3" y1="72.5" x2="97" y2="72.5" stroke="rgba(255,255,255,0.25)" strokeWidth="0.5" />
          {/* Center circle */}
          <circle cx="50" cy="72.5" r="12" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.5" />
          <circle cx="50" cy="72.5" r="0.8" fill="rgba(255,255,255,0.25)" />
          {/* Home penalty area (bottom) */}
          <rect x="20" y="116" width="60" height="26" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
          <rect x="34" y="128" width="32" height="14" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.4" />
          {/* Away penalty area (top) */}
          <rect x="20" y="3" width="60" height="26" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
          <rect x="34" y="3" width="32" height="14" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.4" />
          {/* Lawn stripes */}
          {[0,1,2,3,4,5,6].map(i => (
            <rect key={i} x="3" y={3 + i * 20} width="94" height="10" fill={i % 2 === 0 ? 'rgba(0,0,0,0.06)' : 'transparent'} />
          ))}
        </svg>

        {/* Away team players (top half) */}
        {allAwayPlayers.map(p => {
          const y = awayY(p.row)
          const x = xPct(p.col, p.colsInRow)
          return (
            <div
              key={p.id}
              className="absolute flex flex-col items-center"
              style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)', width: '19%' }}
            >
              <PlayerAvatar id={p.id} number={p.number} ringColor="ring-slate-300" fallbackBg="bg-slate-600" />
              <span className="text-[9px] text-white font-semibold mt-1 text-center leading-tight drop-shadow-md w-full overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {shortName(p.name)}
              </span>
            </div>
          )
        })}

        {/* Home team players (bottom half) */}
        {allHomePlayers.map(p => {
          const y = homeY(p.row)
          const x = xPct(p.col, p.colsInRow)
          return (
            <div
              key={p.id}
              className="absolute flex flex-col items-center"
              style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)', width: '19%' }}
            >
              <PlayerAvatar id={p.id} number={p.number} ringColor="ring-yellow-400" fallbackBg="bg-yellow-500" />
              <span className="text-[9px] text-white font-semibold mt-1 text-center leading-tight drop-shadow-md w-full overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {shortName(p.name)}
              </span>
            </div>
          )
        })}

        {/* Team labels */}
        <div className="absolute left-2 top-2 flex items-center gap-1">
          {away.team.logo && <img src={away.team.logo} className="w-4 h-4 object-contain" alt="" />}
          <span className="text-[9px] text-white/60 font-medium">{away.formation}</span>
        </div>
        <div className="absolute left-2 bottom-2 flex items-center gap-1">
          {home.team.logo && <img src={home.team.logo} className="w-4 h-4 object-contain" alt="" />}
          <span className="text-[9px] text-white/60 font-medium">{home.formation}</span>
        </div>
      </div>

      {/* Substitutes */}
      <div className="grid grid-cols-2 gap-4 px-5 pb-5">
        {[home, away].map(lineup => (
          lineup.substitutes.length > 0 && (
            <div key={lineup.team.id}>
              <div className="flex items-center gap-1.5 mb-2">
                {lineup.team.logo && <img src={lineup.team.logo} alt="" className="w-4 h-4 object-contain" />}
                <span className="text-xs text-slate-400 font-medium">{lineup.team.name}</span>
              </div>
              <div className="space-y-1">
                {lineup.substitutes.map(({ player }) => (
                  <div key={player.id} className="flex items-center gap-1.5 text-xs opacity-60">
                    <span className="w-4 text-center text-slate-500 font-mono text-[10px]">{player.number}</span>
                    <span className="text-slate-300 truncate">{player.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  )
}

export default async function Lineups({
  externalId,
}: {
  externalId: string
  status: string
}) {
  const lineups = await fetchLineups(externalId)

  if (!lineups || lineups.length < 2) {
    return (
      <div className="bg-slate-800 rounded-2xl p-5">
        <h2 className="font-semibold mb-2 text-slate-300 flex items-center gap-2">
          <Users className="w-4 h-4" /> Alineaciones
        </h2>
        <p className="text-slate-500 text-sm">Estamos esperando que el árbitro confirme las alineaciones.</p>
      </div>
    )
  }

  // Check if grid data is available
  const hasGrid = lineups[0].startXI.some(({ player }) => player.grid != null)

  if (!hasGrid) {
    // Fallback: simple list
    return (
      <div className="bg-slate-800 rounded-2xl p-5">
        <h2 className="font-semibold mb-4 text-slate-300 flex items-center gap-2">
          <Users className="w-4 h-4" /> Alineaciones
        </h2>
        <div className="grid grid-cols-2 gap-6">
          {lineups.map(lineup => (
            <div key={lineup.team.id}>
              <div className="flex items-center gap-2 mb-1">
                {lineup.team.logo && <img src={lineup.team.logo} alt="" className="w-5 h-5 object-contain" />}
                <p className="font-semibold text-sm">{lineup.team.name}</p>
              </div>
              <p className="text-xs text-slate-500 mb-3">{lineup.formation}</p>
              <div className="space-y-1">
                {lineup.startXI.map(({ player }) => (
                  <div key={player.id} className="flex items-center gap-2 text-sm">
                    <span className="w-5 text-center text-xs text-slate-500 font-mono">{player.number}</span>
                    <span className="text-slate-200">{player.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-800 overflow-hidden -mx-4 sm:mx-0 sm:rounded-2xl">
      <div className="px-5 pt-5 pb-3">
        <h2 className="font-semibold text-slate-300 flex items-center gap-2">
          <Users className="w-4 h-4" /> Alineaciones
        </h2>
      </div>
      <PitchView home={lineups[0]} away={lineups[1]} />
    </div>
  )
}
