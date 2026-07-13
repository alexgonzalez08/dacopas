import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { sendPushToUsers } from '@/lib/push-server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const leagueId = req.nextUrl.searchParams.get('leagueId')
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  // Verificar membresía
  const { data: membership } = await supabase
    .from('league_members')
    .select('role')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .is('left_at', null)
    .single()

  if (!membership) return NextResponse.json({ error: 'No sos miembro' }, { status: 403 })

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: agreements } = await admin
    .from('league_agreements')
    .select('*, votes:league_agreement_votes(id, user_id, status, voted_at)')
    .eq('league_id', leagueId)
    .order('created_at', { ascending: false })

  return NextResponse.json({ agreements: agreements ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId, title, content } = await req.json()
  if (!leagueId || !title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: 'Campos incompletos' }, { status: 400 })
  }

  // Verificar que el usuario es admin del torneo
  const { data: membership } = await supabase
    .from('league_members')
    .select('role')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .is('left_at', null)
    .single()

  if (!membership || membership.role !== 'admin') {
    return NextResponse.json({ error: 'Solo el admin puede crear acuerdos' }, { status: 403 })
  }

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: leagueCheck } = await admin.from('leagues').select('ended_at').eq('id', leagueId).single()
  if (leagueCheck?.ended_at) return NextResponse.json({ error: 'El torneo ya terminó' }, { status: 400 })

  // Crear acuerdo
  const { data: agreement, error } = await supabase
    .from('league_agreements')
    .insert({ league_id: leagueId, created_by: user.id, title: title.trim(), content: content.trim() })
    .select()
    .single()

  if (error || !agreement) return NextResponse.json({ error: error?.message }, { status: 500 })

  // Traer todos los miembros activos
  const { data: members } = await admin
    .from('league_members')
    .select('user_id, profiles(username)')
    .eq('league_id', leagueId)
    .is('left_at', null)

  const allMembers = members ?? []
  const nonAdminMembers = allMembers.filter(m => m.user_id !== user.id)

  // Crear votos: creador auto-aceptado, resto pendientes
  if (allMembers.length > 0) {
    await admin.from('league_agreement_votes').insert(
      allMembers.map(m => ({
        agreement_id: agreement.id,
        user_id: m.user_id,
        status: m.user_id === user.id ? 'accepted' : 'pending',
        voted_at: m.user_id === user.id ? new Date().toISOString() : null,
      }))
    )
  }

  // Obtener nombre del torneo y del admin
  const [{ data: league }, { data: adminProfile }] = await Promise.all([
    admin.from('leagues').select('name').eq('id', leagueId).single(),
    admin.from('profiles').select('username').eq('id', user.id).single(),
  ])

  // Notificar solo a los no-admin
  if (nonAdminMembers.length > 0) {
    await supabase.from('notifications').insert(
      nonAdminMembers.map(m => ({
        user_id: m.user_id,
        from_user_id: user.id,
        type: 'agreement_created',
        metadata: {
          agreement_id: agreement.id,
          league_id: leagueId,
          league_name: league?.name ?? '',
          title: agreement.title,
          admin_username: adminProfile?.username ?? '',
        },
      }))
    )

    await sendPushToUsers({
      userIds: nonAdminMembers.map(m => m.user_id),
      title: '📄 Nuevo acuerdo',
      body: `"${agreement.title}" — Tu firma es requerida en ${league?.name ?? 'el torneo'}`,
      data: { url: `/leagues/${leagueId}` },
    })
  }

  return NextResponse.json({ agreement })
}
