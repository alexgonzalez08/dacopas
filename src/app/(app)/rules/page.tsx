import Link from 'next/link'
import { BookOpen, Target, CheckCircle, Clock, Globe, Trophy } from 'lucide-react'
import ChampionScoringTable from '@/components/champion-scoring-table'

export default function RulesPage() {
  return (
    <div className="max-w-lg mx-auto space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-yellow-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Reglas del juego</h1>
          <p className="text-sm text-slate-400">Mundial 2026 · Dacopas</p>
        </div>
      </div>

      {/* Sistema de puntos */}
      <div className="bg-slate-800 rounded-2xl p-5 space-y-4">
        <h2 className="font-semibold text-white flex items-center gap-2">
          <Target className="w-4 h-4 text-yellow-400" /> Sistema de puntos
        </h2>

        <div className="space-y-3">
          <div className="flex items-start gap-3 bg-slate-700/50 rounded-xl p-3">
            <span className="text-xl">🎯</span>
            <div>
              <p className="text-sm font-semibold text-white">Marcador exacto → <span className="text-yellow-400">3 puntos</span></p>
              <p className="text-xs text-slate-400 mt-0.5">Predecís el marcador exacto del partido.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-slate-700/50 rounded-xl p-3">
            <span className="text-xl">✅</span>
            <div>
              <p className="text-sm font-semibold text-white">Ganador correcto → <span className="text-yellow-400">1 punto</span></p>
              <p className="text-xs text-slate-400 mt-0.5">Acertás quién gana o que hay empate, pero no el marcador exacto.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-slate-700/50 rounded-xl p-3">
            <span className="text-xl">❌</span>
            <div>
              <p className="text-sm font-semibold text-white">Pronóstico incorrecto → <span className="text-slate-400">0 puntos</span></p>
              <p className="text-xs text-slate-400 mt-0.5">No acertás el resultado ni el ganador.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Penales — eliminatorias */}
      <div className="bg-slate-800 rounded-2xl p-5 space-y-4">
        <h2 className="font-semibold text-white flex items-center gap-2">
          <span className="text-yellow-400">🥅</span> Penales en eliminatorias
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          A partir de la Ronda de 32, los partidos que terminen empatados van a penales. Si predecís empate, debés elegir además quién gana la tanda.
        </p>
        <div className="space-y-3">
          <div className="flex items-start gap-3 bg-slate-700/50 rounded-xl p-3">
            <span className="text-xl">⭐</span>
            <div>
              <p className="text-sm font-semibold text-white">Marcador exacto + penales correctos → <span className="text-purple-400">5 puntos</span></p>
              <p className="text-xs text-slate-400 mt-0.5">Acertás el empate exacto Y quién gana en penales.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-slate-700/50 rounded-xl p-3">
            <span className="text-xl">🎯</span>
            <div>
              <p className="text-sm font-semibold text-white">Marcador exacto + penales incorrectos → <span className="text-yellow-400">3 puntos</span></p>
              <p className="text-xs text-slate-400 mt-0.5">Acertás el empate exacto pero no el ganador en penales.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-slate-700/50 rounded-xl p-3">
            <span className="text-xl">✅</span>
            <div>
              <p className="text-sm font-semibold text-white">Solo penales correctos → <span className="text-yellow-400">3 puntos</span></p>
              <p className="text-xs text-slate-400 mt-0.5">No acertás el marcador exacto pero sí quién gana en penales.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Predicción Campeón */}
      <div className="bg-slate-800 rounded-2xl p-5 space-y-4">
        <h2 className="font-semibold text-white flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-400" /> Predicción Campeón del Mundial
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Además de los partidos, podés predecir quién sale campeón, el otro finalista y el marcador de la final — antes de que se definan los semifinalistas. Se bloquea 15 minutos antes de la primera semifinal.
        </p>
        <ChampionScoringTable />
      </div>

      {/* Predicción Campeón — ligas todos contra todos */}
      <div className="bg-slate-800 rounded-2xl p-5 space-y-4">
        <h2 className="font-semibold text-white flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-400" /> Predicción Campeón — Ligas (Premier League, La Liga, Serie A)
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          En torneos de ligas todos-contra-todos solo se elige el equipo campeón (no hay finalista ni marcador que predecir). Si el admin del torneo la activó, se bloquea a mitad de temporada y se liquida cuando termina la última fecha.
        </p>
        <ChampionScoringTable variant="round_robin" />
      </div>

      {/* Puntos globales */}
      <div className="bg-slate-800 rounded-2xl p-5">
        <h2 className="font-semibold text-white flex items-center gap-2 mb-3">
          <Globe className="w-4 h-4 text-yellow-400" /> Puntos globales
        </h2>
        <p className="text-sm text-slate-300 leading-relaxed">
          Los puntos que ganás con cada pronóstico se aplican <span className="text-white font-semibold">automáticamente en todos los torneos</span> en los que participás. No tenés que hacer nada extra — tu tabla de posiciones se actualiza sola al finalizar cada partido.
        </p>
      </div>

      {/* Bloqueo de pronósticos */}
      <div className="bg-slate-800 rounded-2xl p-5">
        <h2 className="font-semibold text-white flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-yellow-400" /> Bloqueo de pronósticos
        </h2>
        <p className="text-sm text-slate-300 leading-relaxed">
          Los pronósticos se <span className="text-white font-semibold">bloquean automáticamente 15 minutos antes</span> del inicio de cada partido. Una vez bloqueado, no podés modificar tu predicción. ¡No te quedes sin registrar tu resultado!
        </p>
      </div>

      {/* Notificaciones */}
      <div className="bg-slate-800 rounded-2xl p-5">
        <h2 className="font-semibold text-white flex items-center gap-2 mb-3">
          <CheckCircle className="w-4 h-4 text-yellow-400" /> Notificaciones
        </h2>
        <p className="text-sm text-slate-300 leading-relaxed">
          Dacopas te avisa <span className="text-white font-semibold">1 hora antes</span> y <span className="text-white font-semibold">15 minutos antes</span> de cada partido para que no pierdas la oportunidad de registrar tu pronóstico. Al finalizar el partido, recibís una notificación con el resultado y tus puntos actualizados.
        </p>
      </div>

      <div className="text-center">
        <Link href="/predictions" className="inline-flex items-center gap-2 bg-yellow-500 text-slate-900 font-bold px-6 py-3 rounded-xl hover:bg-yellow-400 transition text-sm">
          Ir a mis pronósticos →
        </Link>
      </div>
    </div>
  )
}
