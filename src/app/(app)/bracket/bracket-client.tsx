'use client'
import Link from 'next/link'
import { Match } from '@/types'
import TeamFlag from '@/components/team-flag'

const SLOT_H = 96 // px height per base (R32) slot

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
      <div className="w-full rounded-lg border border-slate-700/40 bg-slate-800/30 overflow-hidden">
        <div className="flex items-center gap-2 px-2 py-2">
          <span className="text-slate-600 text-[10px]">—</span>
          <span className="text-slate-600 text-[11px]">Por definir</span>
        </div>
        <div className="border-t border-slate-700/40" />
        <div className="flex items-center gap-2 px-2 py-2">
          <span className="text-slate-600 text-[10px]">—</span>
          <span className="text-slate-600 text-[11px]">Por definir</span>
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
      <div className={`flex items-center gap-2 px-2 py-2 ${homeWins ? 'bg-yellow-500/10' : ''}`}>
        <TeamFlag name={match.home_team} flagUrl={match.home_team_flag} size="sm" showName={false} />
        <span className={`text-[11px] truncate flex-1 ${homeWins ? 'text-white font-bold' : 'text-slate-300'}`}>
          {match.home_team}
        </span>
        {finished && (
          <span className={`text-[11px] font-bold tabular-nums w-4 text-right ${homeWins ? 'text-yellow-400' : 'text-slate-400'}`}>
            {match.home_score}
          </span>
        )}
      </div>
      <div className="border-t border-slate-700" />
      <div className={`flex items-center gap-2 px-2 py-2 ${awayWins ? 'bg-yellow-500/10' : ''}`}>
        <TeamFlag name={match.away_team} flagUrl={match.away_team_flag} size="sm" showName={false} />
        <span className={`text-[11px] truncate flex-1 ${awayWins ? 'text-white font-bold' : 'text-slate-300'}`}>
          {match.away_team}
        </span>
        {finished && (
          <span className={`text-[11px] font-bold tabular-nums w-4 text-right ${awayWins ? 'text-yellow-400' : 'text-slate-400'}`}>
            {match.away_score}
          </span>
        )}
      </div>
    </Link>
  )
}

