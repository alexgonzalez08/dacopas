'use client'
import Link from 'next/link'
import { Match } from '@/types'
import TeamFlag from '@/components/team-flag'

const STAGE_LABELS: Record<string, string> = {
  round_of_32: '16avos',
  round_of_16: 'Octavos',
  quarter: 'Cuartos',
  semi: 'Semifinal',
  final: 'Final',
  third_place: '3er Puesto',
}

function MatchCard({ match }: { match: Match | null }) {
  if (!match) {
    return (
      <div className="w-full rounded-xl border border-slate-700/50 bg-slate-800/40 overflow-hidden opacity-50">
        <div className="px-3 py-2 text-xs text-slate-500">Por definir</div>
        <div className="border-t border-slate-700/50" />
        <div className="px-3 py-2 text-xs text-slate-500">Por definir</div>
      </div>
    )
  }

  const finished = match.status === 'finished'

  const homeWins = finished && match.home_score !== null && match.away_score !== null &&
    (match.home_score > match.away_score ||
      (match.home_score === match.away_score && match.penalty_home !== null && match.penalty_away !== null && match.penalty_home > match.penalty_away))

  const awayWins = finished && match.home_score !== null && match.away_score !== null &&
    (match.away_score > match.home_score ||
      (match.home_score === match.away_score && match.penalty_home !== null && match.penalty_away !== null && match.penalty_away > match.penalty_home))

  return (
    <Link
      href={`/matches/${match.id}`}
      className="block w-full rounded-xl border border-slate-700 bg-slate-800 hover:border-yellow-500/40 transition overflow-hidden"
    >
      <div className={`flex items-center justify-between px-3 py-2 gap-2 ${homeWins ? 'bg-yellow-500/10' : ''}`}>
        <TeamFlag name={match.home_team} flagUrl={match.home_team_flag} size="sm" showName={false} />
        <span className={`text-xs truncate flex-1 ${homeWins ? 'text-white font-semibold' : 'text-slate-300'}`}>
          {match.home_team}
        </span>
        {finished && (
          <span className={`text-xs font-bold tabular-nums ${homeWins ? 'text-yellow-400' : 'text-slate-400'}`}>
            {match.home_score}
          </span>
        )}
      </div>
      <div className="border-t border-slate-700" />
      <div className={`flex items-center justify-between px-3 py-2 gap-2 ${awayWins ? 'bg-yellow-500/10' : ''}`}>
        <TeamFlag name={match.away_team} flagUrl={match.away_team_flag} size="sm" showName={false} />
        <span className={`text-xs truncate flex-1 ${awayWins ? 'text-white font-semibold' : 'text-slate-300'}`}>
          {match.away_team}
        </span>
        {finished && (
          <span className={`text-xs font-bold tabular-nums ${awayWins ? 'text-yellow-400' : 'text-slate-400'}`}>
            {match.away_score}
          </span>
        )}
      </div>
    </Link>
  )
}

