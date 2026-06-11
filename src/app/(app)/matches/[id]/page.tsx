import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import TeamFlag from '@/components/team-flag'
import MatchPrediction from './match-prediction'
import GroupStandings from './group-standings'
import { Calendar, Clock } from 'lucide-react'
import MatchTime from '@/components/match-time'
import ShareButton from './share-button'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data: match } = await supabase.from('matches').select('home_team, away_team, status, home_score, away_score').eq('id', id).single()
  if (!match) return {}
  const hasScore = match.status === 'finished' || match.status === 'live'
  const title = hasScore
    ? `${match.home_team} ${match.home_score} - ${match.away_score} ${match.away_team}`
    : `${match.home_team} vs ${match.away_team}`
  const description = hasScore
    ? `Resultado final: ${match.home_team} ${match.home_score} - ${match.away_score} ${match.away_team}. Registrá tu pronóstico en Dacopas.`
    : `¡Registrá tu pronóstico para ${match.home_team} vs ${match.away_team} en Dacopas!`
  return {
    title,
    description,
    openGraph: { title, description, url: `https://www.dacopas.com/matches/${id}` },
    twitter: { card: 'summary_large_image', title, description },
  }
}

const STAGE_LABELS: Record<string, string> = {
  group: 'Fase de Grupos',
  round_of_32: 'Ronda de 32',
  round_of_16: 'Octavos de Final',
  quarter: 'Cuartos de Final',
  semi: 'Semifinales',
  third_place: 'Tercer Puesto',
  final: 'Final',
}

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: match } = await supabase
    .from('matches')
    .select('*')
    .eq('id', id)
    .single()

  if (!match) notFound()

  // Predicción del usuario
  const { data: prediction } = await supabase
    .from('predictions')
    .select('*')
    .eq('user_id', user!.id)
    .eq('match_id', match.id)
    .single()

  // Partidos del grupo para calcular tabla
  let groupMatches: any[] = []
  if (match.group_name) {
    const { data } = await supabase
      .from('matches')
      .select('*')
      .eq('group_name', match.group_name)
      .order('match_date', { ascending: true })
    groupMatches = data ?? []
  }

  const matchDate = new Date(match.match_date)

  return (
    <div className="space-y-6">
      {/* Header del partido */}
      <div className="bg-slate-800 rounded-2xl p-6">
        <div className="flex justify-end mb-2">
          <ShareButton
            title={`${match.home_team} vs ${match.away_team}`}
            text={match.status === 'finished'
              ? `Resultado: ${match.home_team} ${match.home_score} - ${match.away_score} ${match.away_team}`
              : `¡Registrá tu pronóstico para ${match.home_team} vs ${match.away_team} en Dacopas!`}
            url={`https://www.dacopas.com/matches/${match.id}`}
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-4 justify-center">
          <span>{match.group_name ? `Fase de Grupos · Grupo ${match.group_name}` : STAGE_LABELS[match.stage]}</span>
          <span>·</span>
          <Calendar className="w-3 h-3" />
          <span>{format(matchDate, "d 'de' MMMM yyyy", { locale: es })}</span>
          <span>·</span>
          <Clock className="w-3 h-3" />
          <MatchTime matchDate={match.match_date} />
        </div>

        <div className="flex items-center justify-between gap-4">
          {/* Local */}
          <div className="flex-1 flex flex-col items-center gap-2 text-center">
            <div className="text-4xl">
              {match.home_team_flag?.startsWith('http')
                ? <img src={match.home_team_flag} alt={match.home_team} className="w-16 h-16 object-contain mx-auto" />
                : <span className="text-5xl">{match.home_team_flag ?? '🏳️'}</span>
              }
            </div>
            <span className="font-bold text-lg leading-tight">{match.home_team}</span>
          </div>

          {/* Marcador o VS */}
          <div className="text-center">
            {match.status === 'finished' ? (
              <div className="text-4xl font-black text-yellow-400">
                {match.home_score} - {match.away_score}
              </div>
            ) : match.status === 'live' ? (
              <div className="text-4xl font-black text-green-400 animate-pulse">
                {match.home_score} - {match.away_score}
              </div>
            ) : (
              <div className="text-2xl font-bold text-slate-500">VS</div>
            )}
            <div className="mt-1">
              {match.status === 'finished' && <span className="text-xs text-green-400 font-medium">Finalizado</span>}
              {match.status === 'live' && <span className="text-xs text-green-400 font-medium animate-pulse">En curso</span>}
              {match.status === 'scheduled' && <span className="text-xs text-slate-500">Programado</span>}
            </div>
          </div>

          {/* Visitante */}
          <div className="flex-1 flex flex-col items-center gap-2 text-center">
            <div className="text-4xl">
              {match.away_team_flag?.startsWith('http')
                ? <img src={match.away_team_flag} alt={match.away_team} className="w-16 h-16 object-contain mx-auto" />
                : <span className="text-5xl">{match.away_team_flag ?? '🏳️'}</span>
              }
            </div>
            <span className="font-bold text-lg leading-tight">{match.away_team}</span>
          </div>
        </div>
      </div>

      {/* Predicción */}
      <MatchPrediction
        userId={user!.id}
        match={match}
        prediction={prediction ?? null}
      />

      {/* Tabla del grupo */}
      {match.group_name && groupMatches.length > 0 && (
        <GroupStandings
          groupName={match.group_name}
          matches={groupMatches}
          highlightTeams={[match.home_team, match.away_team]}
        />
      )}
    </div>
  )
}
