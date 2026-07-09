const SCORING_ROWS: { finalists: boolean; score: boolean; penalty: boolean; pts: number }[] = [
  { finalists: true, score: true, penalty: true, pts: 15 },
  { finalists: true, score: true, penalty: false, pts: 12 },
  { finalists: true, score: false, penalty: true, pts: 10 },
  { finalists: true, score: false, penalty: false, pts: 8 },
  { finalists: false, score: true, penalty: true, pts: 5 },
  { finalists: false, score: true, penalty: false, pts: 3 },
  { finalists: false, score: false, penalty: true, pts: 2 },
  { finalists: false, score: false, penalty: false, pts: 1 },
]

export default function ChampionScoringTable() {
  return (
    <div>
      <p className="text-xs text-slate-400 text-center mb-3">Sin el campeón correcto no sumás puntos. Con el campeón acertado:</p>
      <table className="w-full text-center border-collapse">
        <thead>
          <tr className="text-[9px] text-slate-500 uppercase tracking-wide">
            <th className="pb-1.5 font-medium">Finalistas</th>
            <th className="pb-1.5 font-medium">Marcador</th>
            <th className="pb-1.5 font-medium">Penales</th>
            <th className="pb-1.5 font-medium">Pts</th>
          </tr>
        </thead>
        <tbody>
          {SCORING_ROWS.map((row, i) => (
            <tr key={i} className="border-t border-slate-800">
              <td className="py-1.5 text-sm">{row.finalists ? '✓' : <span className="text-slate-600">—</span>}</td>
              <td className="py-1.5 text-sm">{row.score ? '✓' : <span className="text-slate-600">—</span>}</td>
              <td className="py-1.5 text-sm">{row.penalty ? '✓' : <span className="text-slate-600">—</span>}</td>
              <td className="py-1.5 text-sm font-bold text-yellow-400">{row.pts}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[10px] text-slate-500 text-center mt-2">
        "Penales" = predijiste empate y acertaste quién gana la tanda
      </p>
    </div>
  )
}
