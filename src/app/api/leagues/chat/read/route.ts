import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await req.json()
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  await supabase.from('league_chat_reads').upsert(
    { user_id: user.id, league_id: leagueId, last_read_at: new Date().toISOString() },
    { onConflict: 'user_id,league_id' }
  )

  return NextResponse.json({ ok: true })
}
