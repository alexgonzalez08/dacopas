import { Users } from 'lucide-react'

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

const POSITION_LABELS: Record<string, string> = {
  G: 'POR',
  D: 'DEF',
  M: 'MED',
  F: 'DEL',
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

function TeamLineup({ lineup }: { lineup: LineupTeam }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        {lineup.team.logo && (
          <img src={lineup.team.logo} alt={lineup.team.name} className="w-5 h-5 object-contain" />
        )}
        <p className="font-semibold text-sm">{lineup.team.name}</p>
      </div>
      <p className="text-xs text-slate-500 mb-3">Formación: {lineup.formation}</p>
      <div className="space-y-1">
        {lineup.startXI.map(({ player }) => (
          <div key={player.id} className="flex items-center gap-2 text-sm">
            <span className="w-5 text-center text-xs text-slate-500 font-mono">{player.number}</span>
            <span className="text-xs bg-slate-700 px-1.5 py-0.5 rounded text-slate-400">
              {POSITION_LABELS[player.pos] ?? player.pos}
            </span>
            <span className="text-slate-200">{player.name}</span>
          </div>
        ))}
      </div>
      {lineup.substitutes.length > 0 && (
        <>
          <p className="text-xs text-slate-500 mt-3 mb-1">Suplentes</p>
          <div className="space-y-1">
            {lineup.substitutes.map(({ player }) => (
              <div key={player.id} className="flex items-center gap-2 text-sm opacity-60">
                <span className="w-5 text-center text-xs text-slate-500 font-mono">{player.number}</span>
                <span className="text-xs bg-slate-700 px-1.5 py-0.5 rounded text-slate-400">
                  {POSITION_LABELS[player.pos] ?? player.pos}
                </span>
                <span className="text-slate-300">{player.name}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default async function Lineups({
  externalId,
  status,
}: {
  externalId: string
  status: string
}) {
  const lineups = await fetchLineups(externalId)

  if (!lineups) {
    return (
      <div className="bg-slate-800 rounded-2xl p-5">
        <h2 className="font-semibold mb-2 text-slate-300 flex items-center gap-2">
          <Users className="w-4 h-4" /> Alineaciones
        </h2>
        <p className="text-slate-500 text-sm">Estamos esperando que el árbitro confirme las alineaciones.</p>
      </div>
    )
  }

  return (
    <div className="bg-slate-800 rounded-2xl p-5">
      <h2 className="font-semibold mb-4 text-slate-300 flex items-center gap-2">
        <Users className="w-4 h-4" /> Alineaciones
      </h2>
      <div className="grid grid-cols-2 gap-6">
        {lineups.map((lineup) => (
          <TeamLineup key={lineup.team.id} lineup={lineup} />
        ))}
      </div>
    </div>
  )
}
