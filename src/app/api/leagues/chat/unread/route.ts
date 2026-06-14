import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 10

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Ligas donde el usuario es miembro activo
  const { data: memberships } = await supabase
    .from('league_members')
    .select('league_id')
    .eq('user_id', user.id)
    .is('left_at', null)

  const leagueIds = (memberships ?? []).map(m => m.league_id)
  if (leagueIds.length === 0) return NextResponse.json({ counts: {}, total: 0 })

  // Último read por liga
  const { data: reads } = await supabase
    .from('league_chat_reads')
    .select('league_id, last_read_at')
    .eq('user_id', user.id)
    .in('league_id', leagueIds)

  const readMap = new Map((reads ?? []).map(r => [r.league_id, r.last_read_at]))

  // Contar mensajes nuevos: una query por liga pero en serie para no saturar conexiones
  const counts: Record<string, number> = {}
  let total = 0

  for (const leagueId of leagueIds) {
    const lastRead = readMap.get(leagueId)
    let query = supabase
      .from('league_chat_messages')
      .select('id', { count: 'exact', head: true })
      .eq('league_id', leagueId)
      .neq('user_id', user.id)

    if (lastRead) query = query.gt('created_at', lastRead)

    const { count } = await query
    if (count && count > 0) {
      counts[leagueId] = count
      total += count
    }
  }

  return NextResponse.json({ counts, total })
}
