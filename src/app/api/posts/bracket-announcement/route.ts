import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: anyProfile } = await supabase
    .from('profiles')
    .select('id')
    .limit(1)
    .single()

  if (!anyProfile) return NextResponse.json({ error: 'No profiles found' }, { status: 500 })

  // Eliminar anuncio anterior si existe
  await supabase.from('user_posts').delete().eq('is_system', true).eq('post_type', 'bracket_announcement')

  const { error } = await supabase.from('user_posts').insert({
    user_id: anyProfile.id,
    is_system: true,
    post_type: 'bracket_announcement',
    content: '¡Ya están disponibles las llaves de la Segunda Ronda Eliminatoria!',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
