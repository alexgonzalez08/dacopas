import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { StatsPostMetadata } from '@/components/stats-post-card'

const MOCK_METADATA: StatsPostMetadata = {
  blocks: [
    {
      title: 'Mejor puntaje en un torneo',
      emoji: '🏆',
      entries: [
        { rank: 1, label: '@juancho99', sublabel: 'Los Cracks del Mundial', value: '47', valueLabel: 'pts' },
        { rank: 2, label: '@mari_gol', sublabel: 'Amigos del Barrio', value: '43', valueLabel: 'pts' },
        { rank: 3, label: '@toto_fx', sublabel: 'Los Cracks del Mundial', value: '39', valueLabel: 'pts' },
      ],
    },
    {
      title: 'Torneos más competitivos (pts/miembro)',
      emoji: '⚔️',
      entries: [
        { rank: 1, label: 'Los Cracks del Mundial', sublabel: '8 participantes', value: '31.2', valueLabel: 'pts/miembro' },
        { rank: 2, label: 'Amigos del Barrio', sublabel: '12 participantes', value: '27.8', valueLabel: 'pts/miembro' },
        { rank: 3, label: 'Familia González', sublabel: '5 participantes', value: '24.4', valueLabel: 'pts/miembro' },
      ],
    },
    {
      title: 'Más resultados exactos',
      emoji: '🎯',
      entries: [
        { rank: 1, label: '@juancho99', value: '14', valueLabel: 'exactos' },
        { rank: 2, label: '@toto_fx', value: '11', valueLabel: 'exactos' },
        { rank: 3, label: '@nati_world', value: '10', valueLabel: 'exactos' },
      ],
    },
    {
      title: 'Partidos más difíciles de adivinar',
      emoji: '🤯',
      entries: [
        { rank: 1, label: 'Portugal 3-2 Marruecos', sublabel: '38 pronósticos', value: '0', valueLabel: 'exactos' },
        { rank: 2, label: 'Japón 1-0 España', sublabel: '41 pronósticos', value: '1', valueLabel: 'exactos' },
        { rank: 3, label: 'Arabia Saudita 2-1 Argentina', sublabel: '44 pronósticos', value: '2', valueLabel: 'exactos' },
      ],
    },
  ],
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const useMock = new URL(request.url).searchParams.get('mock') === 'true'

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Usar datos ficticios para previsualización local
  if (useMock) {
    await supabase.from('user_posts').delete().eq('is_system', true).eq('post_type', 'stats')
    const { data: anyProfile } = await supabase.from('profiles').select('id').limit(1).single()
    if (!anyProfile) return NextResponse.json({ error: 'No profiles found' }, { status: 500 })
    const { error } = await supabase.from('user_posts').insert(
      MOCK_METADATA.blocks.map(block => ({
        user_id: anyProfile.id,
        is_system: true,
        post_type: 'stats',
        metadata: { blocks: [block] } satisfies StatsPostMetadata,
        visibility: 'leagues',
      }))
    )
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, mock: true, posts: MOCK_METADATA.blocks.length })
  }

  // ── 1. Top 3 usuarios con más puntos en un mismo torneo ──────────────────
  const { data: topSingleLeague } = await supabase
    .from('league_points')
    .select('user_id, league_id, points, profiles(username), leagues(name)')
    .order('points', { ascending: false })
    .limit(50)

  // Deduplicate: best score per user (could have multiple leagues)
  const seenUsers1 = new Set<string>()
  const top3SingleLeague = (topSingleLeague ?? [])
    .filter(r => {
      if (seenUsers1.has(r.user_id)) return false
      seenUsers1.add(r.user_id)
      return true
    })
    .slice(0, 3)

  // ── 2. Top 3 torneos con mejor ratio pts/miembro ─────────────────────────
  const { data: allLeaguePoints } = await supabase
    .from('league_points')
    .select('league_id, points, leagues(name)')

  type RatioEntry = { league_id: string; name: string; totalPts: number; members: number; ratio: number }
  const leagueMap = new Map<string, RatioEntry>()
  for (const r of allLeaguePoints ?? []) {
    const name = (r.leagues as any)?.name ?? r.league_id
    if (!leagueMap.has(r.league_id)) {
      leagueMap.set(r.league_id, { league_id: r.league_id, name, totalPts: 0, members: 0, ratio: 0 })
    }
    const entry = leagueMap.get(r.league_id)!
    entry.totalPts += r.points
    entry.members += 1
  }
  const top3Ratio = Array.from(leagueMap.values())
    .map(e => ({ ...e, ratio: e.members > 0 ? e.totalPts / e.members : 0 }))
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 3)

  // ── 3. Top 3 usuarios con más exactos en un mismo torneo ────────────────
  const { data: allExacts } = await supabase
    .from('league_points')
    .select('user_id, exact_results, profiles(username)')
    .order('exact_results', { ascending: false })
    .limit(50)

  // Mejor marca por usuario (un solo torneo)
  const seenUsers3 = new Set<string>()
  const top3Exacts = (allExacts ?? [])
    .filter(r => {
      if (seenUsers3.has(r.user_id)) return false
      seenUsers3.add(r.user_id)
      return true
    })
    .slice(0, 3)
    .map(r => ({ user_id: r.user_id, username: (r.profiles as any)?.username ?? r.user_id, total: r.exact_results }))

  // ── 4. Top 3 partidos con menos resultados exactos (via RPC) ────────────
  const { data: hardestMatches } = await supabase.rpc('get_hardest_matches')

  // ── Build 4 blocks (one post each) ───────────────────────────────────────
  const blocks: StatsPostMetadata['blocks'] = [
    {
      title: 'Mejor puntaje en un torneo',
      emoji: '🏆',
      entries: top3SingleLeague.map((r, i) => ({
        rank: i + 1,
        label: `@${(r.profiles as any)?.username ?? r.user_id}`,
        sublabel: (r.leagues as any)?.name,
        value: String(r.points),
        valueLabel: 'pts',
      })),
    },
    {
      title: 'Torneos más competitivos (pts/miembro)',
      emoji: '⚔️',
      entries: top3Ratio.map((r, i) => ({
        rank: i + 1,
        label: r.name,
        sublabel: `${r.members} participantes`,
        value: r.ratio.toFixed(1),
        valueLabel: 'pts/miembro',
      })),
    },
    {
      title: 'Más resultados exactos',
      emoji: '🎯',
      entries: top3Exacts.map((r, i) => ({
        rank: i + 1,
        label: `@${r.username}`,
        value: String(r.total),
        valueLabel: 'exactos',
      })),
    },
    {
      title: 'Partidos más difíciles de adivinar',
      emoji: '🤯',
      entries: (hardestMatches ?? []).map((r: any, i: number) => ({
        rank: i + 1,
        label: r.label,
        sublabel: `${r.total_preds} pronósticos`,
        value: String(r.exact_count),
        valueLabel: 'exactos',
      })),
    },
  ]

  // Usar el primer perfil existente como user_id de sistema
  const { data: anyProfile } = await supabase
    .from('profiles')
    .select('id')
    .limit(1)
    .single()

  if (!anyProfile) return NextResponse.json({ error: 'No profiles found' }, { status: 500 })

  // Eliminar posts de estadísticas anteriores para no acumular
  await supabase.from('user_posts').delete().eq('is_system', true).eq('post_type', 'stats')

  const { error } = await supabase
    .from('user_posts')
    .insert(
      blocks.map(block => ({
        user_id: anyProfile.id,
        is_system: true,
        post_type: 'stats',
        metadata: { blocks: [block] } satisfies StatsPostMetadata,
        visibility: 'leagues',
      }))
    )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, posts: blocks.length })
}
