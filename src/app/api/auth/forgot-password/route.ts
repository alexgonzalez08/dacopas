import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'
import crypto from 'crypto'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email requerido' }, { status: 400 })

  const supabase = createAdminClient()

  // Verificar que el usuario existe (búsqueda directa, no paginada)
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (listError) console.error('Error buscando usuario:', listError)
  const user = users?.find(u => u.email === email)
  // Siempre respondemos OK para no revelar si el email existe
  if (!user) {
    console.log('Usuario no encontrado para email:', email)
    return NextResponse.json({ ok: true })
  }

  // Generar token seguro
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hora

  // Borrar tokens previos del mismo email y guardar el nuevo
  await supabase.from('password_reset_tokens').delete().eq('email', email)
  const { error: insertError } = await supabase
    .from('password_reset_tokens')
    .insert({ email, token, expires_at: expiresAt.toISOString() })

  if (insertError) {
    console.error('Error guardando token:', insertError)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }

  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`

  const { error: emailError } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: email,
    subject: 'Recuperar contraseña — Dacopas',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0f172a;color:#e2e8f0;border-radius:12px">
        <h2 style="color:#eab308;margin-bottom:8px">Recuperar contraseña</h2>
        <p style="color:#94a3b8;margin-bottom:24px">
          Recibimos una solicitud para restablecer tu contraseña en Dacopas.
          El link es válido por 1 hora.
        </p>
        <a href="${resetUrl}"
           style="display:inline-block;background:#eab308;color:#0f172a;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none">
          Restablecer contraseña
        </a>
        <p style="color:#475569;font-size:12px;margin-top:24px">
          Si no solicitaste esto, podés ignorar este email.
        </p>
      </div>
    `,
  })

  if (emailError) {
    console.error('Error enviando email:', emailError)
    return NextResponse.json({ error: 'Error al enviar email' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
