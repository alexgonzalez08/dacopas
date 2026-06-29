'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { Match, Prediction } from '@/types'
import TeamFlag from '@/components/team-flag'
import { upsertPrediction, isPredictionLocked } from '@/lib/predictions'
import { CheckCircle2, Lock, Loader2 } from 'lucide-react'

const SLOT_H = 160

const STAGE_LABELS: Record<string, string> = {
  round_of_32: 'Ronda de 32',
  round_of_16: 'Octavos',
  quarter: 'Cuartos',
  semi: 'Semifinal',
  final: 'Final',
  third_place: '3er Puesto',
}

type MatchWithPred = Match & { prediction: Prediction | null }

type TeamInfo = { name: string; flag: string | null }

type CardSharedProps = {
  userId: string
  scores: Record<number, { home: string; away: string }>
  penalty: Record<number, 'home' | 'away' | null>
  hasPrediction: Record<number, boolean>
  onScoreChange: (id: number, side: 'home' | 'away', val: string) => void
  onPenaltyChange: (id: number, winner: 'home' | 'away' | null) => void
  onSave: (match: MatchWithPred) => void
  saving: Record<number, boolean>
  saved: Record<number, boolean>
  highlightMatchId?: number
  highlightRef?: React.RefObject<HTMLDivElement | null>
  winnerMap: Map<string, TeamInfo>
}

