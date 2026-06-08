import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const leagueId = req.nextUrl.searchParams.get('leagueId')
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  const { data, error } = await supabase
    .from('league_chat_messages')
    .select('id, content, created_at, user_id, profiles(username, avatar_url)')
    .eq('league_id', leagueId)
    .order('created_at', { ascending: true })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ messages: data })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId, content } = await req.json()
  if (!leagueId || !content?.trim()) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const { data, error } = await supabase
    .from('league_chat_messages')
    .insert({ league_id: leagueId, user_id: user.id, content: content.trim() })
    .select('id, content, created_at, user_id, profiles(username, avatar_url)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ message: data })
}
