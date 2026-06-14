import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: agreementId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { userId: targetUserId } = await req.json()
  if (!targetUserId) return NextResponse.json({ error: 'userId requerido' }, { status: 400 })

  // Verificar que el acuerdo existe, está pendiente y el caller es el creador
  const { data: agreement } = await supabase
    .from('league_agreements')
    .select('id, status, created_by, league_id')
    .eq('id', agreementId)
    .single()

  if (!agreement) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  if (agreement.status !== 'pending') return NextResponse.json({ error: 'Acuerdo ya resuelto' }, { status: 400 })
  if (agreement.created_by !== user.id) return NextResponse.json({ error: 'Solo el creador puede eximir firmas' }, { status: 403 })
  if (targetUserId === user.id) return NextResponse.json({ error: 'No podés eximirte a vos mismo' }, { status: 400 })

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // Verificar que el voto objetivo está pendiente
  const { data: targetVote } = await admin
    .from('league_agreement_votes')
    .select('id, status')
    .eq('agreement_id', agreementId)
    .eq('user_id', targetUserId)
    .single()

  if (!targetVote) return NextResponse.json({ error: 'Voto no encontrado' }, { status: 404 })
  if (targetVote.status !== 'pending') return NextResponse.json({ error: 'El voto ya fue emitido' }, { status: 400 })

  // Marcar como eximido
  await admin.from('league_agreement_votes')
    .update({ status: 'waived', voted_at: new Date().toISOString() })
    .eq('id', targetVote.id)

  // Revisar estado global del acuerdo
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

  return NextResponse.json({ ok: true, agreementStatus: newStatus ?? 'pending' })
}
