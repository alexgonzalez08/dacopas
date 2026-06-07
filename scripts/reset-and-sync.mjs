import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://anriytnlbikvcrucsqdo.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const FOOTBALL_API_KEY = process.env.FOOTBALL_API_KEY
const COMPETITION_ID = 2000

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

console.log('1. Borrando predicciones...')
const { error: predError } = await supabase.from('predictions').delete().gte('match_id', 0)
if (predError) { console.error(predError.message); process.exit(1) }
console.log('   ✓ Predicciones eliminadas')

console.log('2. Borrando partidos...')
const { error: matchError } = await supabase.from('matches').delete().gte('id', 0)
if (matchError) { console.error(matchError.message); process.exit(1) }
console.log('   ✓ Partidos eliminados')

console.log('3. Obteniendo partidos desde la API...')
const res = await fetch(`https://api.football-data.org/v4/competitions/${COMPETITION_ID}/matches`, {
  headers: { 'X-Auth-Token': FOOTBALL_API_KEY },
})
if (!res.ok) { console.error('API error:', res.status); process.exit(1) }
const { matches: apiMatches } = await res.json()
console.log(`   ✓ ${apiMatches.length} partidos recibidos`)

function mapStage(stage) {
  const map = {
    GROUP_STAGE: 'group', LAST_32: 'round_of_32', LAST_16: 'round_of_16',
    QUARTER_FINALS: 'quarter', SEMI_FINALS: 'semi', THIRD_PLACE: 'third_place', FINAL: 'final',
  }
  return map[stage] ?? 'group'
}
function mapStatus(status) {
  if (status === 'FINISHED' || status === 'AWARDED') return 'finished'
  if (status === 'IN_PLAY' || status === 'PAUSED') return 'live'
  return 'scheduled'
}

console.log('4. Insertando partidos...')
let inserted = 0
for (const m of apiMatches) {
  if (!m.homeTeam?.name || !m.awayTeam?.name) continue
  const { error } = await supabase.from('matches').insert({
    external_id: String(m.id),
    home_team: m.homeTeam.name,
    away_team: m.awayTeam.name,
    home_team_flag: m.homeTeam.crest ?? null,
    away_team_flag: m.awayTeam.crest ?? null,
    match_date: m.utcDate,
    stage: mapStage(m.stage),
    group_name: m.group ? m.group.replace('GROUP_', '') : null,
    status: mapStatus(m.status),
    home_score: m.score?.fullTime?.home ?? null,
    away_score: m.score?.fullTime?.away ?? null,
  })
  if (error) console.error(`  Error ${m.homeTeam.name} vs ${m.awayTeam.name}:`, error.message)
  else inserted++
}

console.log(`   ✓ ${inserted} partidos insertados`)
console.log('\n¡Listo! Re-sincronización completa.')
