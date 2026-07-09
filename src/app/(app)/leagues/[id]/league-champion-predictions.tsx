'use client'
import TeamFlag from '@/components/team-flag'

export type ChampionPredictionEntry = {
  user_id: string
  username: string
  champion_team: string | null
  finalist_team: string | null
  champion_score: number | null
  runner_up_score: number | null
  penalty_winner: 'champion' | 'runner_up' | null
  points: number | null
}

export default function LeagueChampionPredictions({
  entries,
  revealed,
  currentUserId,
}: {
  entries: ChampionPredictionEntry[]
  revealed: boolean
  currentUserId: string
}) {
  if (entries.length === 0) return null

  return (
    <div className="bg-slate-800 rounded-2xl p-4">
      <h2 className="font-semibold mb-3 text-slate-300 flex items-center gap-2">
        <span className="text-lg">🏆</span> Predicción Campeón
      </h2>

      {!revealed ? (
        <p className="text-xs text-slate-500 text-center py-2">🔒 Las predicciones se revelan cuando termine la final</p>
      ) : (
        <div className="space-y-1.5">
          {entries.map(entry => {
            const isMe = entry.user_id === currentUserId
            const hasPred = entry.champion_team && entry.finalist_team
            const predictedTie = hasPred && entry.champion_score === entry.runner_up_score
            const penaltyPickName = entry.penalty_winner === 'champion' ? entry.champion_team
              : entry.penalty_winner === 'runner_up' ? entry.finalist_team
              : null
            return (
              <div
                key={entry.user_id}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl ${
                  entry.points !== null
                    ? entry.points >= 10 ? 'bg-purple-500/10 border border-purple-500/20'
                    : entry.points >= 3 ? 'bg-green-500/10 border border-green-500/20'
                    : entry.points >= 1 ? 'bg-yellow-500/10 border border-yellow-500/20'
                    : 'bg-red-500/10 border border-red-500/20'
                    : isMe ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-slate-700/40'
                }`}
              >
                <span className={`text-xs font-medium flex-1 truncate ${isMe ? 'text-yellow-400' : 'text-slate-300'}`}>
                  @{entry.username}
                </span>
                {hasPred ? (
                  <div className="shrink-0 text-right">
                    <div className="flex items-center gap-1.5">
                      <TeamFlag name={entry.champion_team!} size="sm" showName={false} />
                      <span className="text-sm font-bold text-white">{entry.champion_score}-{entry.runner_up_score}</span>
                      <TeamFlag name={entry.finalist_team!} size="sm" showName={false} />
                    </div>
                    {predictedTie && penaltyPickName && (
                      <p className="text-[10px] text-slate-400 mt-0.5">🥅 {penaltyPickName}</p>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-slate-500 shrink-0">Sin pronóstico</span>
                )}
                <span className={`text-xs font-bold shrink-0 w-12 text-right ${
                  entry.points === null ? 'text-slate-600' :
                  entry.points >= 10 ? 'text-purple-400' :
                  entry.points >= 3 ? 'text-green-400' :
                  entry.points >= 1 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {entry.points !== null ? `${entry.points} pts` : '— pts'}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
