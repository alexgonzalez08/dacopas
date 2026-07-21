// Carga inicial de la temporada completa de una competencia round_robin (Premier League, La Liga)
// o de la fase de grupos de una competencia knockout (fase eliminatoria se descubre sola después
// vía el cron /api/matches/sync). Se corre una vez al activar una competencia nueva; el cron
// periódico sigue encargándose de actualizar resultados y notificar después de esto.
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
  135: { id: 135, name: 'Serie A', apiLeagueId: 135, season: 2026, format: 'round_robin' },
  162: { id: 162, name: 'Primera División de Costa Rica', apiLeagueId: 162, season: 2026, format: 'round_robin' },
  1028: { id: 1028, name: 'CONCACAF Central American Cup', apiLeagueId: 1028, season: 2026, format: 'knockout' },
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

function mapStage(round) {
  if (round.includes('Group')) return 'group'
  if (round.includes('32')) return 'round_of_32'
  if (round.includes('16')) return 'round_of_16'
  if (round.includes('Quarter')) return 'quarter'
  if (round.includes('Semi')) return 'semi'
  if (round.includes('3rd')) return 'third_place'
  if (round.includes('Final')) return 'final'
  return 'group'
}

// "Group A" → "A". Algunas competencias (ej. CONCACAF Central American Cup) no traen la letra
// en el round ("Group Stage" a secas) — para esas se infiere el grupo agrupando por cruces
// (ver inferGroupsFromFixtures).
function parseGroupLetter(round) {
  const match = round.match(/Group\s+([A-Z])\b(?!.*[a-z])/i)
  return match ? match[1].toUpperCase() : null
}

// Reconstruye los grupos por componentes conexos del grafo de cruces (dos equipos quedan en el
// mismo grupo si comparten al menos un fixture), y les asigna letra A, B, C... Solo hace falta
// cuando la API no expone la letra de grupo en el nombre del round.
function inferGroupsFromFixtures(fixtures) {
  const parent = new Map()
  const find = x => {
    if (!parent.has(x)) parent.set(x, x)
    let root = x
    while (parent.get(root) !== root) root = parent.get(root)
    let cur = x
    while (parent.get(cur) !== root) { const next = parent.get(cur); parent.set(cur, root); cur = next }
    return root
  }
  const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(ra, rb) }

  for (const f of fixtures) union(f.teams.home.name, f.teams.away.name)

  const rootTeams = new Map()
  for (const f of fixtures) {
    for (const name of [f.teams.home.name, f.teams.away.name]) {
      const root = find(name)
      if (!rootTeams.has(root)) rootTeams.set(root, new Set())
      rootTeams.get(root).add(name)
    }
  }

  const letters = [...rootTeams.keys()].map((root, i) => [root, String.fromCharCode(65 + i)])
  const rootToLetter = new Map(letters)
  const teamToGroup = new Map()
  for (const [root, teams] of rootTeams) {
    for (const team of teams) teamToGroup.set(team, rootToLetter.get(root))
  }
  return teamToGroup
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

const isKnockout = competition.format === 'knockout'
// Solo hace falta inferir grupos si la API no trae la letra en el round (ej. CONCACAF Central
// American Cup, que devuelve "Group Stage" a secas para los 40 fixtures de fase de grupos)
const needsInferredGroups = isKnockout && fixtures.some(f => mapStage(f.league.round ?? '') === 'group' && !parseGroupLetter(f.league.round ?? ''))
const inferredGroups = needsInferredGroups
  ? inferGroupsFromFixtures(fixtures.filter(f => mapStage(f.league.round ?? '') === 'group'))
  : null

console.log('3. Insertando fixtures nuevos...')
let inserted = 0
for (const f of fixtures) {
  const externalId = String(f.fixture.id)
  if (existingSet.has(externalId)) continue
  const round = f.league.round ?? ''
  const groupName = isKnockout
    ? (parseGroupLetter(round) ?? inferredGroups?.get(f.teams.home.name) ?? null)
    : null
  const { error } = await supabase.from('matches').insert({
    external_id: externalId,
    home_team: f.teams.home.name,
    away_team: f.teams.away.name,
    home_team_flag: f.teams.home.logo ?? null,
    away_team_flag: f.teams.away.logo ?? null,
    match_date: f.fixture.date,
    stage: isKnockout ? mapStage(round) : null,
    group_name: groupName,
    matchday: isKnockout ? null : parseMatchday(round),
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
