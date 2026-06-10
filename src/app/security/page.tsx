import BackButton from '@/components/back-button'

export const metadata = {
  title: 'Seguridad y Eliminación de Datos — Dacopas',
}

export default function SecurityPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-12 text-slate-300">
      <BackButton />
      <div className="flex items-center gap-3 mb-2">
        <img src="/logo.png" alt="Dacopas" className="w-10 h-10 object-contain" />
        <span className="text-yellow-400 font-bold text-xl">Dacopas</span>
      </div>
      <h1 className="text-3xl font-bold text-white mb-2">Seguridad y Eliminación de Datos</h1>
      <p className="text-sm text-slate-500 mb-10">Desarrollado por Alex Gonzalez · Última actualización: junio 2026</p>

      <section className="space-y-10 text-sm leading-relaxed">

        <div>
          <h2 className="text-lg font-semibold text-white mb-3">¿Qué datos recopila Dacopas?</h2>
          <ul className="list-disc list-inside space-y-1 text-slate-400">
            <li>Nombre de usuario (alias) y correo electrónico</li>
            <li>Foto de perfil (opcional)</li>
            <li>Pronósticos y predicciones de partidos</li>
            <li>Mensajes en el chat de torneos (encriptados)</li>
            <li>Relaciones de amistad dentro de la app</li>
            <li>Participación en torneos privados</li>
            <li>Token de notificaciones push del dispositivo</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Cómo solicitar la eliminación de tu cuenta</h2>
          <p className="text-slate-400 mb-4">Podés solicitar la eliminación de tu cuenta y todos tus datos de dos formas:</p>

          <div className="space-y-4">
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <p className="font-semibold text-white mb-2">Opción 1 — Desde la app (recomendado)</p>
              <ol className="list-decimal list-inside space-y-1 text-slate-400">
                <li>Iniciá sesión en Dacopas</li>
                <li>Tocá tu avatar en la esquina superior derecha</li>
                <li>Seleccioná <span className="text-yellow-400">Gestión de Cuenta</span></li>
                <li>Entrá a <span className="text-yellow-400">Administración de Cuenta</span></li>
                <li>Escribí tu alias para confirmar y tocá <span className="text-red-400">Eliminar mi cuenta</span></li>
              </ol>
            </div>

            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <p className="font-semibold text-white mb-2">Opción 2 — Por correo electrónico</p>
              <p className="text-slate-400">
                Enviá un email a{' '}
                <a href="mailto:alexgf08@gmail.com" className="text-yellow-400 hover:underline">alexgf08@gmail.com</a>
                {' '}con el asunto <span className="text-white font-mono">"Eliminar cuenta Dacopas"</span> e indicá el alias o correo de tu cuenta.
                Procesaremos tu solicitud dentro de los 30 días hábiles.
              </p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-3">¿Qué datos se eliminan?</h2>
          <div className="overflow-hidden rounded-xl border border-slate-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800">
                  <th className="px-4 py-3 text-left text-slate-300 font-semibold">Tipo de dato</th>
                  <th className="px-4 py-3 text-left text-slate-300 font-semibold">Acción</th>
                  <th className="px-4 py-3 text-left text-slate-300 font-semibold">Plazo</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Perfil y credenciales', 'Eliminación permanente', 'Inmediato'],
                  ['Pronósticos', 'Eliminación permanente', 'Inmediato'],
                  ['Mensajes de chat', 'Eliminación permanente', 'Inmediato'],
                  ['Participación en torneos', 'Eliminación permanente', 'Inmediato'],
                  ['Relaciones de amistad', 'Eliminación permanente', 'Inmediato'],
                  ['Token de notificaciones', 'Eliminación permanente', 'Inmediato'],
                  ['Registros de actividad (logs)', 'Se conservan anonimizados', 'Hasta 90 días'],
                ].map(([dato, accion, plazo], i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-slate-900' : 'bg-slate-800/50'}>
                    <td className="px-4 py-3 text-slate-300">{dato}</td>
                    <td className="px-4 py-3 text-slate-400">{accion}</td>
                    <td className={`px-4 py-3 font-medium ${plazo === 'Inmediato' ? 'text-green-400' : 'text-yellow-400'}`}>{plazo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Nota sobre torneos compartidos</h2>
          <p className="text-slate-400">
            Los mensajes de chat y pronósticos que compartiste en torneos con otros usuarios serán eliminados de nuestra base de datos. Los demás participantes del torneo ya no podrán ver tu actividad.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Contacto</h2>
          <p className="text-slate-400">
            Para cualquier consulta sobre privacidad o seguridad de tus datos:{' '}
            <a href="mailto:alexgf08@gmail.com" className="text-yellow-400 hover:underline">alexgf08@gmail.com</a>
          </p>
        </div>

      </section>
    </div>
  )
}
