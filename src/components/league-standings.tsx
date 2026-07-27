'use client'
import { useRef } from 'react'
import { Standing } from '@/lib/standings'
import ShareImageButton from '@/components/share-image-button'

export default function LeagueStandings({ standings, highlightTeams = [], title = 'Tabla de posiciones' }: { standings: Standing[]; highlightTeams?: string[]; title?: string }) {
  const cardRef = useRef<HTMLDivElement>(null)

  if (standings.length === 0) return null

  return (
    <div ref={cardRef} className="bg-slate-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-slate-300">{title}</h2>
        <div data-share-ignore="true">
          <ShareImageButton
            targetRef={cardRef}
            fileName={title.toLowerCase().replace(/\s+/g, '-')}
            shareTitle={title}
            shareText={title}
          />
        </div>
      </div>
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
                <td className="py-2 font-medium">{s.team}</td>
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
      </div>
    </div>
  )
}
