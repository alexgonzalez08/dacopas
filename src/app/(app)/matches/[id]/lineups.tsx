import { Users } from 'lucide-react'

type Player = {
  name: string
  position: string
  shirtNumber: number
}

type LineupTeam = {
  team: { name: string }
  formation: string
  startXI: { player: Player }[]
  bench: { player: Player }[]
}

async function fetchLineupsFromAPI(externalId: string): Promise<LineupTeam[] | null> {
  try {
    const res = await fetch(
      `https://api.football-data.org/v4/matches/${externalId}`,
      {
        headers: { 'X-Auth-Token': process.env.FOOTBALL_API_KEY! },
        next: { revalidate: 300 },
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    if (!data.lineups || data.lineups.length === 0) return null
    return data.lineups
  } catch {
    return null
  }
}

const POSITION_LABELS: Record<string, string> = {
  Goalkeeper: 'POR',
  Defender: 'DEF',
  Midfielder: 'MED',
  Forward: 'DEL',
}

function LineupDisplay({ lineups }: { lineups: LineupTeam[] }) {
  return (
    <div className="bg-slate-800 rounded-2xl p-5">
      <h2 className="font-semibold mb-4 text-slate-300 flex items-center gap-2">
        <Users className="w-4 h-4" /> Alineaciones
      </h2>
      <div className="grid grid-cols-2 gap-6">
        {lineups.map((lineup) => (
          <div key={lineup.team.name}>
            <p className="font-semibold text-sm mb-1">{lineup.team.name}</p>
            <p className="text-xs text-slate-500 mb-3">Formación: {lineup.formation}</p>
            <div className="space-y-1">
              {lineup.startXI.map(({ player }) => (
                <div key={player.shirtNumber} className="flex items-center gap-2 text-sm">
                  <span className="w-5 text-center text-xs text-slate-500 font-mono">{player.shirtNumber}</span>
                  <span className="text-xs bg-slate-700 px-1.5 py-0.5 rounded text-slate-400">
                    {POSITION_LABELS[player.position] ?? player.position}
                  </span>
                  <span className="text-slate-200">{player.name}</span>
                </div>
              ))}
            </div>
            {lineup.bench.length > 0 && (
              <>
                <p className="text-xs text-slate-500 mt-3 mb-1">Suplentes</p>
                <div className="space-y-1">
                  {lineup.bench.map(({ player }) => (
                    <div key={player.shirtNumber} className="flex items-center gap-2 text-sm opacity-60">
                      <span className="w-5 text-center text-xs text-slate-500 font-mono">{player.shirtNumber}</span>
                      <span className="text-xs bg-slate-700 px-1.5 py-0.5 rounded text-slate-400">
                        {POSITION_LABELS[player.position] ?? player.position}
                      </span>
                      <span className="text-slate-300">{player.name}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default async function Lineups({
  externalId,
  status,
  cachedLineups,
}: {
  externalId: string
  status: string
  cachedLineups?: LineupTeam[] | null
}) {
  // Si ya tenemos alineaciones guardadas en DB, mostrarlas directamente
  if (cachedLineups && cachedLineups.length > 0) {
    return <LineupDisplay lineups={cachedLineups} />
  }

  // Si el partido aún no empezó y no hay cache, mostrar mensaje de espera
  if (status === 'scheduled') {
    return (
      <div className="bg-slate-800 rounded-2xl p-5">
        <h2 className="font-semibold mb-2 text-slate-300 flex items-center gap-2">
          <Users className="w-4 h-4" /> Alineaciones
        </h2>
        <p className="text-slate-500 text-sm">
          Las alineaciones se publican aproximadamente 1 hora antes del partido.
        </p>
      </div>
    )
  }

  // Para partidos en curso o finalizados, intentar API en vivo como fallback
  const lineups = await fetchLineupsFromAPI(externalId)
  if (!lineups) {
    return (
      <div className="bg-slate-800 rounded-2xl p-5">
        <h2 className="font-semibold mb-2 text-slate-300 flex items-center gap-2">
          <Users className="w-4 h-4" /> Alineaciones
        </h2>
        <p className="text-slate-500 text-sm">Alineaciones no disponibles todavía.</p>
      </div>
    )
  }

  return <LineupDisplay lineups={lineups} />
}
