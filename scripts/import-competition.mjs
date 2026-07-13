// Carga inicial de la temporada completa de una competencia round_robin (Premier League, La Liga).
// Se corre una vez al activar una competencia nueva; el cron periódico (/api/matches/sync)
// sigue encargándose de actualizar resultados y notificar después de esto.
//
// Uso: SUPABASE_SERVICE_ROLE_KEY=... API_FOOTBALL_KEY=... node scripts/import-competition.mjs 39
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY
const API_FOOTBALL = 'https://v3.football.api-sports.io'

// Mantener en sync con src/lib/competitions.ts (no se puede importar TS directo desde un script .mjs)
const COMPETITIONS = {
  39: { id: 39, name: 'Premier League', apiLeagueId: 39, season: 2026, format: 'round_robin' },
  140: { id: 140, name: 'La Liga', apiLeagueId: 140, season: 2026, format: 'round_robin' },
}

const competitionId = Number(process.argv[2])
const competition = COMPETITIONS[competitionId]

if (!competition) {
  console.error(`Competencia desconocida: ${competitionId}. Opciones: ${Object.keys(COMPETITIONS).join(', ')}`)
  process.exit(1)
}
if (!SUPABASE_URL || !SUPABASE_KEY || !API_FOOTBALL_KEY) {
  console.error('Faltan env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, API_FOOTBALL_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

function mapStatus(short) {
  if (['FT', 'AET', 'PEN', 'AWD', 'WO'].includes(short)) return 'finished'
  if (['1H', 'HT', '2H', 'ET', 'P', 'BT', 'LIVE'].includes(short)) return 'live'
  return 'scheduled'
}

// "Regular Season - 15" → 15
function parseMatchday(round) {
  const match = round.match(/(\d+)\s*$/)
  return match ? Number(match[1]) : null
}

console.log(`1. Obteniendo temporada ${competition.season} de ${competition.name} desde api-sports...`)
const res = await fetch(`${API_FOOTBALL}/fixtures?league=${competition.apiLeagueId}&season=${competition.season}`, {
  headers: { 'x-apisports-key': API_FOOTBALL_KEY },
})
if (!res.ok) { console.error('API error:', res.status, await res.text()); process.exit(1) }
const { response: fixtures } = await res.json()
console.log(`   ✓ ${fixtures.length} fixtures recibidos`)

console.log('2. Revisando qué ya está en la base...')
const { data: existing } = await supabase.from('matches').select('external_id').eq('competition_id', competition.id)
const existingSet = new Set((existing ?? []).map(m => String(m.external_id)))
console.log(`   ✓ ${existingSet.size} ya existían`)

console.log('3. Insertando fixtures nuevos...')
let inserted = 0
for (const f of fixtures) {
  const externalId = String(f.fixture.id)
  if (existingSet.has(externalId)) continue
  const { error } = await supabase.from('matches').insert({
    external_id: externalId,
    home_team: f.teams.home.name,
    away_team: f.teams.away.name,
    home_team_flag: f.teams.home.logo ?? null,
    away_team_flag: f.teams.away.logo ?? null,
    match_date: f.fixture.date,
    stage: null,
    matchday: parseMatchday(f.league.round ?? ''),
    status: mapStatus(f.fixture.status.short),
    home_score: f.goals.home ?? null,
    away_score: f.goals.away ?? null,
    penalty_home: f.score?.penalty?.home ?? null,
    penalty_away: f.score?.penalty?.away ?? null,
    tournament: f.league.name ?? null,
    competition_id: competition.id,
    competition_name: competition.name,
  })
  if (error) console.error(`   Error ${f.teams.home.name} vs ${f.teams.away.name}:`, error.message)
  else inserted++
}

console.log(`   ✓ ${inserted} partidos insertados`)
console.log(`\n¡Listo! ${competition.name} temporada ${competition.season} importada.`)
