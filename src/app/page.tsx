import Link from 'next/link'


export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      <div className="mb-6 flex items-center justify-center w-20 h-20 rounded-full bg-yellow-500/20">
        <img src="/logo.png" alt="Dacopas" className="w-14 h-14 object-contain" />
      </div>
      <h1 className="text-4xl font-bold mb-2">Dacopas</h1>
      <p className="text-lg text-slate-400 mb-8">
        Compite con tus amigos prediciendo los resultados de cada partido
      </p>
      <div className="flex gap-4">
        <Link
          href="/register"
          className="px-6 py-3 bg-yellow-500 text-slate-900 font-semibold rounded-lg hover:bg-yellow-400 transition"
        >
          Crear cuenta
        </Link>
        <Link
          href="/login"
          className="px-6 py-3 bg-slate-700 text-white font-semibold rounded-lg hover:bg-slate-600 transition"
        >
          Iniciar sesión
        </Link>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-800 bg-slate-900/80 backdrop-blur-sm flex justify-center gap-6 py-3">
        <Link href="/privacy" className="text-xs text-slate-500 hover:text-slate-300 transition">
          Privacidad
        </Link>
        <Link href="/security" className="text-xs text-slate-500 hover:text-slate-300 transition">
          Seguridad y Datos
        </Link>
      </nav>
    </main>
  )
}
