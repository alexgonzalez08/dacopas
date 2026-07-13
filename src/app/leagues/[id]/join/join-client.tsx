'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Trophy, Users, Medal, Loader2, X, ShieldCheck, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

type League = { id: string; name: string; description: string | null; image_url: string | null; code: string; competition_name: string | null; is_public?: boolean }
type Member = { user_id: string; username: string; avatar_url: string | null }
type Top3 = Member & { points: number }

const MEDAL_COLORS = ['text-yellow-400', 'text-slate-300', 'text-amber-600']

function RequestSentModal({ leagueName, onClose }: { leagueName: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <ShieldCheck className="w-7 h-7 text-yellow-400" />
          </div>
          <h2 className="text-lg font-bold">¡Solicitud enviada!</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Por la seguridad de nuestros usuarios, tu solicitud para unirte a <span className="text-white font-semibold">"{leagueName}"</span> debe ser aprobada por los administradores del torneo.
          </p>
          <p className="text-slate-500 text-xs">
            Te notificaremos cuando tu solicitud sea aprobada o declinada.
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold rounded-xl transition"
        >
          Entendido
        </button>
      </div>
    </div>
  )
}

export default function JoinClient({
  league,
  members,
  top3,
  isLoggedIn,
  userId,
  isNewUser,
  hasPendingRequest,
  ended,
}: {
  league: League
  members: Member[]
  top3: Top3[]
  isLoggedIn: boolean
  userId: string | null
  isNewUser?: boolean
  hasPendingRequest?: boolean
  ended?: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)

  // Si el usuario está logueado y no tiene solicitud pendiente, enviar automáticamente
  useEffect(() => {
    if (isLoggedIn && !hasPendingRequest && !ended) {
      handleJoin()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleJoin() {
    if (ended) return
    if (!isLoggedIn) {
      router.push(`/register?next=/leagues/${league.id}/join`)
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/leagues/join-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId: league.id, leagueName: league.name }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Error al enviar la solicitud')
        setLoading(false)
        return
      }
      if (data.joined) {
        router.push(`/leagues/${league.id}`)
        return
      }
      setShowModal(true)
    } catch {
      setError('Error al enviar la solicitud')
    } finally {
      setLoading(false)
    }
  }

  function handleModalClose() {
    setShowModal(false)
    router.push('/dashboard')
  }

  return (
    <>
      {showModal && (
        <RequestSentModal leagueName={league.name} onClose={handleModalClose} />
      )}

      <main className="min-h-screen bg-slate-950 text-white px-4 py-8">
        <div className="max-w-md mx-auto space-y-6">

          {/* Logo */}
          <div className="flex items-center gap-2 justify-center">
            <Trophy className="w-6 h-6 text-yellow-400" />
            <span className="font-bold text-yellow-400 text-lg">Dacopas</span>
          </div>

          {/* Imagen del torneo */}
          {league.image_url && (
            <div className="w-full h-44 rounded-2xl overflow-hidden">
              <img src={league.image_url} alt={league.name} className="w-full h-full object-cover" />
            </div>
          )}

          {/* Info del torneo */}
          <div className="space-y-2">
            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 font-medium border border-yellow-500/20">
              🏆 {league.competition_name ?? 'FIFA World Cup'}
            </span>
            <h1 className="text-2xl font-bold">{league.name}</h1>
            {league.description && (
              <p className="text-slate-400 text-sm leading-relaxed">{league.description}</p>
            )}
            <p className="text-slate-500 text-sm flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> {members.length} {members.length === 1 ? 'participante' : 'participantes'}
            </p>
          </div>

          {/* Top 3 */}
          {top3.length > 0 && (
            <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
              <h2 className="text-sm font-semibold text-slate-300">Top posiciones</h2>
              {top3.map((entry, i) => (
                <div key={entry.user_id} className="flex items-center gap-3">
                  <span className={`w-6 text-center font-bold ${MEDAL_COLORS[i]}`}>
                    <Medal className="w-4 h-4 inline" />
                  </span>
                  <span className="flex-1 font-medium text-sm">{entry.username}</span>
                  <span className="text-yellow-400 font-bold text-sm">{entry.points} pts</span>
                </div>
              ))}
            </div>
          )}

          {/* Participantes */}
          {members.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {members.slice(0, 8).map(m => (
                <div key={m.user_id} className="flex items-center gap-1.5 bg-slate-800 rounded-full px-3 py-1">
                  <div className="w-5 h-5 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold text-slate-300">
                    {m.username[0].toUpperCase()}
                  </div>
                  <span className="text-xs text-slate-300">{m.username}</span>
                </div>
              ))}
              {members.length > 8 && (
                <div className="flex items-center bg-slate-800 rounded-full px-3 py-1">
                  <span className="text-xs text-slate-400">+{members.length - 8} más</span>
                </div>
              )}
            </div>
          )}

          {/* CTA */}
          <div className="space-y-3">
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            {ended ? (
              <div className="w-full py-3.5 bg-orange-500/10 border border-orange-500/30 text-orange-400 font-bold rounded-2xl flex items-center justify-center gap-2 text-center px-3">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                Este torneo ya finalizó y no admite nuevos participantes
              </div>
            ) : hasPendingRequest ? (
              <div className="w-full py-3.5 bg-slate-700 text-slate-300 font-bold rounded-2xl flex items-center justify-center gap-2">
                <ShieldCheck className="w-5 h-5 text-yellow-400" />
                Solicitud pendiente de aprobación
              </div>
            ) : (
              <button
                onClick={handleJoin}
                disabled={loading}
                className="w-full py-3.5 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold rounded-2xl transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : '⚡'}
                {isLoggedIn
                  ? (league.is_public ? 'Unirme al torneo' : 'Solicitar unirme al torneo')
                  : 'Crear cuenta y unirme'}
              </button>
            )}
            {isLoggedIn ? (
              <p className="text-center text-xs text-slate-500">
                <Link href="/dashboard" className="hover:text-slate-300 transition">Ir al inicio</Link>
              </p>
            ) : (
              <p className="text-center text-xs text-slate-500">
                ¿Ya tenés cuenta?{' '}
                <Link href={`/login?next=/leagues/${league.id}/join`} className="text-yellow-400 hover:text-yellow-300 transition">
                  Iniciá sesión
                </Link>
              </p>
            )}
          </div>

        </div>
      </main>
    </>
  )
}
