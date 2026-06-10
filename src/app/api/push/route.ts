import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendPushToUsers } from '@/lib/push-server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { toUserId, title, body, data } = await req.json()
  if (!toUserId || !title || !body) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  await sendPushToUsers({ userIds: [toUserId], title, body, data })
  return NextResponse.json({ ok: true })
}
