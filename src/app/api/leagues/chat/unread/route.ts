import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 10

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase.rpc('get_chat_unread_counts', { p_user_id: user.id })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const counts: Record<string, number> = {}
  let total = 0
  for (const row of data ?? []) {
    counts[row.league_id] = row.unread_count
    total += row.unread_count
  }

  return NextResponse.json({ counts, total })
}
