'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Match, Prediction } from '@/types'
import TeamFlag from '@/components/team-flag'
import { upsertPrediction, isPredictionLocked } from '@/lib/predictions'
import { CheckCircle2, Lock, Loader2 } from 'lucide-react'

const SLOT_H = 120

const STAGE_LABELS: Record<string, string> = {
  round_of_32: '2da Ronda Eliminatoria',
  round_of_16: 'Octavos',
  quarter: 'Cuartos',
  semi: 'Semifinal',
  final: 'Final',
  third_place: '3er Puesto',
}

type MatchWithPred = Match & { prediction: Prediction | null }

function MatchCard({
  match,
  userId,
  scores,
  onScoreChange,
  onSave,
  saving,
  saved,
}: {
  match: MatchWithPred | null
  userId: string
  scores: Record<number, { home: string; away: string }>
  onScoreChange: (id: number, side: 'home' | 'away', val: string) => void
  onSave: (match: MatchWithPred) => void
  saving: Record<number, boolean>
  saved: Record<number, boolean>
}) {
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
  const locked = isPredictionLocked(match)
  const s = scores[match.id] ?? { home: '', away: '' }
  const isDirty = s.home !== String(match.prediction?.home_score ?? '') ||
                  s.away !== String(match.prediction?.away_score ?? '')
  const canSave = s.home !== '' && s.away !== '' && isDirty && !locked

  const homeWins = finished && match.home_score !== null && match.away_score !== null &&
    (match.home_score > match.away_score ||
      (match.home_score === match.away_score && match.penalty_home !== null && match.penalty_away !== null && match.penalty_home > match.penalty_away))
  const awayWins = finished && match.home_score !== null && match.away_score !== null &&
    (match.away_score > match.home_score ||
      (match.home_score === match.away_score && match.penalty_home !== null && match.penalty_away !== null && match.penalty_away > match.penalty_home))

  return (
    <div className="w-full rounded-lg border border-slate-700 bg-slate-800 overflow-hidden">
      {/* Home row */}
      <div className={`flex items-center gap-1.5 px-2 py-2 ${homeWins ? 'bg-yellow-500/10' : ''}`}>
        <TeamFlag name={match.home_team} flagUrl={match.home_team_flag} size="md" showName={false} />
        <Link href={`/matches/${match.id}`} className="text-xs truncate flex-1 hover:text-yellow-400 transition hidden md:block">
          <span className={homeWins ? 'text-white font-bold' : 'text-slate-300'}>{match.home_team}</span>
        </Link>
        {finished ? (
          <span className={`text-xs font-bold tabular-nums w-5 text-right shrink-0 ${homeWins ? 'text-yellow-400' : 'text-slate-400'}`}>
            {match.home_score}
          </span>
        ) : locked ? (
          <span className="text-xs tabular-nums w-5 text-right shrink-0 text-slate-500">
            {match.prediction?.home_score ?? '—'}
          </span>
        ) : (
          <input
            type="number"
            min={0}
            max={99}
            value={s.home}
            onChange={e => onScoreChange(match.id, 'home', e.target.value)}
            onBlur={() => canSave && onSave(match)}
            className="w-7 shrink-0 bg-slate-700 border border-slate-600 rounded text-xs text-center text-white tabular-nums focus:outline-none focus:border-yellow-500 py-0.5"
            placeholder="—"
          />
        )}
      </div>

      <div className="border-t border-slate-700" />

      {/* Away row */}
      <div className={`flex items-center gap-1.5 px-2 py-2 ${awayWins ? 'bg-yellow-500/10' : ''}`}>
        <TeamFlag name={match.away_team} flagUrl={match.away_team_flag} size="md" showName={false} />
        <Link href={`/matches/${match.id}`} className="text-xs truncate flex-1 hover:text-yellow-400 transition hidden md:block">
          <span className={awayWins ? 'text-white font-bold' : 'text-slate-300'}>{match.away_team}</span>
        </Link>
        {finished ? (
          <span className={`text-xs font-bold tabular-nums w-5 text-right shrink-0 ${awayWins ? 'text-yellow-400' : 'text-slate-400'}`}>
            {match.away_score}
          </span>
        ) : locked ? (
          <span className="text-xs tabular-nums w-5 text-right shrink-0 text-slate-500">
            {match.prediction?.away_score ?? '—'}
          </span>
        ) : (
          <input
            type="number"
            min={0}
            max={99}
            value={s.away}
            onChange={e => onScoreChange(match.id, 'away', e.target.value)}
            onBlur={() => canSave && onSave(match)}
            className="w-7 shrink-0 bg-slate-700 border border-slate-600 rounded text-xs text-center text-white tabular-nums focus:outline-none focus:border-yellow-500 py-0.5"
            placeholder="—"
          />
        )}
      </div>

      {/* Save indicator */}
      {!finished && !locked && (
        <div className="flex items-center justify-end px-2 py-1 border-t border-slate-700/50">
          {saving[match.id] ? (
            <Loader2 size={10} className="animate-spin text-slate-500" />
          ) : saved[match.id] ? (
            <CheckCircle2 size={10} className="text-green-400" />
          ) : canSave ? (
            <button
              onClick={() => onSave(match)}
              className="text-[9px] text-yellow-400 hover:text-yellow-300 font-medium"
            >
              Guardar
            </button>
          ) : match.prediction ? (
            <CheckCircle2 size={10} className="text-slate-600" />
          ) : (
            <span className="text-[9px] text-slate-600">Sin predicción</span>
          )}
        </div>
      )}

      {locked && !finished && (
        <div className="flex items-center gap-1 px-2 py-1 border-t border-slate-700/50">
          <Lock size={9} className="text-slate-600" />
          <span className="text-[9px] text-slate-600">Cerrado</span>
        </div>
      )}
    </div>
  )
}

