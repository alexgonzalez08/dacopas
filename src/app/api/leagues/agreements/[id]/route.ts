import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { sendPushToUsers } from '@/lib/push-server'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, content } = await req.json()
  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: 'Campos incompletos' }, { status: 400 })
  }

  const { data: agreement } = await supabase
    .from('league_agreements')
    .select('created_by, status, league_id')
    .eq('id', id)
    .single()

  if (!agreement) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  if (agreement.created_by !== user.id) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  if (agreement.status !== 'denied') {
    return NextResponse.json({ error: 'Solo se pueden editar acuerdos denegados' }, { status: 400 })
  }

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // Actualizar acuerdo y volver a pendiente
  const { data: updated, error } = await admin
    .from('league_agreements')
    .update({
      title: title.trim(),
      content: content.trim(),
      status: 'pending',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Resetear votos y renotificar
  {
    await admin
      .from('league_agreement_votes')
      .update({ status: 'pending', voted_at: null })
      .eq('agreement_id', id)

    const { data: members } = await admin
      .from('league_members')
      .select('user_id')
      .eq('league_id', agreement.league_id)
      .is('left_at', null)
      .neq('user_id', user.id)

    const { data: league } = await admin
      .from('leagues')
      .select('name')
      .eq('id', agreement.league_id)
      .single()

    if (members?.length) {
      await admin.from('notifications').insert(
        members.map(m => ({
          user_id: m.user_id,
          from_user_id: user.id,
          type: 'agreement_created',
          metadata: {
            agreement_id: id,
            league_id: agreement.league_id,
            league_name: league?.name ?? '',
            title: updated.title,
          },
        }))
      )

      await sendPushToUsers({
        userIds: members.map(m => m.user_id),
        title: '📄 Acuerdo actualizado',
        body: `"${updated.title}" fue revisado — tu firma es requerida de nuevo`,
        data: { url: `/leagues/${agreement.league_id}?tab=acuerdos` },
      })
    }
  }

  return NextResponse.json({ agreement: updated })
}
