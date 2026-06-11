import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { post_id } = await request.json()
  if (!post_id) return NextResponse.json({ error: 'post_id requerido' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await supabase.from('dismissed_posts').upsert({ user_id: user.id, post_id })
  return NextResponse.json({ ok: true })
}
