'use client'
import Link from 'next/link'
import { Match } from '@/types'
import TeamFlag from '@/components/team-flag'

const SLOT_H = 120 // px height per base (R32) slot

const STAGE_LABELS: Record<string, string> = {
  round_of_32: '2da Ronda Eliminatoria',
  round_of_16: 'Octavos',
  quarter: 'Cuartos',
  semi: 'Semifinal',
  final: 'Final',
  third_place: '3er Puesto',
}

function MatchCard({ match }: { match: Match | null }) {
  if (!match) {
    return (
      <div className="w-full rounded-lg border border-dashed border-slate-700/50 bg-slate-800/20 overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <span className="text-slate-700 text-xs">—</span>
          <span className="text-slate-600 text-xs">Por definir</span>
        </div>
        <div className="border-t border-slate-700/40" />
        <div className="flex items-center gap-2 px-3 py-2.5">
          <span className="text-slate-700 text-xs">—</span>
          <span className="text-slate-600 text-xs">Por definir</span>
        </div>
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
      className="block w-full rounded-lg border border-slate-700 bg-slate-800 hover:border-yellow-500/50 transition overflow-hidden"
    >
      <div className={`flex items-center gap-2 px-3 py-2.5 ${homeWins ? 'bg-yellow-500/10' : ''}`}>
        <TeamFlag name={match.home_team} flagUrl={match.home_team_flag} size="sm" showName={false} />
        <span className={`text-xs truncate flex-1 ${homeWins ? 'text-white font-bold' : 'text-slate-300'}`}>
          {match.home_team}
        </span>
        {finished && (
          <span className={`text-xs font-bold tabular-nums w-4 text-right shrink-0 ${homeWins ? 'text-yellow-400' : 'text-slate-400'}`}>
            {match.home_score}
          </span>
        )}
      </div>
      <div className="border-t border-slate-700" />
      <div className={`flex items-center gap-2 px-3 py-2.5 ${awayWins ? 'bg-yellow-500/10' : ''}`}>
        <TeamFlag name={match.away_team} flagUrl={match.away_team_flag} size="sm" showName={false} />
        <span className={`text-xs truncate flex-1 ${awayWins ? 'text-white font-bold' : 'text-slate-300'}`}>
          {match.away_team}
        </span>
        {finished && (
          <span className={`text-xs font-bold tabular-nums w-4 text-right shrink-0 ${awayWins ? 'text-yellow-400' : 'text-slate-400'}`}>
            {match.away_score}
          </span>
        )}
      </div>
    </Link>
  )
}

// Column of matches. Each match is vertically centered in its slotH slot.
function RoundColumn({ matches, label, slotH }: {
  matches: (Match | null)[]
  label: string
  slotH: number
}) {
  const totalH = matches.length * slotH
  return (
    <div className="flex flex-col flex-1 min-w-0">
      <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider text-center pb-2">
        {label}
      </div>
      <div className="relative" style={{ height: totalH }}>
        {matches.map((match, i) => (
          <div
            key={match?.id ?? `e-${i}`}
            className="absolute w-full flex items-center px-1"
            style={{ top: i * slotH, height: slotH }}
          >
            <MatchCard match={match} />
          </div>
        ))}
      </div>
    </div>
  )
}

// SVG that draws bracket connector lines between two adjacent round columns.
// dir='right' → connects left column (outputs right) → right column (inputs left)
// The SVG sits between the two columns.
function Connector({ matchCount, slotH, dir }: {
  matchCount: number
  slotH: number
  dir: 'right' | 'left'
}) {
  const totalH = matchCount * slotH
  const half = 10  // half-width of SVG (vertical bar position)
  const W = half * 2

  const paths: string[] = []
  for (let i = 0; i < matchCount; i += 2) {
    const y1   = i * slotH + slotH / 2         // center of top match
    const ymid = i + 1 < matchCount
      ? ((i + 1) * slotH + slotH / 2 + y1) / 2  // midpoint between pair
      : y1                                         // single match: straight line

    if (i + 1 >= matchCount) {
      // Single match — just a straight horizontal line
      if (dir === 'right') paths.push(`M 0 ${y1} H ${W}`)
      else                  paths.push(`M ${W} ${y1} H 0`)
    } else {
      const y2 = (i + 1) * slotH + slotH / 2
      if (dir === 'right') {
        paths.push(`M 0 ${y1} H ${half} V ${y2} H 0 M ${half} ${ymid} H ${W}`)
      } else {
        paths.push(`M ${W} ${y1} H ${half} V ${y2} H ${W} M ${half} ${ymid} H 0`)
      }
    }
  }

  return (
    <svg
      width={W}
      height={totalH}
      className="shrink-0"
      style={{ marginTop: 25 /* offset for the label height */ }}
    >
      {paths.map((d, idx) => (
        <path key={idx} d={d} fill="none" stroke="#334155" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  )
}

export default function BracketClient({ matches }: { matches: Match[] }) {
  const byStage = (stage: string) =>
    matches
      .filter(m => m.stage === stage)
      .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())

  const r32 = byStage('round_of_32')
  const r16 = byStage('round_of_16')
  const qf  = byStage('quarter')
  const sf  = byStage('semi')
  const tp  = byStage('third_place')
  const fin = byStage('final')

  const has32 = r32.length > 0 || matches.length === 0

  const pad = <T,>(arr: T[], len: number, fill: T): T[] =>
    [...arr, ...Array(Math.max(0, len - arr.length)).fill(fill)]

  const r32P = pad<Match | null>(r32, 16, null)
  const r16P = pad<Match | null>(r16, 8, null)
  const qfP  = pad<Match | null>(qf, 4, null)
  const sfP  = pad<Match | null>(sf, 2, null)

  const r32L  = r32P.slice(0, 8)
  const r32RL = r32P.slice(8).reverse()
  const r16L  = r16P.slice(0, 4)
  const r16RL = r16P.slice(4).reverse()
  const qfL   = qfP.slice(0, 2)
  const qfRL  = qfP.slice(2).reverse()
  const sfL   = sfP.slice(0, 1)
  const sfRL  = sfP.slice(1).reverse()

  const s32  = SLOT_H
  const s16  = SLOT_H * 2
  const sqf  = SLOT_H * 4
  const ssf  = SLOT_H * 8
  const totalH = 8 * SLOT_H

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-start" style={{ minWidth: 900 }}>

        {/* LEFT SIDE */}
        {has32 && (
          <>
            <RoundColumn matches={r32L} label={STAGE_LABELS.round_of_32} slotH={s32} />
            <Connector matchCount={8} slotH={s32} dir="right" />
          </>
        )}
        <RoundColumn matches={r16L} label={STAGE_LABELS.round_of_16} slotH={s16} />
        <Connector matchCount={4} slotH={s16} dir="right" />
        <RoundColumn matches={qfL} label={STAGE_LABELS.quarter} slotH={sqf} />
        <Connector matchCount={2} slotH={sqf} dir="right" />
        <RoundColumn matches={sfL} label={STAGE_LABELS.semi} slotH={ssf} />
        <Connector matchCount={1} slotH={ssf} dir="right" />

        {/* CENTER */}
        <div className="flex flex-col items-center shrink-0 w-[140px]">
          <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider pb-2 text-center">
            {STAGE_LABELS.final}
          </div>
          <div className="flex flex-col justify-center gap-4 w-full px-1" style={{ height: totalH }}>
            <MatchCard match={fin[0] ?? null} />
            <div className="flex flex-col gap-1">
              <div className="text-[9px] text-slate-500 uppercase tracking-wider text-center">
                {STAGE_LABELS.third_place}
              </div>
              <MatchCard match={tp[0] ?? null} />
            </div>
          </div>
        </div>

        {/* RIGHT SIDE (mirrored) */}
        <Connector matchCount={1} slotH={ssf} dir="left" />
        <RoundColumn matches={sfRL} label={STAGE_LABELS.semi} slotH={ssf} />
        <Connector matchCount={2} slotH={sqf} dir="left" />
        <RoundColumn matches={qfRL} label={STAGE_LABELS.quarter} slotH={sqf} />
        <Connector matchCount={4} slotH={s16} dir="left" />
        <RoundColumn matches={r16RL} label={STAGE_LABELS.round_of_16} slotH={s16} />
        {has32 && (
          <>
            <Connector matchCount={8} slotH={s32} dir="left" />
            <RoundColumn matches={r32RL} label={STAGE_LABELS.round_of_32} slotH={s32} />
          </>
        )}

      </div>
    </div>
  )
}