// A single column of matches, each centered in a slot of `slotH` px.
// `connector` draws bracket lines on the given side.
function RoundColumn({
  matches,
  label,
  slotH,
  connector,
}: {
  matches: (Match | null)[]
  label: string
  slotH: number
  connector?: 'right' | 'left' | 'none'
}) {
  const totalH = matches.length * slotH
  const side = connector ?? 'none'

  return (
    <div className="flex flex-col flex-1 min-w-0">
      <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider text-center pb-2">
        {label}
      </div>
      <div className="relative" style={{ height: totalH }}>
        {matches.map((match, i) => (
          <div
            key={match?.id ?? `e-${i}`}
            className="absolute w-full flex items-center"
            style={{ top: i * slotH, height: slotH }}
          >
            {/* Bracket line on the right side */}
            {side === 'right' && (
              <div
                className="absolute right-0 border-slate-600"
                style={{
                  width: 8,
                  top: i % 2 === 0 ? '50%' : 0,
                  bottom: i % 2 === 0 ? 0 : '50%',
                  borderTop: i % 2 === 0 ? '1px solid' : undefined,
                  borderBottom: i % 2 === 1 ? '1px solid' : undefined,
                  borderRight: '1px solid',
                  borderColor: '#475569',
                }}
              />
            )}
            {/* Bracket line on the left side */}
            {side === 'left' && (
              <div
                className="absolute left-0 border-slate-600"
                style={{
                  width: 8,
                  top: i % 2 === 0 ? '50%' : 0,
                  bottom: i % 2 === 0 ? 0 : '50%',
                  borderTop: i % 2 === 0 ? '1px solid' : undefined,
                  borderBottom: i % 2 === 1 ? '1px solid' : undefined,
                  borderLeft: '1px solid',
                  borderColor: '#475569',
                }}
              />
            )}
            <div className="w-full px-2">
              <MatchCard match={match} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// SVG connector between two columns — draws the bracket lines linking pairs
function Connector({ matchCount, slotH, dir }: { matchCount: number; slotH: number; dir: 'right' | 'left' }) {
  const totalH = matchCount * slotH
  const w = 12

  const paths: string[] = []
  for (let i = 0; i < matchCount; i += 2) {
    const y1 = i * slotH + slotH / 2
    const y2 = (i + 1) * slotH + slotH / 2
    const ymid = (y1 + y2) / 2
    if (dir === 'right') {
      // lines come from left, meet in middle, exit right at ymid
      paths.push(`M 0 ${y1} H ${w} V ${y2} H 0`)
      paths.push(`M ${w} ${ymid} H ${w * 2}`)
    } else {
      // mirrored
      paths.push(`M ${w * 2} ${y1} H ${w} V ${y2} H ${w * 2}`)
      paths.push(`M ${w} ${ymid} H 0`)
    }
  }

  return (
    <svg
      width={w * 2}
      height={totalH}
      className="shrink-0 mt-[25px]"
      style={{ overflow: 'visible' }}
    >
      {paths.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="#475569" strokeWidth={1} />
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

  const finMatch = fin[0] ?? null
  const tpMatch  = tp[0] ?? null

  // slot heights per stage (doubles each round)
  const s32 = SLOT_H
  const s16 = SLOT_H * 2
  const sqf = SLOT_H * 4
  const ssf = SLOT_H * 8
  const totalH = 8 * SLOT_H

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-start w-full min-w-[640px]">

        {/* LEFT SIDE */}
        {has32 && (
          <>
            <RoundColumn matches={r32L} label={STAGE_LABELS.round_of_32} slotH={s32} connector="right" />
            <Connector matchCount={8} slotH={s32} dir="right" />
          </>
        )}

        <RoundColumn matches={r16L} label={STAGE_LABELS.round_of_16} slotH={s16} connector="right" />
        <Connector matchCount={4} slotH={s16} dir="right" />

        <RoundColumn matches={qfL} label={STAGE_LABELS.quarter} slotH={sqf} connector="right" />
        <Connector matchCount={2} slotH={sqf} dir="right" />

        <RoundColumn matches={sfL} label={STAGE_LABELS.semi} slotH={ssf} connector="right" />
        <Connector matchCount={1} slotH={ssf} dir="right" />

        {/* CENTER */}
        <div className="flex flex-col items-center shrink-0 min-w-[120px] max-w-[160px] flex-1">
          <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider pb-2">
            {STAGE_LABELS.final}
          </div>
          <div
            className="flex flex-col items-stretch justify-center gap-3 w-full"
            style={{ height: totalH }}
          >
            <MatchCard match={finMatch} />
            <div className="border-t border-slate-700/40 mx-2" />
            <div className="text-[9px] text-slate-500 uppercase tracking-wider text-center">
              {STAGE_LABELS.third_place}
            </div>
            <MatchCard match={tpMatch} />
          </div>
        </div>

        {/* RIGHT SIDE (mirrored) */}
        <Connector matchCount={1} slotH={ssf} dir="left" />
        <RoundColumn matches={sfRL} label={STAGE_LABELS.semi} slotH={ssf} connector="left" />

        <Connector matchCount={2} slotH={sqf} dir="left" />
        <RoundColumn matches={qfRL} label={STAGE_LABELS.quarter} slotH={sqf} connector="left" />

        <Connector matchCount={4} slotH={s16} dir="left" />
        <RoundColumn matches={r16RL} label={STAGE_LABELS.round_of_16} slotH={s16} connector="left" />

        {has32 && (
          <>
            <Connector matchCount={8} slotH={s32} dir="left" />
            <RoundColumn matches={r32RL} label={STAGE_LABELS.round_of_32} slotH={s32} connector="left" />
          </>
        )}

      </div>
    </div>
  )
}
