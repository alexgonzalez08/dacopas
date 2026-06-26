import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { type, targetId, reason } = await req.json()
  if (!type || !targetId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await admin.from('reports').insert({
    reporter_id: user.id,
    type,
    target_id: targetId,
    reason: reason ?? null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Obtener info del reporter
  const { data: reporter } = await admin
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single()

  const typeLabel: Record<string, string> = {
    user: 'Usuario',
    message: 'Mensaje de chat',
    post: 'Post',
  }

  await resend.emails.send({
    from: 'Dacopas <noreply@dacopas.com>',
    to: 'alex@dacopas.com',
    subject: `⚠️ Nuevo reporte en Dacopas — ${typeLabel[type] ?? type}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#f8fafc;border-radius:12px;">
        <h2 style="color:#d97706;margin-bottom:4px;">⚠️ Nuevo reporte</h2>
        <p style="color:#64748b;font-size:13px;margin-top:0;">Dacopas — Sistema de reportes</p>
        <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px;">
          <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:10px 8px;color:#64748b;width:140px;font-weight:600;">Tipo</td><td style="padding:10px 8px;color:#1e293b;">${typeLabel[type] ?? type}</td></tr>
          <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:10px 8px;color:#64748b;font-weight:600;">Reportado por</td><td style="padding:10px 8px;color:#1e293b;">@${reporter?.username ?? user.id}</td></tr>
          <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:10px 8px;color:#64748b;font-weight:600;">ID del objetivo</td><td style="padding:10px 8px;color:#1e293b;font-family:monospace;font-size:12px;">${targetId}</td></tr>
          <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:10px 8px;color:#64748b;font-weight:600;">Motivo</td><td style="padding:10px 8px;color:#1e293b;">${reason ?? '(sin motivo)'}</td></tr>
          <tr><td style="padding:10px 8px;color:#64748b;font-weight:600;">Fecha</td><td style="padding:10px 8px;color:#1e293b;">${new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}</td></tr>
        </table>
      </div>
    `,
  })

  return NextResponse.json({ ok: true })
}
