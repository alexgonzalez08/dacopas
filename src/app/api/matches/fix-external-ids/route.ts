import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const FOOTBALL_API = 'https://api.football-data.org/v4'
const COMPETITION_ID = 2000

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const res = await fetch(`${FOOTBALL_API}/competitions/${COMPETITION_ID}/matches`, {
    headers: { 'X-Auth-Token': process.env.FOOTBALL_API_KEY! },
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Football API error', status: res.status }, { status: 502 })
  }

  const { matches: apiMatches } = await res.json()

  const { data: dbMatches } = await supabase
    .from('matches')
    .select('id, home_team, away_team, match_date, external_id')

  let updated = 0
  let skipped = 0

  for (const m of apiMatches) {
    const apiDate = new Date(m.utcDate)

    const dbMatch = (dbMatches ?? []).find(db => {
      if (db.external_id) return false // ya tiene external_id
      const dbDate = new Date(db.match_date)
      const sameDay = dbDate.toDateString() === apiDate.toDateString()
      const sameHome = db.home_team.toLowerCase() === m.homeTeam.name.toLowerCase()
      const sameAway = db.away_team.toLowerCase() === m.awayTeam.name.toLowerCase()
      return sameDay && sameHome && sameAway
    })

    if (dbMatch) {
      await supabase
        .from('matches')
        .update({ external_id: String(m.id) })
        .eq('id', dbMatch.id)
      updated++
    } else {
      skipped++
    }
  }

  return NextResponse.json({ updated, skipped })
}
