import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decryptMessage } from '@/lib/crypto'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { content } = await req.json()
  if (!content) return NextResponse.json({ error: 'Missing content' }, { status: 400 })

  return NextResponse.json({ content: decryptMessage(content) })
}
