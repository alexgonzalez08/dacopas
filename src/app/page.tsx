import Link from 'next/link'
import { Trophy, Users, Newspaper, MessageCircle, ChevronRight } from 'lucide-react'

const FEATURES = [
  {
    icon: Users,
    title: 'Tu círculo futbolero',
    desc: 'Conectá con amistades, familiares y compañeros de trabajo que comparten tu pasión. Seguí a quien más sabe y armá tu comunidad.',
  },
  {
    icon: Newspaper,
    title: 'Posteá lo que sabés',
    desc: 'Compartí noticias, opiniones y datos del fútbol mundial. Tu conocimiento tiene valor acá.',
  },
  {
    icon: Trophy,
    title: 'Predicciones en juego',
    desc: 'Predecí los resultados de tus competencias futboleras favoritas y medí tu ojo contra el de tus amigos en tiempo real.',
  },
  {
    icon: MessageCircle,
    title: 'Debate con pasión',
    desc: 'Discutí cada partido, cada convocatoria y cada polémica con gente que le pone la misma intensidad que vos.',
  },
]

const STEPS = [
  { step: '1', title: 'Creá tu perfil', desc: 'Registrate gratis y mostrá de qué cuadro sos.' },
  { step: '2', title: 'Sumá amigos', desc: 'Conectá con amigos y con fanáticos como vos.' },
  { step: '3', title: 'Viví el fútbol', desc: 'Posteá, debatí, predecí y competí.' },
]

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-white">

      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Dacopas" className="w-8 h-8 object-contain" />
          <span className="font-bold text-lg tracking-tight">Dacopas</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-slate-400 hover:text-white transition">
            Iniciar sesión
          </Link>
          <Link
            href="/register"
            className="text-sm px-4 py-2 bg-yellow-500 text-slate-900 font-semibold rounded-lg hover:bg-yellow-400 transition"
          >
            Crear cuenta
          </Link>
        </div>
      </header>

      <main className="flex-1">

        {/* Hero */}
        <section className="flex flex-col items-center text-center px-6 pt-20 pb-16 max-w-2xl mx-auto">
          <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-yellow-500/20 mb-6">
            <img src="/logo.png" alt="Dacopas" className="w-14 h-14 object-contain" />
          </div>
          <h1 className="text-5xl font-extrabold mb-4 leading-tight">
            La app social para<br />
            <span className="text-yellow-400">amantes del fútbol</span>
          </h1>
          <p className="text-lg text-slate-400 mb-8 max-w-md">
            Conectá con amigos, posteá tu conocimiento futbolero y viví tus competencias favoritas como nunca antes — todo en un solo lugar.
          </p>
          <div className="flex gap-4 flex-wrap justify-center">
            <Link
              href="/register"
              className="flex items-center gap-2 px-6 py-3 bg-yellow-500 text-slate-900 font-bold rounded-xl hover:bg-yellow-400 transition text-base"
            >
              Unirme gratis <ChevronRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="px-6 py-3 bg-slate-700 text-white font-semibold rounded-xl hover:bg-slate-600 transition text-base"
            >
              Ya tengo cuenta
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="px-6 py-16 bg-slate-800/40">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-2">Hecho para los que viven el fútbol</h2>
            <p className="text-slate-400 text-center mb-10">No importa si sos táctico, estadístico o simplemente hincha apasionado — acá hay lugar para todos.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {FEATURES.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex gap-4 bg-slate-800 rounded-2xl p-5">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-6 py-16 bg-yellow-500/10 border-y border-yellow-500/20">
          <div className="max-w-xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-3">El Mundial se disfruta más en grupo</h2>
            <p className="text-slate-400 mb-6">Sumate a la comunidad futbolera más apasionada. Es gratis.</p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-yellow-500 text-slate-900 font-bold rounded-xl hover:bg-yellow-400 transition text-base"
            >
              Crear mi cuenta <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 px-6 py-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500">
          <span>© 2026 Dacopas</span>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-slate-300 transition">Privacidad</Link>
            <Link href="/security" className="hover:text-slate-300 transition">Seguridad y Datos</Link>
            <Link href="/support" className="hover:text-slate-300 transition">Soporte</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