function RoundColumn({ matches, label, slotH, userId, scores, onScoreChange, onSave, saving, saved }: {
  matches: (MatchWithPred | null)[]
  label: string
  slotH: number
  userId: string
  scores: Record<number, { home: string; away: string }>
  onScoreChange: (id: number, side: 'home' | 'away', val: string) => void
  onSave: (match: MatchWithPred) => void
  saving: Record<number, boolean>
  saved: Record<number, boolean>
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
            <MatchCard
              match={match}
              userId={userId}
              scores={scores}
              onScoreChange={onScoreChange}
              onSave={onSave}
              saving={saving}
              saved={saved}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function Connector({ matchCount, slotH, dir }: {
  matchCount: number
  slotH: number
  dir: 'right' | 'left'
}) {
  const totalH = matchCount * slotH
  const half = 10
  const W = half * 2

  const paths: string[] = []
  for (let i = 0; i < matchCount; i += 2) {
    const y1   = i * slotH + slotH / 2
    const ymid = i + 1 < matchCount
      ? ((i + 1) * slotH + slotH / 2 + y1) / 2
      : y1

    if (i + 1 >= matchCount) {
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
    <svg width={W} height={totalH} className="shrink-0" style={{ marginTop: 25 }}>
      {paths.map((d, idx) => (
        <path key={idx} d={d} fill="none" stroke="#334155" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  )
}

export default function BracketClient({ matches, userId }: { matches: MatchWithPred[]; userId: string }) {
  const [scores, setScores] = useState<Record<number, { home: string; away: string }>>(() => {
    const init: Record<number, { home: string; away: string }> = {}
    matches.forEach(m => {
      init[m.id] = {
        home: m.prediction ? String(m.prediction.home_score) : '',
        away: m.prediction ? String(m.prediction.away_score) : '',
      }
    })
    return init
  })
  const [saving, setSaving] = useState<Record<number, boolean>>({})
  const [saved, setSaved] = useState<Record<number, boolean>>({})

  function handleScoreChange(id: number, side: 'home' | 'away', val: string) {
    setScores(prev => ({ ...prev, [id]: { ...prev[id], [side]: val } }))
    setSaved(prev => ({ ...prev, [id]: false }))
  }

  async function handleSave(match: MatchWithPred) {
    const s = scores[match.id]
    const home = parseInt(s.home)
    const away = parseInt(s.away)
    if (isNaN(home) || isNaN(away) || home < 0 || away < 0) return
    setSaving(v => ({ ...v, [match.id]: true }))
    try {
      await upsertPrediction(userId, match.id, home, away)
      setSaved(v => ({ ...v, [match.id]: true }))
      setTimeout(() => setSaved(v => ({ ...v, [match.id]: false })), 2000)
    } catch {
      // silently fail — user can retry
    } finally {
      setSaving(v => ({ ...v, [match.id]: false }))
    }
  }

  const byStage = (stage: string) =>
    matches.filter(m => m.stage === stage).sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())

  const r32 = byStage('round_of_32')
  const r16 = byStage('round_of_16')
  const qf  = byStage('quarter')
  const sf  = byStage('semi')
  const tp  = byStage('third_place')
  const fin = byStage('final')

  const has32 = r32.length > 0 || matches.length === 0

  const pad = <T,>(arr: T[], len: number, fill: T): T[] =>
    [...arr, ...Array(Math.max(0, len - arr.length)).fill(fill)]

  const r32P = pad<MatchWithPred | null>(r32, 16, null)
  const r16P = pad<MatchWithPred | null>(r16, 8, null)
  const qfP  = pad<MatchWithPred | null>(qf, 4, null)
  const sfP  = pad<MatchWithPred | null>(sf, 2, null)

  const r32L  = r32P.slice(0, 8)
  const r32RL = r32P.slice(8).reverse()
  const r16L  = r16P.slice(0, 4)
  const r16RL = r16P.slice(4).reverse()
  const qfL   = qfP.slice(0, 2)
  const qfRL  = qfP.slice(2).reverse()
  const sfL   = sfP.slice(0, 1)
  const sfRL  = sfP.slice(1).reverse()

  const s32 = SLOT_H
  const s16 = SLOT_H * 2
  const sqf = SLOT_H * 4
  const ssf = SLOT_H * 8
  const totalH = 8 * SLOT_H

  const colProps = { userId, scores, onScoreChange: handleScoreChange, onSave: handleSave, saving, saved }

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-start" style={{ minWidth: 900 }}>

        {has32 && (
          <>
            <RoundColumn matches={r32L} label={STAGE_LABELS.round_of_32} slotH={s32} {...colProps} />
            <Connector matchCount={8} slotH={s32} dir="right" />
          </>
        )}
        <RoundColumn matches={r16L} label={STAGE_LABELS.round_of_16} slotH={s16} {...colProps} />
        <Connector matchCount={4} slotH={s16} dir="right" />
        <RoundColumn matches={qfL} label={STAGE_LABELS.quarter} slotH={sqf} {...colProps} />
        <Connector matchCount={2} slotH={sqf} dir="right" />
        <RoundColumn matches={sfL} label={STAGE_LABELS.semi} slotH={ssf} {...colProps} />
        <Connector matchCount={1} slotH={ssf} dir="right" />

        {/* CENTER */}
        <div className="flex flex-col items-center shrink-0 w-[140px]">
          <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider pb-2 text-center">
            {STAGE_LABELS.final}
          </div>
          <div className="flex flex-col justify-center gap-4 w-full px-1" style={{ height: totalH }}>
            <MatchCard match={fin[0] ?? null} {...colProps} />
            <div className="flex flex-col gap-1">
              <div className="text-[9px] text-slate-500 uppercase tracking-wider text-center">
                {STAGE_LABELS.third_place}
              </div>
              <MatchCard match={tp[0] ?? null} {...colProps} />
            </div>
          </div>
        </div>

        <Connector matchCount={1} slotH={ssf} dir="left" />
        <RoundColumn matches={sfRL} label={STAGE_LABELS.semi} slotH={ssf} {...colProps} />
        <Connector matchCount={2} slotH={sqf} dir="left" />
        <RoundColumn matches={qfRL} label={STAGE_LABELS.quarter} slotH={sqf} {...colProps} />
        <Connector matchCount={4} slotH={s16} dir="left" />
        <RoundColumn matches={r16RL} label={STAGE_LABELS.round_of_16} slotH={s16} {...colProps} />
        {has32 && (
          <>
            <Connector matchCount={8} slotH={s32} dir="left" />
            <RoundColumn matches={r32RL} label={STAGE_LABELS.round_of_32} slotH={s32} {...colProps} />
          </>
        )}

      </div>
    </div>
  )
}
