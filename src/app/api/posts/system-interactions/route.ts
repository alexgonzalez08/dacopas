import { createClient as createAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const admin = () => createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET — leer reacciones y comentarios actualizados de un post de sistema
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const postId = new URL(request.url).searchParams.get('postId')
  if (!postId) return NextResponse.json({ error: 'postId requerido' }, { status: 400 })

  const db = admin()
  const [{ data: reactions }, { data: comments }] = await Promise.all([
    db.from('post_reactions').select('id, emoji, user_id, profiles(username)').eq('post_id', postId),
    db.from('post_comments').select('id, content, user_id, created_at, profiles(username, avatar_url)').eq('post_id', postId).order('created_at'),
  ])

  return NextResponse.json({ reactions: reactions ?? [], comments: comments ?? [] })
}

// POST — agregar reacción o comentario
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action, postId, emoji, content, reactionId } = await request.json()
  const db = admin()

  if (action === 'remove_reaction') {
    if (!reactionId) return NextResponse.json({ error: 'reactionId requerido' }, { status: 400 })
    // Solo puede borrar su propia reacción
    await db.from('post_reactions').delete().eq('id', reactionId).eq('user_id', user.id)
    return NextResponse.json({ ok: true })
  }

  if (action === 'react') {
    if (!postId || !emoji) return NextResponse.json({ error: 'postId y emoji requeridos' }, { status: 400 })
    const { data } = await db
      .from('post_reactions')
      .insert({ post_id: postId, user_id: user.id, emoji })
      .select('id, emoji, user_id, profiles(username)')
      .single()
    return NextResponse.json({ reaction: data })
  }

  if (action === 'comment') {
    if (!postId || !content?.trim()) return NextResponse.json({ error: 'postId y content requeridos' }, { status: 400 })
    const { data } = await db
      .from('post_comments')
      .insert({ post_id: postId, user_id: user.id, content: content.trim() })
      .select('id, content, user_id, created_at, profiles(username, avatar_url)')
      .single()
    return NextResponse.json({ comment: data })
  }

  if (action === 'delete_comment') {
    const { commentId } = await request.json().catch(() => ({}))
    // Solo puede borrar su propio comentario
    if (!commentId) return NextResponse.json({ error: 'commentId requerido' }, { status: 400 })
    await db.from('post_comments').delete().eq('id', commentId).eq('user_id', user.id)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 })
}

// DELETE — borrar comentario propio
export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { commentId } = await request.json()
  if (!commentId) return NextResponse.json({ error: 'commentId requerido' }, { status: 400 })

  const db = admin()
  await db.from('post_comments').delete().eq('id', commentId).eq('user_id', user.id)
  return NextResponse.json({ ok: true })
}
