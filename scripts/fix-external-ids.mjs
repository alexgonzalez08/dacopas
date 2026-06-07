import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://anriytnlbikvcrucsqdo.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const FOOTBALL_API_KEY = process.env.FOOTBALL_API_KEY
const COMPETITION_ID = 2000

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const res = await fetch(`https://api.football-data.org/v4/competitions/${COMPETITION_ID}/matches`, {
  headers: { 'X-Auth-Token': FOOTBALL_API_KEY },
})

if (!res.ok) {
  console.error('API error:', res.status, await res.text())
  process.exit(1)
}

const { matches: apiMatches } = await res.json()
console.log(`API devolvió ${apiMatches.length} partidos`)

const { data: dbMatches } = await supabase
  .from('matches')
  .select('id, home_team, away_team, match_date, external_id')

console.log(`DB tiene ${dbMatches.length} partidos`)

let updated = 0, skipped = 0

for (const m of apiMatches) {
  const apiDate = new Date(m.utcDate)

  const dbMatch = dbMatches.find(db => {
    if (db.external_id) return false
    const dbDate = new Date(db.match_date)
    const sameDay = dbDate.toDateString() === apiDate.toDateString()
    if (!m.homeTeam?.name || !m.awayTeam?.name) return false
    const sameHome = db.home_team.toLowerCase() === m.homeTeam.name.toLowerCase()
    const sameAway = db.away_team.toLowerCase() === m.awayTeam.name.toLowerCase()
    return sameDay && sameHome && sameAway
  })

  if (dbMatch) {
    const { error } = await supabase
      .from('matches')
      .update({ external_id: String(m.id) })
      .eq('id', dbMatch.id)
    if (error) console.error(`Error actualizando ${dbMatch.id}:`, error.message)
    else { console.log(`✓ ${m.homeTeam.name} vs ${m.awayTeam.name} → external_id ${m.id}`); updated++ }
  } else {
    console.log(`✗ Sin match para: ${m.homeTeam.name} vs ${m.awayTeay?.name ?? '?'} (${m.utcDate})`)
    skipped++
  }
}

console.log(`\nResultado: ${updated} actualizados, ${skipped} sin match`)
