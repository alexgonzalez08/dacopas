import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userAgent = req.headers.get('user-agent') ?? 'Desconocido'
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? 'Desconocida'

  const now = new Date()
  const fecha = now.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const hora = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' })

  // Detectar dispositivo/navegador básico
  let dispositivo = 'Navegador de escritorio'
  if (/android/i.test(userAgent)) dispositivo = 'Android'
  else if (/iphone|ipad/i.test(userAgent)) dispositivo = 'iPhone / iPad'
  else if (/mobile/i.test(userAgent)) dispositivo = 'Dispositivo móvil'

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: user.email!,
    subject: 'Nuevo inicio de sesión en Dacopas',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0f172a;color:#e2e8f0;border-radius:12px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px">
          <img src="https://dacopas.com/logo.png" width="40" height="40" style="border-radius:8px" />
          <span style="color:#eab308;font-size:20px;font-weight:700">Dacopas</span>
        </div>
        <h2 style="color:#f1f5f9;margin-bottom:8px;font-size:18px">Nuevo inicio de sesión detectado</h2>
        <p style="color:#94a3b8;margin-bottom:24px;font-size:14px">
          Se inició sesión en tu cuenta de Dacopas con los siguientes detalles:
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr>
            <td style="padding:10px 0;color:#64748b;border-bottom:1px solid #1e293b">Fecha</td>
            <td style="padding:10px 0;color:#e2e8f0;border-bottom:1px solid #1e293b;text-align:right;text-transform:capitalize">${fecha}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;color:#64748b;border-bottom:1px solid #1e293b">Hora</td>
            <td style="padding:10px 0;color:#e2e8f0;border-bottom:1px solid #1e293b;text-align:right">${hora} (ARG)</td>
          </tr>
          <tr>
            <td style="padding:10px 0;color:#64748b;border-bottom:1px solid #1e293b">Dispositivo</td>
            <td style="padding:10px 0;color:#e2e8f0;border-bottom:1px solid #1e293b;text-align:right">${dispositivo}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;color:#64748b">IP</td>
            <td style="padding:10px 0;color:#e2e8f0;text-align:right">${ip}</td>
          </tr>
        </table>
        <div style="margin-top:24px;padding:16px;background:#1e293b;border-radius:8px;border-left:3px solid #eab308">
          <p style="color:#94a3b8;font-size:13px;margin:0">
            Si no fuiste vos, cambiá tu contraseña de inmediato desde
            <a href="https://dacopas.com/forgot-password" style="color:#eab308;text-decoration:none">dacopas.com/forgot-password</a>
          </p>
        </div>
      </div>
    `,
  })

  return NextResponse.json({ ok: true })
}
