import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const { email, subject, message, username } = await req.json()
  if (!email || !subject || !message) {
    return NextResponse.json({ error: 'Campos incompletos' }, { status: 400 })
  }

  const { error } = await resend.emails.send({
    from: 'Dacopas <noreply@dacopas.com>',
    to: 'alexgf08@gmail.com',
    replyTo: email,
    subject: `🐛 Reporte de problema — ${subject}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#f8fafc;border-radius:12px;">
        <h2 style="color:#d97706;margin-bottom:4px;">🐛 Reporte de problema</h2>
        <p style="color:#64748b;font-size:13px;margin-top:0;">Dacopas — Soporte</p>
        <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px;">
          <tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:10px 8px;color:#64748b;width:140px;font-weight:600;">Usuario</td>
            <td style="padding:10px 8px;color:#1e293b;">${username ? `@${username}` : '(sin cuenta)'}</td>
          </tr>
          <tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:10px 8px;color:#64748b;font-weight:600;">Email</td>
            <td style="padding:10px 8px;color:#1e293b;">${email}</td>
          </tr>
          <tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:10px 8px;color:#64748b;font-weight:600;">Asunto</td>
            <td style="padding:10px 8px;color:#1e293b;">${subject}</td>
          </tr>
          <tr>
            <td style="padding:10px 8px;color:#64748b;font-weight:600;vertical-align:top;">Descripción</td>
            <td style="padding:10px 8px;color:#1e293b;white-space:pre-wrap;">${message}</td>
          </tr>
        </table>
        <p style="color:#94a3b8;font-size:12px;margin-top:20px;">
          Enviado el ${new Date().toLocaleString('es-CR', { timeZone: 'America/Costa_Rica' })}
        </p>
      </div>
    `,
  })

  if (error) return NextResponse.json({ error: 'Error al enviar' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
