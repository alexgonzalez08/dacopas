import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { sendPushToUsers } from '@/lib/push-server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: agreementId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { vote } = await req.json() // 'accepted' | 'declined'
  if (vote !== 'accepted' && vote !== 'declined') {
    return NextResponse.json({ error: 'Voto inválido' }, { status: 400 })
  }

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // Verificar que el acuerdo existe y está pendiente
  const { data: agreement } = await supabase
    .from('league_agreements')
    .select('id, title, status, created_by, league_id')
    .eq('id', agreementId)
    .single()

  if (!agreement) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  if (agreement.status !== 'pending') return NextResponse.json({ error: 'Acuerdo ya resuelto' }, { status: 400 })

  // Verificar que el usuario tiene un voto pendiente
  const { data: existingVote } = await supabase
    .from('league_agreement_votes')
    .select('id, status')
    .eq('agreement_id', agreementId)
    .eq('user_id', user.id)
    .single()

  if (!existingVote) return NextResponse.json({ error: 'Sin voto asignado' }, { status: 403 })
  if (existingVote.status !== 'pending') return NextResponse.json({ error: 'Ya votaste' }, { status: 400 })

  // Registrar voto (admin client para saltar RLS)
  await admin.from('league_agreement_votes')
    .update({ status: vote, voted_at: new Date().toISOString() })
    .eq('id', existingVote.id)

  // Revisar el estado global del acuerdo
  const { data: allVotes } = await admin
    .from('league_agreement_votes')
    .select('status')
    .eq('agreement_id', agreementId)

  const votes = allVotes ?? []
  const anyDeclined = votes.some(v => v.status === 'declined')
  const allResolved = votes.every(v => v.status !== 'pending')

  let newStatus: string | null = null
  if (anyDeclined) newStatus = 'denied'
  else if (allResolved) newStatus = 'approved'

  if (newStatus) {
    await admin
      .from('league_agreements')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', agreementId)
  }

  // Notificar al admin
  const { data: voterProfile } = await admin.from('profiles').select('username').eq('id', user.id).single()
  const voterUsername = voterProfile?.username ?? 'Alguien'

  await supabase.from('notifications').insert({
    user_id: agreement.created_by,
    from_user_id: user.id,
    type: 'agreement_vote',
    metadata: {
      agreement_id: agreementId,
      league_id: agreement.league_id,
      title: agreement.title,
      vote,
      username: voterUsername,
    },
  })

  await sendPushToUsers({
    userIds: [agreement.created_by],
    title: vote === 'accepted' ? '✅ Acuerdo aceptado' : '❌ Acuerdo rechazado',
    body: `@${voterUsername} ${vote === 'accepted' ? 'aceptó' : 'rechazó'} "${agreement.title}"`,
    data: { url: `/leagues/${agreement.league_id}` },
  })

  // Si el acuerdo se resolvió, notificar a todos los miembros
  if (newStatus) {
    const { data: members } = await admin
      .from('league_members')
      .select('user_id')
      .eq('league_id', agreement.league_id)
      .is('left_at', null)
      .neq('user_id', agreement.created_by)

    if (members?.length) {
      await supabase.from('notifications').insert(
        members.map(m => ({
          user_id: m.user_id,
          type: newStatus === 'approved' ? 'agreement_approved' : 'agreement_denied',
          metadata: {
            agreement_id: agreementId,
            league_id: agreement.league_id,
            title: agreement.title,
          },
        }))
      )
    }
  }

  return NextResponse.json({ ok: true, agreementStatus: newStatus ?? 'pending' })
}
