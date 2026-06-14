import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
  if (file.size > 3 * 1024 * 1024) return NextResponse.json({ error: 'La imagen no puede superar 3MB' }, { status: 400 })

  const path = `${user.id}/avatar.jpg`
  const buffer = Buffer.from(await file.arrayBuffer())

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error: uploadError } = await admin.storage
    .from('avatars')
    .upload(path, buffer, { upsert: true, contentType: file.type })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = admin.storage.from('avatars').getPublicUrl(path)
  const versionedUrl = `${publicUrl}?v=${Date.now()}`

  await admin.from('profiles').update({ avatar_url: versionedUrl }).eq('id', user.id)

  return NextResponse.json({ publicUrl: versionedUrl })
}
