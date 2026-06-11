import { ImageResponse } from 'next/og'
import { createClient } from '@/lib/supabase/server'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: match } = await supabase
    .from('matches')
    .select('home_team, away_team, home_team_flag, away_team_flag, match_date, status, home_score, away_score, group_name')
    .eq('id', id)
    .single()

  const home = match?.home_team ?? 'Local'
  const away = match?.away_team ?? 'Visitante'
  const hasScore = match?.status === 'finished' || match?.status === 'live'
  const date = match?.match_date
    ? new Date(match.match_date).toLocaleDateString('es-CR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'America/Costa_Rica' })
    : ''

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0f1e',
          fontFamily: 'system-ui, sans-serif',
          padding: '60px',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '48px' }}>
          <div style={{ background: '#eab308', borderRadius: '12px', padding: '10px 24px', display: 'flex' }}>
            <span style={{ fontSize: '28px', fontWeight: 900, color: '#0a0f1e', letterSpacing: '-0.5px' }}>DACOPAS</span>
          </div>
        </div>

        {/* Teams */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '48px', marginBottom: '32px' }}>
          {/* Home */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            {match?.home_team_flag?.startsWith('http') ? (
              <img src={match.home_team_flag} width={100} height={100} style={{ objectFit: 'contain' }} />
            ) : (
              <span style={{ fontSize: '80px' }}>{match?.home_team_flag ?? '🏳️'}</span>
            )}
            <span style={{ fontSize: '32px', fontWeight: 700, color: '#f1f5f9', textAlign: 'center', maxWidth: '240px' }}>{home}</span>
          </div>

          {/* Score or VS */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            {hasScore ? (
              <span style={{ fontSize: '72px', fontWeight: 900, color: '#eab308' }}>
                {match.home_score} - {match.away_score}
              </span>
            ) : (
              <span style={{ fontSize: '56px', fontWeight: 900, color: '#475569' }}>VS</span>
            )}
            {match?.status === 'finished' && (
              <span style={{ fontSize: '18px', color: '#4ade80', fontWeight: 600 }}>Finalizado</span>
            )}
            {match?.status === 'live' && (
              <span style={{ fontSize: '18px', color: '#4ade80', fontWeight: 600 }}>En curso</span>
            )}
          </div>

          {/* Away */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            {match?.away_team_flag?.startsWith('http') ? (
              <img src={match.away_team_flag} width={100} height={100} style={{ objectFit: 'contain' }} />
            ) : (
              <span style={{ fontSize: '80px' }}>{match?.away_team_flag ?? '🏳️'}</span>
            )}
            <span style={{ fontSize: '32px', fontWeight: 700, color: '#f1f5f9', textAlign: 'center', maxWidth: '240px' }}>{away}</span>
          </div>
        </div>

        {/* Date */}
        {date && (
          <span style={{ fontSize: '20px', color: '#64748b', marginBottom: '16px' }}>
            ⏰ {date} · hora Costa Rica
          </span>
        )}

        {/* CTA */}
        <span style={{ fontSize: '18px', color: '#94a3b8' }}>
          Registrá tu pronóstico en dacopas.com
        </span>
      </div>
    ),
    { ...size }
  )
}
