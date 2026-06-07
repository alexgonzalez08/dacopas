import { createClient as createAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Metadata } from 'next'
import JoinClient from './join-client'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const adminSupabase = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: league } = await adminSupabase
    .from('leagues')
    .select('name, description, image_url')
    .eq('id', id)
    .single()

  if (!league) return {}

  const title = `${league.name} — Dacopas`
  const description = league.description ?? '¡Entrá y predecí los resultados del Mundial 2026!'
  const image = league.image_url ?? 'https://dacopas.com/og-default.png'

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: image, width: 1200, height: 630 }],
      siteName: 'Dacopas',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  }
}

export default async function JoinPage({ params }: Props) {
  const { id } = await params

  const adminSupabase = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: league } = await adminSupabase
    .from('leagues')
    .select('id, name, description, image_url, code')
    .eq('id', id)
    .single()

  if (!league) notFound()

  // Obtener miembros
  const { data: membersData } = await adminSupabase
    .from('league_members')
    .select('user_id, profiles(username, avatar_url)')
    .eq('league_id', id)
    .is('left_at', null)

  const members = (membersData ?? []).map(m => ({
    user_id: m.user_id,
    username: (Array.isArray(m.profiles) ? m.profiles[0] : m.profiles)?.username ?? 'Usuario',
    avatar_url: (Array.isArray(m.profiles) ? m.profiles[0] : m.profiles)?.avatar_url ?? null,
  }))

  // Obtener puntos para mostrar top 3
  const { data: points } = await adminSupabase
    .from('league_points')
    .select('user_id, points')
    .eq('league_id', id)
    .order('points', { ascending: false })
    .limit(3)

  const pointsMap = new Map((points ?? []).map(p => [p.user_id, p.points]))
  const top3 = members
    .map(m => ({ ...m, points: pointsMap.get(m.user_id) ?? 0 }))
    .sort((a, b) => b.points - a.points)
    .slice(0, 3)

  // Verificar si el usuario ya está logueado
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Si está logueado y ya es miembro → redirect directo al torneo
  if (user) {
    const isMember = members.some(m => m.user_id === user.id)
    if (isMember) redirect(`/leagues/${id}`)
  }

  // Detectar si es usuario nuevo (creado en los últimos 5 minutos)
  let isNewUser = false
  if (user) {
    const createdAt = new Date(user.created_at)
    const diffMs = Date.now() - createdAt.getTime()
    isNewUser = diffMs < 5 * 60 * 1000
  }

  return (
    <JoinClient
      league={league}
      members={members}
      top3={top3}
      isLoggedIn={!!user}
      userId={user?.id ?? null}
      isNewUser={isNewUser}
    />
  )
}
