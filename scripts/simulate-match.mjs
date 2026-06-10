/**
 * Simula el ciclo completo de un partido:
 *   node scripts/simulate-match.mjs [match_id] [escenario]
 *
 * Escenarios:
 *   1h       → partido en 62 min (dispara notif 1h antes)
 *   15min    → partido en 17 min (dispara notif 15min + bloqueo)
 *   start    → partido en 3 min  (dispara notif de inicio)
 *   finish   → simula partido terminado con resultado 2-1
 *
 * Ejemplo:
 *   node scripts/simulate-match.mjs 249 1h
 *   node scripts/simulate-match.mjs 249 finish
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://anriytnlbikvcrucsqdo.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFucml5dG5sYmlrdmNydWNzcWRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDYxODg4NCwiZXhwIjoyMDk2MTk0ODg0fQ.L9ZDpkuDDOCaeC2Uoub5Rxl-oT__7Aykmxou4C_dHhM'
const BASE_URL = 'http://localhost:3000'
const CRON_SECRET = 'miamigosam'

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const [,, matchIdArg, scenario = '1h'] = process.argv

async function getMatch(id) {
  if (id) {
    const { data } = await supabase.from('matches').select('*').eq('id', id).single()
    return data
  }
  // Si no se pasa ID, usar el próximo partido scheduled
  const { data } = await supabase
    .from('matches').select('*').eq('status', 'scheduled')
    .order('match_date', { ascending: true }).limit(1).single()
  return data
}

async function callSync() {
  console.log('\n🔄 Llamando /api/matches/sync...')
  const res = await fetch(`${BASE_URL}/api/matches/sync`, {
    headers: { Authorization: `Bearer ${CRON_SECRET}` }
  })
  const json = await res.json()
  console.log('Sync result:', JSON.stringify(json, null, 2))
}

const match = await getMatch(matchIdArg)
if (!match) { console.error('No se encontró partido'); process.exit(1) }

console.log(`\n📋 Partido: ${match.home_team} vs ${match.away_team} (id: ${match.id})`)
console.log(`   Fecha actual: ${match.match_date}`)

let newDate, updates

if (scenario === '1h') {
  newDate = new Date(Date.now() + 62 * 60 * 1000)
  updates = { match_date: newDate.toISOString(), status: 'scheduled', notified_1h: false, notified_15min: false, notified_start: false, notified_finished: false }
  console.log(`\n⏱  Escenario: partido en 62 min → debe disparar notif "1 hora antes"`)
} else if (scenario === '15min') {
  newDate = new Date(Date.now() + 17 * 60 * 1000)
  updates = { match_date: newDate.toISOString(), status: 'scheduled', notified_1h: true, notified_15min: false, notified_start: false, notified_finished: false }
  console.log(`\n⏱  Escenario: partido en 17 min → debe disparar notif "15 min" + bloquear pronósticos`)
} else if (scenario === 'start') {
  newDate = new Date(Date.now() + 3 * 60 * 1000)
  updates = { match_date: newDate.toISOString(), status: 'scheduled', notified_1h: true, notified_15min: true, notified_start: false, notified_finished: false }
  console.log(`\n⏱  Escenario: partido en 3 min → debe disparar notif "inicio"`)
} else if (scenario === 'finish') {
  newDate = new Date(Date.now() - 95 * 60 * 1000)
  updates = { match_date: newDate.toISOString(), status: 'finished', home_score: 2, away_score: 1, notified_1h: true, notified_15min: true, notified_start: true, notified_finished: false }
  console.log(`\n⏱  Escenario: partido terminado 2-1 → debe calcular puntos + notif resultado`)
} else {
  console.error('Escenario desconocido. Usá: 1h | 15min | start | finish')
  process.exit(1)
}

console.log(`   Nueva fecha: ${newDate.toISOString()}`)
console.log(`   Updates:`, updates)

const { error } = await supabase.from('matches').update(updates).eq('id', match.id)
if (error) { console.error('Error actualizando partido:', error); process.exit(1) }
console.log(`\n✅ Partido actualizado`)

await callSync()