// Renders a column of matches with vertical connectors going right
function RoundColumn({
  matches,
  label,
  connectorRight = false,
  connectorLeft = false,
}: {
  matches: (Match | null)[]
  label: string
  connectorRight?: boolean
  connectorLeft?: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-0 flex-1 min-w-0">
      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3">{label}</div>
      <div className="flex flex-col" style={{ gap: 0 }}>
        {matches.map((match, i) => {
          const isEven = i % 2 === 0
          // Each pair of matches is grouped with a connector
          return (
            <div key={match?.id ?? `empty-${i}`} className="relative flex items-center">
              {/* Left connector line */}
              {connectorLeft && (
                <div
                  className={`w-4 border-slate-600 ${isEven
                    ? 'border-t border-r rounded-tr-md self-end'
                    : 'border-b border-r rounded-br-md self-start'
                  }`}
                  style={{ height: '50%', alignSelf: isEven ? 'flex-end' : 'flex-start' }}
                />
              )}
              <div className="py-2">
                <MatchCard match={match} />
              </div>
              {/* Right connector line */}
              {connectorRight && (
                <div
                  className={`w-4 border-slate-600 ${isEven
                    ? 'border-t border-r rounded-tr-md'
                    : 'border-b border-r rounded-br-md'
                  }`}
                  style={{ height: '50%', alignSelf: isEven ? 'flex-end' : 'flex-start' }}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ConnectorColumn({ count }: { count: number }) {
  return (
    <div className="flex flex-col shrink-0 mt-[28px]">
      {Array.from({ length: count }).map((_, i) => {
        const isEven = i % 2 === 0
        return (
          <div
            key={i}
            className={`w-4 border-slate-600 flex-1 ${
              isEven ? 'border-t border-r rounded-tr-md' : 'border-b border-r rounded-br-md'
            }`}
            style={{ minHeight: 56 }}
          />
        )
      })}
    </div>
  )
}

function ConnectorColumnLeft({ count }: { count: number }) {
  return (
    <div className="flex flex-col shrink-0 mt-[28px]">
      {Array.from({ length: count }).map((_, i) => {
        const isEven = i % 2 === 0
        return (
          <div
            key={i}
            className={`w-4 border-slate-600 flex-1 ${
              isEven ? 'border-t border-l rounded-tl-md' : 'border-b border-l rounded-bl-md'
            }`}
            style={{ minHeight: 56 }}
          />
        )
      })}
    </div>
  )
}

export default function BracketClient({ matches }: { matches: Match[] }) {
  const byStage = (stage: string) =>
    matches.filter(m => m.stage === stage).sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())

  const r32 = byStage('round_of_32')
  const r16 = byStage('round_of_16')
  const qf = byStage('quarter')
  const sf = byStage('semi')
  const tp = byStage('third_place')
  const fin = byStage('final')

  const has32 = r32.length > 0 || matches.length === 0

  const pad = <T,>(arr: T[], len: number, fill: T): T[] =>
    [...arr, ...Array(Math.max(0, len - arr.length)).fill(fill)]

  // Pad each stage to its expected size, then split in half
  const r32Padded = pad<Match | null>(r32, 16, null)
  const r16Padded = pad<Match | null>(r16, 8, null)
  const qfPadded  = pad<Match | null>(qf, 4, null)
  const sfPadded  = pad<Match | null>(sf, 2, null)

  const r32L   = r32Padded.slice(0, 8)
  const r32RL  = r32Padded.slice(8).reverse()
  const r16L  = r16Padded.slice(0, 4)
  const r16RL = r16Padded.slice(4).reverse()
  const qfL   = qfPadded.slice(0, 2)
  const qfRL  = qfPadded.slice(2).reverse()
  const sfL   = sfPadded.slice(0, 1)
  const sfRL  = sfPadded.slice(1).reverse()

  return (
    <div className="w-full">
      <div className="flex items-start gap-0 w-full">

        {/* LEFT SIDE */}
        {has32 && (
          <>
            <RoundColumn matches={r32L} label={STAGE_LABELS.round_of_32} />
            <ConnectorColumn count={r32L.length} />
          </>
        )}

        <RoundColumn matches={r16L} label={STAGE_LABELS.round_of_16} />
        <ConnectorColumn count={r16L.length} />

        <RoundColumn matches={qfL} label={STAGE_LABELS.quarter} />
        <ConnectorColumn count={qfL.length} />

        <RoundColumn matches={sfL} label={STAGE_LABELS.semi} />
        <ConnectorColumn count={sfL.length} />

        {/* CENTER: Final + 3rd place */}
        <div className="flex flex-col items-center gap-4 shrink-0 mx-2">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3">
            {STAGE_LABELS.final}
          </div>
          <div className="flex flex-col items-center gap-2">
            <MatchCard match={fin[0] ?? null} />
            {tp.length > 0 && (
              <div className="mt-4 flex flex-col items-center gap-1">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">{STAGE_LABELS.third_place}</div>
                <MatchCard match={tp[0]} />
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SIDE (mirrored) */}
        <ConnectorColumnLeft count={sfRL.length} />
        <RoundColumn matches={sfRL} label={STAGE_LABELS.semi} />

        <ConnectorColumnLeft count={qfRL.length} />
        <RoundColumn matches={qfRL} label={STAGE_LABELS.quarter} />

        <ConnectorColumnLeft count={r16RL.length} />
        <RoundColumn matches={r16RL} label={STAGE_LABELS.round_of_16} />

        {has32 && (
          <>
            <ConnectorColumnLeft count={r32RL.length} />
            <RoundColumn matches={r32RL} label={STAGE_LABELS.round_of_32} />
          </>
        )}
      </div>
    </div>
  )
}
