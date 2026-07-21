import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { COMPETITIONS } from '@/lib/competitions'
import { sendEmail } from '@/lib/email'

export const maxDuration = 60

const API_FOOTBALL = 'https://v3.football.api-sports.io'
const ADMIN_EMAIL = 'alexgf08@gmail.com'

type Mismatch = { competition: string; home: string; away: string; dbDate: string; apiDate: string }

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const mismatches: Mismatch[] = []

  for (const competition of COMPETITIONS) {
    const { data: dbMatches } = await supabase
      .from('matches')
      .select('external_id, home_team, away_team, match_date')
      .eq('competition_id', competition.id)
      .neq('status', 'finished')
      .not('external_id', 'is', null)

    if (!dbMatches || dbMatches.length === 0) continue

    let apiFixtures: any[] = []
    try {
      const res = await fetch(`${API_FOOTBALL}/fixtures?league=${competition.apiLeagueId}&season=${competition.season}`, {
        headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY! },
      })
      if (!res.ok) continue
      const json = await res.json()
      apiFixtures = json.response ?? []
    } catch {
      continue
    }

    const apiByExtId = new Map(apiFixtures.map(f => [String(f.fixture.id), f]))
    for (const m of dbMatches) {
      const f = apiByExtId.get(m.external_id!)
      if (!f) continue
      if (f.fixture.date !== m.match_date) {
        mismatches.push({
          competition: competition.name,
          home: m.home_team,
          away: m.away_team,
          dbDate: m.match_date,
          apiDate: f.fixture.date,
        })
      }
    }
  }

  if (mismatches.length > 0) {
    const rows = mismatches.map(m => `
      <tr>
        <td style="padding:6px 10px;color:#f8fafc;border-bottom:1px solid #1e293b">${m.competition}</td>
        <td style="padding:6px 10px;color:#f8fafc;border-bottom:1px solid #1e293b">${m.home} vs ${m.away}</td>
        <td style="padding:6px 10px;color:#94a3b8;border-bottom:1px solid #1e293b">${m.dbDate}</td>
        <td style="padding:6px 10px;color:#eab308;border-bottom:1px solid #1e293b">${m.apiDate}</td>
      </tr>`).join('')

    await sendEmail({
      from: process.env.RESEND_FROM_EMAIL!,
      to: ADMIN_EMAIL,
      subject: `⚠️ Dacopas: ${mismatches.length} partido(s) con fecha desactualizada`,
      html: `
<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:24px;background:#0a0f1e;font-family:'Segoe UI',Arial,sans-serif">
  <h2 style="color:#f8fafc;font-size:18px">Se encontraron ${mismatches.length} partido(s) con fecha distinta a la de api-sports</h2>
  <table style="border-collapse:collapse;width:100%;margin-top:12px">
    <tr style="color:#94a3b8;text-align:left;font-size:13px">
      <th style="padding:6px 10px">Competencia</th><th style="padding:6px 10px">Partido</th><th style="padding:6px 10px">Fecha en DB</th><th style="padding:6px 10px">Fecha en API</th>
    </tr>
    ${rows}
  </table>
  <p style="color:#64748b;font-size:13px;margin-top:20px">Revisar y corregir manualmente en Supabase si corresponde.</p>
</body>
</html>`,
    })
  }

  return NextResponse.json({ checked: true, mismatches: mismatches.length, details: mismatches })
}
