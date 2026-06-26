import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const { email, username } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email requerido' }, { status: 400 })

  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: email,
    subject: '¡Bienvenido/a a Dacopas! 🏆',
    html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0a0f1e;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#0a0f1e" style="background:#0a0f1e;min-height:100vh">
    <tr><td align="center" style="padding:40px 24px">
  <div style="max-width:520px;width:100%">

    <!-- Logo / Header -->
    <div style="text-align:center;margin-bottom:32px">
      <div style="display:inline-block;background:#eab308;border-radius:16px;padding:14px 28px">
        <span style="font-size:24px;font-weight:900;color:#0a0f1e;letter-spacing:-0.5px">DACOPAS</span>
      </div>
    </div>

    <!-- Main card -->
    <div style="background:#0f172a;border-radius:16px;padding:36px 32px;border:1px solid #1e293b">

      <h1 style="color:#f8fafc;font-size:22px;font-weight:800;margin:0 0 8px 0;line-height:1.3">
        ¡Ya sos parte de Dacopas, ${username ? username : 'campeón'}! 🎉
      </h1>
      <p style="color:#94a3b8;font-size:15px;margin:0 0 28px 0;line-height:1.6">
        Gracias por unirte. Esta es tu arena: donde los pronósticos se convierten en gloria,
        las amistades se ponen a prueba y los mejores pronosticadores dejan su nombre grabado.
        ¡Que empiece el juego!
      </p>

      <!-- Steps -->
      <p style="color:#cbd5e1;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 16px 0">
        Cómo empezar
      </p>

      <!-- Step 1 -->
      <div style="display:flex;gap:16px;margin-bottom:20px;align-items:flex-start">
        <div style="min-width:36px;width:36px;height:36px;background:#eab308;border-radius:50%;font-weight:900;color:#0a0f1e;font-size:16px;text-align:center;line-height:36px;display:block">1</div>
        <div>
          <p style="color:#f1f5f9;font-size:15px;font-weight:700;margin:0 0 4px 0">⚽ Creá o unite a un torneo</p>
          <p style="color:#64748b;font-size:13px;margin:0;line-height:1.5">
            Armá tu propio torneo de pronósticos o unite a uno ya en marcha.
            Cada fecha es una nueva oportunidad de subir en la tabla.
          </p>
        </div>
      </div>

      <!-- Step 2 -->
      <div style="display:flex;gap:16px;margin-bottom:20px;align-items:flex-start">
        <div style="min-width:36px;width:36px;height:36px;background:#eab308;border-radius:50%;font-weight:900;color:#0a0f1e;font-size:16px;text-align:center;line-height:36px;display:block">2</div>
        <div>
          <p style="color:#f1f5f9;font-size:15px;font-weight:700;margin:0 0 4px 0">🤝 Sumá amistades</p>
          <p style="color:#64748b;font-size:13px;margin:0;line-height:1.5">
            Conectate con tus amigos y seguí sus movidas. ¿Quién pronostica mejor?
            Hay una sola manera de saberlo.
          </p>
        </div>
      </div>

      <!-- Step 3 -->
      <div style="display:flex;gap:16px;margin-bottom:20px;align-items:flex-start">
        <div style="min-width:36px;width:36px;height:36px;background:#eab308;border-radius:50%;font-weight:900;color:#0a0f1e;font-size:16px;text-align:center;line-height:36px;display:block">3</div>
        <div>
          <p style="color:#f1f5f9;font-size:15px;font-weight:700;margin:0 0 4px 0">🔥 Posteá tus temas de actualidad</p>
          <p style="color:#64748b;font-size:13px;margin:0;line-height:1.5">
            ¿Quién va a ser campeón? ¿El árbitro la cagó? ¿Quién es el mejor del mundo?
            Publicá tus opiniones más picantes y generá debate.
          </p>
        </div>
      </div>

      <!-- Step 4 -->
      <div style="display:flex;gap:16px;margin-bottom:32px;align-items:flex-start">
        <div style="min-width:36px;width:36px;height:36px;background:#eab308;border-radius:50%;font-weight:900;color:#0a0f1e;font-size:16px;text-align:center;line-height:36px;display:block">4</div>
        <div>
          <p style="color:#f1f5f9;font-size:15px;font-weight:700;margin:0 0 4px 0">🍺 Divertite con tu gente</p>
          <p style="color:#64748b;font-size:13px;margin:0;line-height:1.5">
            Comentá, opiná, celebrá los aciertos y bancate las críticas.
            Con amigos y rivales, la pasión del fútbol se vive distinto.
          </p>
        </div>
      </div>

      <!-- CTA Button -->
      <div style="text-align:center;margin-bottom:32px">
        <a href="${dashboardUrl}"
           style="display:inline-block;background:#eab308;color:#0a0f1e;font-weight:800;font-size:16px;padding:14px 36px;border-radius:10px;text-decoration:none;letter-spacing:0.3px">
          ¡Ir a mi cuenta →
        </a>
      </div>

      <hr style="border:none;border-top:1px solid #1e293b;margin:0 0 28px 0">

      <!-- Acceso desde cualquier dispositivo -->
      <p style="color:#cbd5e1;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 16px 0">
        📱 Accedé desde cualquier dispositivo
      </p>
      <p style="color:#94a3b8;font-size:14px;margin:0 0 20px 0;line-height:1.7">
        Podés usar Dacopas desde tu <strong style="color:#f1f5f9">computadora</strong> o instalarlo como app en tu celular:
      </p>

      <!-- iOS -->
      <div style="background:#0a0f1e;border-radius:12px;padding:20px;margin-bottom:12px;border:1px solid #1e293b">
        <p style="color:#f1f5f9;font-size:14px;font-weight:700;margin:0 0 12px 0">🍎 iPhone / iPad (iOS)</p>
        <ol style="color:#94a3b8;font-size:13px;margin:0;padding-left:20px;line-height:2">
          <li>Abrí <strong style="color:#f1f5f9">Safari</strong> y entrá a <a href="https://www.dacopas.com" style="color:#eab308;text-decoration:none">www.dacopas.com</a></li>
          <li>Tocá el ícono de <strong style="color:#f1f5f9">Compartir</strong> ⬆️ (abajo al centro)</li>
          <li>Seleccioná <strong style="color:#f1f5f9">"Agregar a pantalla de inicio"</strong></li>
          <li>Tocá <strong style="color:#f1f5f9">"Agregar"</strong> — ¡listo! 🎉</li>
        </ol>
      </div>

      <!-- Android -->
      <div style="background:#0a0f1e;border-radius:12px;padding:20px;margin-bottom:0;border:1px solid #1e293b">
        <p style="color:#f1f5f9;font-size:14px;font-weight:700;margin:0 0 8px 0">🤖 Android</p>
        <p style="color:#94a3b8;font-size:13px;margin:0;line-height:1.7">
          ¿Sos usuario de Android y querés instalar Dacopas como app?
          Escribile directamente a <strong style="color:#f1f5f9">Alex González</strong>, desarrollador y creador de Dacopas,
          a <a href="mailto:alex@dacopas.com" style="color:#eab308;text-decoration:none">alex@dacopas.com</a>
          y con gusto te ayuda a instalarlo. 🙌
        </p>
      </div>

    </div>

    <!-- Footer -->
    <p style="color:#334155;font-size:12px;text-align:center;margin-top:24px;line-height:1.6">
      Recibiste este email porque te registraste en Dacopas.<br>
      © ${new Date().getFullYear()} Dacopas. Todos los derechos reservados.
    </p>

  </div>
    </td></tr>
  </table>
</body>
</html>
    `,
  })

  if (error) {
    console.error('Error enviando welcome email:', error)
    return NextResponse.json({ error: 'Error al enviar email' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
