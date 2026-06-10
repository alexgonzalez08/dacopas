import BackButton from '@/components/back-button'

export const metadata = {
  title: 'Política de Privacidad — Dacopas',
}

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-12 text-slate-300">
      <BackButton />
      <h1 className="text-3xl font-bold text-white mb-2">Política de Privacidad</h1>
      <p className="text-sm text-slate-500 mb-10">Última actualización: junio 2026</p>

      <section className="space-y-8 text-sm leading-relaxed">
        <div>
          <h2 className="text-lg font-semibold text-white mb-2">1. Información que recopilamos</h2>
          <p>Dacopas recopila la siguiente información cuando usás la app:</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-slate-400">
            <li>Nombre de usuario y dirección de correo electrónico al registrarte</li>
            <li>Foto de perfil (opcional, si la subís)</li>
            <li>Pronósticos y predicciones que realizás</li>
            <li>Mensajes enviados en el chat de torneos</li>
            <li>Token de notificaciones push de tu dispositivo</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">2. Cómo usamos tu información</h2>
          <ul className="list-disc list-inside mt-2 space-y-1 text-slate-400">
            <li>Para operar y mejorar la app</li>
            <li>Para mostrarte tu posición en los torneos y la actividad de tus amigos</li>
            <li>Para enviarte notificaciones push sobre mensajes, invitaciones y resultados</li>
            <li>Para identificarte dentro de los torneos en los que participás</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">3. Notificaciones push</h2>
          <p className="text-slate-400">
            Usamos Firebase Cloud Messaging (FCM) de Google para enviar notificaciones push. Tu token de dispositivo se almacena de forma segura y solo se usa para enviarte notificaciones relacionadas con tu actividad en Dacopas. Podés desactivar las notificaciones en cualquier momento desde la configuración de tu dispositivo.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">4. Almacenamiento de datos</h2>
          <p className="text-slate-400">
            Tus datos se almacenan en Supabase, una plataforma de base de datos segura. Los mensajes del chat se encriptan antes de guardarse. No vendemos ni compartimos tu información personal con terceros.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">5. Tus derechos</h2>
          <p className="text-slate-400">
            Podés solicitar la eliminación de tu cuenta y todos tus datos en cualquier momento contactándonos. También podés abandonar torneos y eliminar publicaciones dentro de la app.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">6. Menores de edad</h2>
          <p className="text-slate-400">
            Dacopas no está dirigida a menores de 13 años. No recopilamos intencionalmente información de menores.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">7. Cambios a esta política</h2>
          <p className="text-slate-400">
            Podemos actualizar esta política ocasionalmente. Te notificaremos sobre cambios significativos a través de la app. El uso continuado de Dacopas después de los cambios implica tu aceptación.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">8. Estándares contra la explotación y el abuso sexual infantil (EASI)</h2>
          <p className="text-slate-400">
            Dacopas tiene una política de cero tolerancia frente a cualquier contenido que explote o abuse sexualmente de menores (CSAM). Esto incluye imágenes, videos, texto o cualquier otro tipo de contenido que sexualice a menores de edad.
          </p>
          <ul className="list-disc list-inside mt-3 space-y-1 text-slate-400">
            <li>Está estrictamente prohibido compartir, distribuir o promover contenido de abuso sexual infantil a través de Dacopas.</li>
            <li>Cualquier cuenta que publique o comparta dicho contenido será suspendida de forma inmediata y permanente.</li>
            <li>Reportaremos todo contenido o actividad de este tipo a las autoridades competentes y a los organismos de seguridad infantil correspondientes.</li>
            <li>Los usuarios pueden reportar contenido inapropiado contactando a <a href="mailto:alexgf08@gmail.com" className="text-yellow-400 hover:underline">alexgf08@gmail.com</a>.</li>
          </ul>
          <p className="text-slate-400 mt-3">
            Dacopas es una aplicación de pronósticos deportivos destinada a adultos y jóvenes mayores de 13 años bajo supervisión. No está diseñada para compartir contenido de ningún tipo fuera del contexto de los torneos de predicciones.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">9. Contacto</h2>
          <p className="text-slate-400">
            Si tenés preguntas sobre esta política de privacidad, contactanos en:{' '}
            <a href="mailto:alexgf08@gmail.com" className="text-yellow-400 hover:underline">
              alexgf08@gmail.com
            </a>
          </p>
        </div>
      </section>
    </div>
  )
}
