import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { encryptMessage, decryptMessage } from '@/lib/crypto'
import { sendPushToUsers } from '@/lib/push-server'

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

  // Desencriptar contenido de cada mensaje
  const messages = (data ?? []).map(m => ({
    ...m,
    content: decryptMessage(m.content),
  }))

  return NextResponse.json({ messages })
}

async function notifyMembers(leagueId: string, senderId: string, senderUsername: string, content: string) {
  const adminSupabase = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Obtener nombre e imagen del torneo
  const { data: league } = await adminSupabase
    .from('leagues')
    .select('name, image_url')
    .eq('id', leagueId)
    .single()

  // Obtener todos los miembros activos excepto el remitente
  const { data: members } = await adminSupabase
    .from('league_members')
    .select('user_id')
    .eq('league_id', leagueId)
    .is('left_at', null)
    .neq('user_id', senderId)

  if (!members || members.length === 0) return

  const leagueName = league?.name ?? 'Torneo'
  const preview = content.length > 60 ? content.slice(0, 57) + '...' : content
  const memberIds = members.map(m => m.user_id)

  await sendPushToUsers({
    userIds: memberIds,
    title: `💬 ${leagueName}`,
    body: `@${senderUsername}: ${preview}`,
    data: {
      url: `/leagues/${leagueId}?chat=open`,
      image: league?.image_url ?? 'https://www.dacopas.com/og-image.png',
      tag: `chat-${leagueId}`,
    },
  })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId, content } = await req.json()
  if (!leagueId || !content?.trim()) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const encrypted = encryptMessage(content.trim())

  const { data, error } = await supabase
    .from('league_chat_messages')
    .insert({ league_id: leagueId, user_id: user.id, content: encrypted })
    .select('id, content, created_at, user_id, profiles(username, avatar_url)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Devolver con contenido desencriptado para el optimistic update
  const message = data ? { ...data, content: content.trim() } : null

  // Notificar a los demás miembros del torneo en background
  const senderUsername = (data?.profiles as any)?.username ?? 'Alguien'
  notifyMembers(leagueId, user.id, senderUsername, content.trim()).catch(() => {})

  return NextResponse.json({ message })
}