function PendingTeamRow({ team }: { team: TeamInfo | null }) {
  if (!team) {
    return (
      <div className="flex items-center gap-2 px-3 py-3">
        <span className="text-slate-700 text-xs">—</span>
        <span className="text-slate-600 text-xs">Por definir</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 px-3 py-3">
      <TeamFlag name={team.name} flagUrl={team.flag} size="lg" showName={false} />
      <span className="text-xs text-slate-400 truncate">{team.name}</span>
    </div>
  )
}

function MatchCard({
  match,
  pendingHome,
  pendingAway,
  ...shared
}: CardSharedProps & { match: MatchWithPred | null; pendingHome?: TeamInfo | null; pendingAway?: TeamInfo | null }) {
  const { scores, penalty, hasPrediction, onScoreChange, onPenaltyChange, onSave, saving, saved, highlightMatchId, highlightRef } = shared
  const isHighlighted = match != null && highlightMatchId === match.id

  if (!match) {
    return (
      <div className="w-full rounded-lg border border-dashed border-slate-700/50 bg-slate-800/20 overflow-hidden">
        <PendingTeamRow team={pendingHome ?? null} />
        <div className="border-t border-slate-700/40" />
        <PendingTeamRow team={pendingAway ?? null} />
      </div>
    )
  }

  const finished = match.status === 'finished'
  const locked = isPredictionLocked(match)
  const s = scores[match.id] ?? { home: '', away: '' }
  const pw = penalty[match.id] ?? null
  const homeNum = parseInt(s.home)
  const awayNum = parseInt(s.away)
  const isDraw = !isNaN(homeNum) && !isNaN(awayNum) && homeNum === awayNum
  const showPenalty = !finished && !locked && isDraw
  const isDirty = s.home !== String(match.prediction?.home_score ?? '') ||
                  s.away !== String(match.prediction?.away_score ?? '') ||
                  pw !== (match.prediction?.penalty_winner ?? null)
  const canSave = s.home !== '' && s.away !== '' && (!isDraw || pw !== null) && isDirty && !locked

  const homeWins = finished && match.home_score !== null && match.away_score !== null &&
    (match.home_score > match.away_score ||
      (match.home_score === match.away_score && match.penalty_home !== null && match.penalty_away !== null && match.penalty_home > match.penalty_away))
  const awayWins = finished && match.home_score !== null && match.away_score !== null &&
    (match.away_score > match.home_score ||
      (match.home_score === match.away_score && match.penalty_home !== null && match.penalty_away !== null && match.penalty_away > match.penalty_home))

  return (
    <div
      ref={isHighlighted ? highlightRef : undefined}
      className={`w-full rounded-lg border bg-slate-800 overflow-hidden ${isHighlighted ? 'border-yellow-400 ring-2 ring-yellow-400/30' : 'border-slate-700'}`}
    >
      {/* Home row */}
      <div className={`flex items-center gap-2 px-3 py-3 ${homeWins ? 'bg-yellow-500/10' : ''}`}>
        <TeamFlag name={match.home_team} flagUrl={match.home_team_flag} size="lg" showName={false} />
        <Link href={`/matches/${match.id}`} className="text-xs truncate flex-1 hover:text-yellow-400 transition">
          <span className={homeWins ? 'text-white font-bold' : 'text-slate-300'}>{match.home_team}</span>
        </Link>
        {finished ? (
          <span className={`text-sm font-bold tabular-nums w-6 text-right shrink-0 ${homeWins ? 'text-yellow-400' : 'text-slate-400'}`}>
            {match.home_score}
          </span>
        ) : locked ? (
          <span className="text-sm tabular-nums w-6 text-right shrink-0 text-slate-500">
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
            className="w-9 shrink-0 bg-slate-700 border border-slate-600 rounded text-sm text-center text-white tabular-nums focus:outline-none focus:border-yellow-500 py-1"
            placeholder="—"
          />
        )}
      </div>

      <div className="border-t border-slate-700" />

      {/* Away row */}
      <div className={`flex items-center gap-2 px-3 py-3 ${awayWins ? 'bg-yellow-500/10' : ''}`}>
        <TeamFlag name={match.away_team} flagUrl={match.away_team_flag} size="lg" showName={false} />
        <Link href={`/matches/${match.id}`} className="text-xs truncate flex-1 hover:text-yellow-400 transition">
          <span className={awayWins ? 'text-white font-bold' : 'text-slate-300'}>{match.away_team}</span>
        </Link>
        {finished ? (
          <span className={`text-sm font-bold tabular-nums w-6 text-right shrink-0 ${awayWins ? 'text-yellow-400' : 'text-slate-400'}`}>
            {match.away_score}
          </span>
        ) : locked ? (
          <span className="text-sm tabular-nums w-6 text-right shrink-0 text-slate-500">
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
            className="w-9 shrink-0 bg-slate-700 border border-slate-600 rounded text-sm text-center text-white tabular-nums focus:outline-none focus:border-yellow-500 py-1"
            placeholder="—"
          />
        )}
      </div>

      {/* Penalty winner selector */}
      {showPenalty && (
        <div className="flex items-center gap-1 px-3 py-1.5 border-t border-slate-700/50">
          <span className="text-[10px] text-slate-500 shrink-0">Pen:</span>
          <button
            onClick={() => onPenaltyChange(match.id, pw === 'home' ? null : 'home')}
            className={`flex-1 flex justify-center py-0.5 rounded transition ${pw === 'home' ? 'bg-yellow-500/20 ring-1 ring-yellow-500/40' : 'opacity-50 hover:opacity-80'}`}
          >
            <TeamFlag name={match.home_team} flagUrl={match.home_team_flag} size="sm" showName={false} />
          </button>
          <button
            onClick={() => onPenaltyChange(match.id, pw === 'away' ? null : 'away')}
            className={`flex-1 flex justify-center py-0.5 rounded transition ${pw === 'away' ? 'bg-yellow-500/20 ring-1 ring-yellow-500/40' : 'opacity-50 hover:opacity-80'}`}
          >
            <TeamFlag name={match.away_team} flagUrl={match.away_team_flag} size="sm" showName={false} />
          </button>
        </div>
      )}

      {/* Penalty result (finished match) */}
      {finished && match.penalty_home !== null && match.penalty_away !== null && (
        <div className="px-3 py-1 border-t border-slate-700/50">
          <span className="text-[10px] text-slate-500">Pen. {match.penalty_home}-{match.penalty_away}</span>
        </div>
      )}

      {/* User prediction for finished matches */}
      {finished && match.prediction && (
        <div className="px-3 py-1 border-t border-slate-700/50 flex items-center gap-1">
          <span className="text-[10px] text-slate-500">Tu pred:</span>
          <span className="text-[10px] text-slate-400 tabular-nums">
            {match.prediction.home_score}-{match.prediction.away_score}
            {match.prediction.penalty_winner && (
              <span className="text-yellow-500/70 ml-1">
                (pen. {match.prediction.penalty_winner === 'home' ? match.home_team : match.away_team})
              </span>
            )}
          </span>
        </div>
      )}

      {/* Locked penalty info */}
      {locked && !finished && match.prediction?.penalty_winner && (
        <div className="px-3 py-1 border-t border-slate-700/50">
          <span className="text-[10px] text-slate-500">
            Pen: <span className="text-yellow-400">
              {match.prediction.penalty_winner === 'home' ? match.home_team : match.away_team}
            </span>
          </span>
        </div>
      )}

      {/* Save indicator */}
      {!finished && !locked && (
        <div className="flex items-center justify-end px-3 py-1 border-t border-slate-700/50">
          {saving[match.id] ? (
            <Loader2 size={11} className="animate-spin text-slate-500" />
          ) : saved[match.id] ? (
            <CheckCircle2 size={11} className="text-green-400" />
          ) : canSave ? (
            <button onClick={() => onSave(match)} className="text-[10px] text-yellow-400 hover:text-yellow-300 font-medium">
              {hasPrediction[match.id] ? 'Modificar' : 'Guardar'}
            </button>
          ) : hasPrediction[match.id] ? (
            <CheckCircle2 size={11} className="text-slate-600" />
          ) : (
            <span className="text-[10px] text-slate-600">Sin predicción</span>
          )}
        </div>
      )}

      {locked && !finished && (
        <div className="flex items-center gap-1 px-3 py-1 border-t border-slate-700/50">
          <Lock size={10} className="text-slate-600" />
          <span className="text-[10px] text-slate-600">Cerrado</span>
        </div>
      )}
    </div>
  )
}

const PREV_STAGE: Record<string, string> = {
  'round_of_16': 'round_of_32',
  'quarter': 'round_of_16',
  'semi': 'quarter',
  'final': 'semi',
}

function RoundColumn({ matches, label, slotH, stage, positionOffset = 0, userId, scores, penalty, hasPrediction, onScoreChange, onPenaltyChange, onSave, saving, saved, highlightMatchId, highlightRef, winnerMap }: CardSharedProps & {
  matches: (MatchWithPred | null)[]
  label: string
  slotH: number
  stage: string
  positionOffset?: number
}) {
  const totalH = matches.length * slotH
  const prevStage = PREV_STAGE[stage]
  return (
    <div className="flex flex-col shrink-0 w-[200px]">
      <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider text-center pb-2">
        {label}
      </div>
      <div className="relative" style={{ height: totalH }}>
        {matches.map((match, i) => {
          const pos = positionOffset + i + 1
          const pendingHome = match == null && prevStage ? (winnerMap.get(`${prevStage}:${2 * pos - 1}`) ?? null) : undefined
          const pendingAway = match == null && prevStage ? (winnerMap.get(`${prevStage}:${2 * pos}`) ?? null) : undefined
          return (
            <div
              key={match?.id ?? `e-${i}`}
              className="absolute w-full flex items-center px-1"
              style={{ top: i * slotH, height: slotH }}
            >
              <MatchCard
                match={match}
                pendingHome={pendingHome}
                pendingAway={pendingAway}
                userId={userId}
                scores={scores}
                penalty={penalty}
                hasPrediction={hasPrediction}
                onScoreChange={onScoreChange}
                onPenaltyChange={onPenaltyChange}
                onSave={onSave}
                saving={saving}
                saved={saved}
                highlightMatchId={highlightMatchId}
                highlightRef={highlightRef}
                winnerMap={winnerMap}
              />
            </div>
          )
        })}
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

export default function BracketClient({ matches, userId, highlightMatchId }: { matches: MatchWithPred[]; userId: string; highlightMatchId?: number }) {
  const highlightRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (highlightMatchId && highlightRef.current) {
      setTimeout(() => highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }), 150)
    }
  }, [highlightMatchId])

  // Mapa de ganadores: "stage:bracket_position" → { name, flag }
  const winnerMap = useMemo(() => {
    const map = new Map<string, TeamInfo>()
    for (const m of matches) {
      if (m.status !== 'finished' || m.bracket_position == null) continue
      const homeScore = m.home_score ?? 0
      const awayScore = m.away_score ?? 0
      const homeWins = homeScore > awayScore ||
        (homeScore === awayScore && (m.penalty_home ?? 0) > (m.penalty_away ?? 0))
      map.set(`${m.stage}:${m.bracket_position}`, homeWins
        ? { name: m.home_team, flag: m.home_team_flag ?? null }
        : { name: m.away_team, flag: m.away_team_flag ?? null }
      )
    }
    return map
  }, [matches])
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
  const [penalty, setPenalty] = useState<Record<number, 'home' | 'away' | null>>(() => {
    const init: Record<number, 'home' | 'away' | null> = {}
    matches.forEach(m => { init[m.id] = m.prediction?.penalty_winner ?? null })
    return init
  })
  const [saving, setSaving] = useState<Record<number, boolean>>({})
  const [saved, setSaved] = useState<Record<number, boolean>>({})
  const [hasPrediction, setHasPrediction] = useState<Record<number, boolean>>(() => {
    const init: Record<number, boolean> = {}
    matches.forEach(m => { init[m.id] = !!m.prediction })
    return init
  })

  function handleScoreChange(id: number, side: 'home' | 'away', val: string) {
    setScores(prev => ({ ...prev, [id]: { ...prev[id], [side]: val } }))
    setSaved(prev => ({ ...prev, [id]: false }))
  }

  function handlePenaltyChange(id: number, winner: 'home' | 'away' | null) {
    setPenalty(prev => ({ ...prev, [id]: winner }))
    setSaved(prev => ({ ...prev, [id]: false }))
  }

  async function handleSave(match: MatchWithPred) {
    const s = scores[match.id]
    const home = parseInt(s.home)
    const away = parseInt(s.away)
    if (isNaN(home) || isNaN(away) || home < 0 || away < 0) return
    const isDraw = home === away
    const pw = isDraw ? (penalty[match.id] ?? null) : null
    if (isDraw && pw === null) return
    setSaving(v => ({ ...v, [match.id]: true }))
    try {
      await upsertPrediction(userId, match.id, home, away, pw)
      setHasPrediction(v => ({ ...v, [match.id]: true }))
      setSaved(v => ({ ...v, [match.id]: true }))
      setTimeout(() => setSaved(v => ({ ...v, [match.id]: false })), 2000)
    } catch {
      // silently fail — user can retry
    } finally {
      setSaving(v => ({ ...v, [match.id]: false }))
    }
  }

  // Construye un array de `len` slots. Si el match tiene bracket_position lo ubica
  // en el slot correcto (1-based → 0-based). Los sin posición van al primer slot libre.
  const byStageSlotted = (stage: string, len: number): (MatchWithPred | null)[] => {
    const arr: (MatchWithPred | null)[] = Array(len).fill(null)
    const stageMatches = matches.filter(m => m.stage === stage)
    const unpositioned: MatchWithPred[] = []
    for (const m of stageMatches) {
      if (m.bracket_position != null) {
        const idx = m.bracket_position - 1
        if (idx >= 0 && idx < len) arr[idx] = m
      } else {
        unpositioned.push(m)
      }
    }
    // Partidos sin posición: primer slot libre
    for (const m of unpositioned) {
      const idx = arr.indexOf(null)
      if (idx !== -1) arr[idx] = m
    }
    return arr
  }

  const r32P = byStageSlotted('round_of_32', 16)
  const r16P = byStageSlotted('round_of_16', 8)
  const qfP  = byStageSlotted('quarter', 4)
  const sfP  = byStageSlotted('semi', 2)
  const tp   = matches.filter(m => m.stage === 'third_place')
  const fin  = matches.filter(m => m.stage === 'final')

  const has32 = r32P.some(m => m !== null) || matches.length === 0

  const r32L  = r32P.slice(0, 8)
  const r32RL = r32P.slice(8)
  const r16L  = r16P.slice(0, 4)
  const r16RL = r16P.slice(4)
  const qfL   = qfP.slice(0, 2)
  const qfRL  = qfP.slice(2)
  const sfL   = sfP.slice(0, 1)
  const sfRL  = sfP.slice(1)

  const s32 = SLOT_H
  const s16 = SLOT_H * 2
  const sqf = SLOT_H * 4
  const ssf = SLOT_H * 8
  const totalH = 8 * SLOT_H

  const colProps: CardSharedProps = { userId, scores, penalty, hasPrediction, onScoreChange: handleScoreChange, onPenaltyChange: handlePenaltyChange, onSave: handleSave, saving, saved, highlightMatchId, highlightRef, winnerMap }

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-start" style={{ minWidth: has32 ? 2000 : 1560 }}>

        {has32 && (
          <>
            <RoundColumn matches={r32L} label={STAGE_LABELS.round_of_32} slotH={s32} stage="round_of_32" {...colProps} />
            <Connector matchCount={8} slotH={s32} dir="right" />
          </>
        )}
        <RoundColumn matches={r16L} label={STAGE_LABELS.round_of_16} slotH={s16} stage="round_of_16" {...colProps} />
        <Connector matchCount={4} slotH={s16} dir="right" />
        <RoundColumn matches={qfL} label={STAGE_LABELS.quarter} slotH={sqf} stage="quarter" {...colProps} />
        <Connector matchCount={2} slotH={sqf} dir="right" />
        <RoundColumn matches={sfL} label={STAGE_LABELS.semi} slotH={ssf} stage="semi" {...colProps} />
        <Connector matchCount={1} slotH={ssf} dir="right" />

        {/* CENTER */}
        <div className="flex flex-col items-center shrink-0 w-[200px]">
          <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider pb-2">{STAGE_LABELS.final}</div>
          <div className="flex flex-col justify-center gap-4 w-full px-1" style={{ height: totalH }}>
            <div className="flex flex-col gap-1">
              <div className="flex justify-center pb-1">
                <img src="/logo.png" alt="Dacopas" className="w-14 h-14 object-contain" />
              </div>
              <MatchCard
                match={fin[0] ?? null}
                pendingHome={fin[0] == null ? (winnerMap.get('semi:1') ?? null) : undefined}
                pendingAway={fin[0] == null ? (winnerMap.get('semi:2') ?? null) : undefined}
                {...colProps}
              />
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-[9px] text-slate-500 uppercase tracking-wider text-center">
                {STAGE_LABELS.third_place}
              </div>
              <MatchCard match={tp[0] ?? null} {...colProps} />
            </div>
          </div>
        </div>

        <Connector matchCount={1} slotH={ssf} dir="left" />
        <RoundColumn matches={sfRL} label={STAGE_LABELS.semi} slotH={ssf} stage="semi" positionOffset={1} {...colProps} />
        <Connector matchCount={2} slotH={sqf} dir="left" />
        <RoundColumn matches={qfRL} label={STAGE_LABELS.quarter} slotH={sqf} stage="quarter" positionOffset={2} {...colProps} />
        <Connector matchCount={4} slotH={s16} dir="left" />
        <RoundColumn matches={r16RL} label={STAGE_LABELS.round_of_16} slotH={s16} stage="round_of_16" positionOffset={4} {...colProps} />
        {has32 && (
          <>
            <Connector matchCount={8} slotH={s32} dir="left" />
            <RoundColumn matches={r32RL} label={STAGE_LABELS.round_of_32} slotH={s32} stage="round_of_32" positionOffset={8} {...colProps} />
          </>
        )}

      </div>
    </div>
  )
}
