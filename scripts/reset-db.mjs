import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://anriytnlbikvcrucsqdo.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFucml5dG5sYmlrdmNydWNzcWRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDYxODg4NCwiZXhwIjoyMDk2MTk0ODg0fQ.L9ZDpkuDDOCaeC2Uoub5Rxl-oT__7Aykmxou4C_dHhM'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function run() {
  console.log('🗑️  Borrando datos...')

  // Borrar en orden para respetar foreign keys
  const tables = [
    'feed_comments', 'feed_reactions', 'post_comments', 'post_reactions',
    'user_posts', 'feed_events', 'predictions', 'league_members',
    'leagues', 'friendships', 'profiles', 'matches'
  ]

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (error) {
      // matches usa id serial, intentar con otra condición
      const { error: e2 } = await supabase.from(table).delete().gt('id', 0)
      if (e2) console.error(`  ❌ ${table}:`, e2.message)
      else console.log(`  ✅ ${table}`)
    } else {
      console.log(`  ✅ ${table}`)
    }
  }

  // Borrar usuarios de auth
  console.log('\n🗑️  Borrando usuarios de auth...')
  const { data: users, error: listError } = await supabase.auth.admin.listUsers()
  if (listError) {
    console.error('  ❌ Error listando usuarios:', listError.message)
  } else {
    for (const user of users.users) {
      const { error } = await supabase.auth.admin.deleteUser(user.id)
      if (error) console.error(`  ❌ ${user.email}:`, error.message)
      else console.log(`  ✅ ${user.email}`)
    }
  }

  // Recargar partidos
  console.log('\n⚽ Cargando partidos...')
  const matches = [
    // GRUPO A
    { home_team: 'México', away_team: 'Ecuador', match_date: '2026-06-11 18:00:00+00', stage: 'group', group_name: 'A', status: 'scheduled' },
    { home_team: 'Estados Unidos', away_team: 'Canadá', match_date: '2026-06-12 01:00:00+00', stage: 'group', group_name: 'A', status: 'scheduled' },
    { home_team: 'México', away_team: 'Canadá', match_date: '2026-06-16 01:00:00+00', stage: 'group', group_name: 'A', status: 'scheduled' },
    { home_team: 'Ecuador', away_team: 'Estados Unidos', match_date: '2026-06-16 21:00:00+00', stage: 'group', group_name: 'A', status: 'scheduled' },
    { home_team: 'Canadá', away_team: 'Ecuador', match_date: '2026-06-20 21:00:00+00', stage: 'group', group_name: 'A', status: 'scheduled' },
    { home_team: 'Estados Unidos', away_team: 'México', match_date: '2026-06-20 21:00:00+00', stage: 'group', group_name: 'A', status: 'scheduled' },
    // GRUPO B
    { home_team: 'Argentina', away_team: 'Perú', match_date: '2026-06-12 18:00:00+00', stage: 'group', group_name: 'B', status: 'scheduled' },
    { home_team: 'Chile', away_team: 'Australia', match_date: '2026-06-12 21:00:00+00', stage: 'group', group_name: 'B', status: 'scheduled' },
    { home_team: 'Argentina', away_team: 'Australia', match_date: '2026-06-16 18:00:00+00', stage: 'group', group_name: 'B', status: 'scheduled' },
    { home_team: 'Perú', away_team: 'Chile', match_date: '2026-06-17 01:00:00+00', stage: 'group', group_name: 'B', status: 'scheduled' },
    { home_team: 'Australia', away_team: 'Perú', match_date: '2026-06-21 18:00:00+00', stage: 'group', group_name: 'B', status: 'scheduled' },
    { home_team: 'Chile', away_team: 'Argentina', match_date: '2026-06-21 18:00:00+00', stage: 'group', group_name: 'B', status: 'scheduled' },
    // GRUPO C
    { home_team: 'Brasil', away_team: 'Noruega', match_date: '2026-06-13 00:00:00+00', stage: 'group', group_name: 'C', status: 'scheduled' },
    { home_team: 'Uruguay', away_team: 'Arabia Saudita', match_date: '2026-06-13 18:00:00+00', stage: 'group', group_name: 'C', status: 'scheduled' },
    { home_team: 'Brasil', away_team: 'Arabia Saudita', match_date: '2026-06-17 18:00:00+00', stage: 'group', group_name: 'C', status: 'scheduled' },
    { home_team: 'Noruega', away_team: 'Uruguay', match_date: '2026-06-17 21:00:00+00', stage: 'group', group_name: 'C', status: 'scheduled' },
    { home_team: 'Arabia Saudita', away_team: 'Noruega', match_date: '2026-06-21 21:00:00+00', stage: 'group', group_name: 'C', status: 'scheduled' },
    { home_team: 'Uruguay', away_team: 'Brasil', match_date: '2026-06-21 21:00:00+00', stage: 'group', group_name: 'C', status: 'scheduled' },
    // GRUPO D
    { home_team: 'Alemania', away_team: 'Japón', match_date: '2026-06-13 21:00:00+00', stage: 'group', group_name: 'D', status: 'scheduled' },
    { home_team: 'España', away_team: 'Nueva Zelanda', match_date: '2026-06-14 00:00:00+00', stage: 'group', group_name: 'D', status: 'scheduled' },
    { home_team: 'Alemania', away_team: 'Nueva Zelanda', match_date: '2026-06-18 18:00:00+00', stage: 'group', group_name: 'D', status: 'scheduled' },
    { home_team: 'Japón', away_team: 'España', match_date: '2026-06-18 21:00:00+00', stage: 'group', group_name: 'D', status: 'scheduled' },
    { home_team: 'Nueva Zelanda', away_team: 'Japón', match_date: '2026-06-22 18:00:00+00', stage: 'group', group_name: 'D', status: 'scheduled' },
    { home_team: 'España', away_team: 'Alemania', match_date: '2026-06-22 18:00:00+00', stage: 'group', group_name: 'D', status: 'scheduled' },
    // GRUPO E
    { home_team: 'Francia', away_team: 'Corea del Sur', match_date: '2026-06-14 18:00:00+00', stage: 'group', group_name: 'E', status: 'scheduled' },
    { home_team: 'Bélgica', away_team: 'Ucrania', match_date: '2026-06-14 21:00:00+00', stage: 'group', group_name: 'E', status: 'scheduled' },
    { home_team: 'Francia', away_team: 'Ucrania', match_date: '2026-06-18 18:00:00+00', stage: 'group', group_name: 'E', status: 'scheduled' },
    { home_team: 'Corea del Sur', away_team: 'Bélgica', match_date: '2026-06-19 01:00:00+00', stage: 'group', group_name: 'E', status: 'scheduled' },
    { home_team: 'Ucrania', away_team: 'Corea del Sur', match_date: '2026-06-22 21:00:00+00', stage: 'group', group_name: 'E', status: 'scheduled' },
    { home_team: 'Bélgica', away_team: 'Francia', match_date: '2026-06-22 21:00:00+00', stage: 'group', group_name: 'E', status: 'scheduled' },
    // GRUPO F
    { home_team: 'Portugal', away_team: 'Angola', match_date: '2026-06-15 00:00:00+00', stage: 'group', group_name: 'F', status: 'scheduled' },
    { home_team: 'Países Bajos', away_team: 'Senegal', match_date: '2026-06-15 18:00:00+00', stage: 'group', group_name: 'F', status: 'scheduled' },
    { home_team: 'Portugal', away_team: 'Senegal', match_date: '2026-06-19 18:00:00+00', stage: 'group', group_name: 'F', status: 'scheduled' },
    { home_team: 'Angola', away_team: 'Países Bajos', match_date: '2026-06-19 21:00:00+00', stage: 'group', group_name: 'F', status: 'scheduled' },
    { home_team: 'Senegal', away_team: 'Angola', match_date: '2026-06-23 18:00:00+00', stage: 'group', group_name: 'F', status: 'scheduled' },
    { home_team: 'Países Bajos', away_team: 'Portugal', match_date: '2026-06-23 18:00:00+00', stage: 'group', group_name: 'F', status: 'scheduled' },
    // GRUPO G
    { home_team: 'Inglaterra', away_team: 'Serbia', match_date: '2026-06-15 21:00:00+00', stage: 'group', group_name: 'G', status: 'scheduled' },
    { home_team: 'Irán', away_team: 'Emiratos Árabes', match_date: '2026-06-16 00:00:00+00', stage: 'group', group_name: 'G', status: 'scheduled' },
    { home_team: 'Inglaterra', away_team: 'Emiratos Árabes', match_date: '2026-06-19 21:00:00+00', stage: 'group', group_name: 'G', status: 'scheduled' },
    { home_team: 'Serbia', away_team: 'Irán', match_date: '2026-06-20 00:00:00+00', stage: 'group', group_name: 'G', status: 'scheduled' },
    { home_team: 'Emiratos Árabes', away_team: 'Serbia', match_date: '2026-06-23 21:00:00+00', stage: 'group', group_name: 'G', status: 'scheduled' },
    { home_team: 'Irán', away_team: 'Inglaterra', match_date: '2026-06-23 21:00:00+00', stage: 'group', group_name: 'G', status: 'scheduled' },
    // GRUPO H
    { home_team: 'Marruecos', away_team: 'Colombia', match_date: '2026-06-17 00:00:00+00', stage: 'group', group_name: 'H', status: 'scheduled' },
    { home_team: 'Croacia', away_team: 'Argelia', match_date: '2026-06-17 18:00:00+00', stage: 'group', group_name: 'H', status: 'scheduled' },
    { home_team: 'Marruecos', away_team: 'Argelia', match_date: '2026-06-20 18:00:00+00', stage: 'group', group_name: 'H', status: 'scheduled' },
    { home_team: 'Colombia', away_team: 'Croacia', match_date: '2026-06-21 00:00:00+00', stage: 'group', group_name: 'H', status: 'scheduled' },
    { home_team: 'Argelia', away_team: 'Colombia', match_date: '2026-06-24 18:00:00+00', stage: 'group', group_name: 'H', status: 'scheduled' },
    { home_team: 'Croacia', away_team: 'Marruecos', match_date: '2026-06-24 18:00:00+00', stage: 'group', group_name: 'H', status: 'scheduled' },
    // GRUPO I
    { home_team: 'Italia', away_team: 'México', match_date: '2026-06-20 18:00:00+00', stage: 'group', group_name: 'I', status: 'scheduled' },
    { home_team: 'Nigeria', away_team: 'Costa Rica', match_date: '2026-06-20 21:00:00+00', stage: 'group', group_name: 'I', status: 'scheduled' },
    { home_team: 'Italia', away_team: 'Costa Rica', match_date: '2026-06-24 21:00:00+00', stage: 'group', group_name: 'I', status: 'scheduled' },
    { home_team: 'México', away_team: 'Nigeria', match_date: '2026-06-25 00:00:00+00', stage: 'group', group_name: 'I', status: 'scheduled' },
    { home_team: 'Costa Rica', away_team: 'México', match_date: '2026-06-28 18:00:00+00', stage: 'group', group_name: 'I', status: 'scheduled' },
    { home_team: 'Nigeria', away_team: 'Italia', match_date: '2026-06-28 18:00:00+00', stage: 'group', group_name: 'I', status: 'scheduled' },
    // GRUPO J
    { home_team: 'Polonia', away_team: 'Arabia Saudita', match_date: '2026-06-21 18:00:00+00', stage: 'group', group_name: 'J', status: 'scheduled' },
    { home_team: 'Ghana', away_team: 'Sudáfrica', match_date: '2026-06-21 21:00:00+00', stage: 'group', group_name: 'J', status: 'scheduled' },
    { home_team: 'Polonia', away_team: 'Sudáfrica', match_date: '2026-06-25 18:00:00+00', stage: 'group', group_name: 'J', status: 'scheduled' },
    { home_team: 'Arabia Saudita', away_team: 'Ghana', match_date: '2026-06-25 21:00:00+00', stage: 'group', group_name: 'J', status: 'scheduled' },
    { home_team: 'Sudáfrica', away_team: 'Arabia Saudita', match_date: '2026-06-29 18:00:00+00', stage: 'group', group_name: 'J', status: 'scheduled' },
    { home_team: 'Ghana', away_team: 'Polonia', match_date: '2026-06-29 18:00:00+00', stage: 'group', group_name: 'J', status: 'scheduled' },
    // GRUPO K
    { home_team: 'Suiza', away_team: 'Camerún', match_date: '2026-06-22 00:00:00+00', stage: 'group', group_name: 'K', status: 'scheduled' },
    { home_team: 'Turquía', away_team: 'Eslovaquia', match_date: '2026-06-22 18:00:00+00', stage: 'group', group_name: 'K', status: 'scheduled' },
    { home_team: 'Suiza', away_team: 'Eslovaquia', match_date: '2026-06-26 18:00:00+00', stage: 'group', group_name: 'K', status: 'scheduled' },
    { home_team: 'Camerún', away_team: 'Turquía', match_date: '2026-06-26 21:00:00+00', stage: 'group', group_name: 'K', status: 'scheduled' },
    { home_team: 'Eslovaquia', away_team: 'Camerún', match_date: '2026-06-30 18:00:00+00', stage: 'group', group_name: 'K', status: 'scheduled' },
    { home_team: 'Turquía', away_team: 'Suiza', match_date: '2026-06-30 18:00:00+00', stage: 'group', group_name: 'K', status: 'scheduled' },
    // GRUPO L
    { home_team: 'Austria', away_team: 'Kenia', match_date: '2026-06-23 00:00:00+00', stage: 'group', group_name: 'L', status: 'scheduled' },
    { home_team: 'Rumania', away_team: 'Panamá', match_date: '2026-06-23 18:00:00+00', stage: 'group', group_name: 'L', status: 'scheduled' },
    { home_team: 'Austria', away_team: 'Panamá', match_date: '2026-06-27 18:00:00+00', stage: 'group', group_name: 'L', status: 'scheduled' },
    { home_team: 'Kenia', away_team: 'Rumania', match_date: '2026-06-27 21:00:00+00', stage: 'group', group_name: 'L', status: 'scheduled' },
    { home_team: 'Panamá', away_team: 'Kenia', match_date: '2026-07-01 18:00:00+00', stage: 'group', group_name: 'L', status: 'scheduled' },
    { home_team: 'Rumania', away_team: 'Austria', match_date: '2026-07-01 18:00:00+00', stage: 'group', group_name: 'L', status: 'scheduled' },
  ]

  const { error: matchError } = await supabase.from('matches').insert(matches)
  if (matchError) console.error('  ❌ matches:', matchError.message)
  else console.log(`  ✅ ${matches.length} partidos cargados`)

  console.log('\n✅ Listo.')
}

run().catch(console.error)
