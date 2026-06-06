import Link from 'next/link'
import { Users, ChevronRight } from 'lucide-react'

export default function WelcomeCard({ username }: { username: string }) {
  return (
    <div className="bg-gradient-to-br from-yellow-500/20 via-slate-800 to-slate-800 rounded-2xl overflow-hidden border border-yellow-500/20">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0 text-xl">
          ⚽
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Dacopas</p>
          <p className="text-xs text-yellow-400">Bienvenido/a 🎉</p>
        </div>
      </div>

      {/* Cuerpo */}
      <div className="px-4 pb-4">
        <h2 className="text-lg font-bold text-white mb-2">
          ¡Hola, {username}! 👋
        </h2>
        <p className="text-sm text-slate-300 leading-relaxed mb-4">
          Bienvenido/a a <span className="text-yellow-400 font-semibold">Dacopas</span> — ya estamos listos para divertirnos prediciendo los resultados del Mundial 2026 con tus amigos.
        </p>

        <div className="bg-slate-700/50 rounded-xl p-4 mb-4 space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-lg shrink-0">🏆</span>
            <p className="text-sm text-slate-300">Creá una liga y compartí el código con tus amigos para competir juntos.</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg shrink-0">🎯</span>
            <p className="text-sm text-slate-300">Predecí el resultado exacto de cada partido y sumá 3 puntos. Acertá el ganador y sumá 1.</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg shrink-0">⏰</span>
            <p className="text-sm text-slate-300">Tus predicciones se bloquean 15 minutos antes del inicio de cada partido. ¡No te quedes afuera!</p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <Link
        href="/leagues/new"
        className="flex items-center justify-between px-4 py-3 border-t border-yellow-500/20 bg-yellow-500/10 hover:bg-yellow-500/20 transition"
      >
        <span className="text-sm font-semibold text-yellow-400 flex items-center gap-2">
          <Users className="w-4 h-4" />
          Crear mi primera liga
        </span>
        <ChevronRight className="w-4 h-4 text-yellow-400" />
      </Link>
    </div>
  )
}
