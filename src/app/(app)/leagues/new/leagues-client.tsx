'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createLeague, joinLeague, leaveLeague } from '@/lib/leagues'
import { Trophy, Copy, Check, ChevronRight, LogOut, X, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { sendPushNotification } from '@/lib/push'

type League = { id: string; name: string; code: string; role: string }

export default function LeaguesClient({ leagues: initial }: { leagues: League[] }) {
  const router = useRouter()
  const params = useSearchParams()
  const [tab, setTab] = useState<'create' | 'join'>(params.get('join') ? 'join' : 'create')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [created, setCreated] = useState<{ name: string; code: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const [leagues, setLeagues] = useState<League[]>(initial)
  const [confirmLeave, setConfirmLeave] = useState<string | null>(null)
  const [leaving, setLeaving] = useState<string | null>(null)
  const [leftMessage, setLeftMessage] = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const league = await createLeague(name, user!.id)
      setCreated({ name: league.name, code: league.code })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const league = await joinLeague(code, user!.id)
      router.push(`/leagues/${league.id}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleLeave(league: League) {
    setLeaving(league.id)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      await leaveLeague(league.id, user!.id)

      // Notificar a los admins
      const { data: admins } = await supabase
        .from('league_members')
        .select('user_id')
        .eq('league_id', league.id)
        .eq('role', 'admin')
        .is('left_at', null)

      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user!.id)
        .single()

      await Promise.all((admins ?? []).map(a =>
        supabase.from('notifications').insert({
          user_id: a.user_id,
          from_user_id: user!.id,
          type: 'member_left',
          metadata: { league_id: league.id, league_name: league.name, username: profile?.username ?? '' },
        })
      ))
      ;(admins ?? []).forEach(a => sendPushNotification({
        toUserId: a.user_id,
        title: 'Un participante abandonó el torneo',
        body: `@${profile?.username ?? 'Alguien'} abandonó el torneo "${league.name}"`,
      }))

      setLeagues(prev => prev.filter(l => l.id !== league.id))
      setConfirmLeave(null)
      setLeftMessage(`Abandonaste el torneo "${league.name}"`)
    } catch {
      // silently fail
    } finally {
      setLeaving(null)
    }
  }

  function copyCode() {
    if (!created) return
    navigator.clipboard.writeText(created.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (created) {
    return (
      <div className="max-w-sm mx-auto text-center space-y-4 mt-8">
        <Trophy className="w-12 h-12 text-yellow-400 mx-auto" />
        <h2 className="text-xl font-bold">¡Torneo creado!</h2>
        <p className="text-slate-400">Compartí este código con tus amigos:</p>
        <div className="flex items-center gap-3 bg-slate-800 rounded-xl px-4 py-3">
          <span className="text-3xl font-bold tracking-widest text-yellow-400 flex-1">{created.code}</span>
          <button onClick={copyCode} className="text-slate-400 hover:text-white">
            {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
          </button>
        </div>
        <button onClick={() => router.push('/dashboard')} className="w-full py-3 bg-yellow-500 text-slate-900 font-semibold rounded-lg hover:bg-yellow-400 transition">
          Ir al dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="max-w-sm mx-auto space-y-6">
        <div className="flex rounded-xl overflow-hidden border border-slate-700">
          {(['create', 'join'] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setError('') }}
              className={`flex-1 py-2.5 text-sm font-semibold transition ${tab === t ? 'bg-yellow-500 text-slate-900' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
              {t === 'create' ? 'Crear torneo' : 'Unirse a torneo'}
            </button>
          ))}
        </div>

        {tab === 'create' ? (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Nombre del torneo</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required
                placeholder="Ej: Los Pibes del Trabajo"
                className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:outline-none focus:border-yellow-500" />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-yellow-500 text-slate-900 font-semibold rounded-lg hover:bg-yellow-400 disabled:opacity-50 transition">
              {loading ? 'Creando...' : 'Crear torneo'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Código del torneo</label>
              <input type="text" value={code} onChange={e => setCode(e.target.value.toUpperCase())} required
                placeholder="Ej: AB3XYZ" maxLength={6}
                className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:outline-none focus:border-yellow-500 uppercase tracking-widest text-lg font-bold" />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-yellow-500 text-slate-900 font-semibold rounded-lg hover:bg-yellow-400 disabled:opacity-50 transition">
              {loading ? 'Uniéndose...' : 'Unirse'}
            </button>
          </form>
        )}
      </div>

      {leagues.length > 0 && (
        <div>
          <h2 className="font-semibold text-slate-300 mb-3">Mis torneos</h2>

          {leftMessage && (
            <div className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 mb-3 text-sm text-green-400">
              <span>{leftMessage}</span>
              <button onClick={() => setLeftMessage(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="space-y-2">
            {leagues.map(league => (
              <div key={league.id}>
                <div className="flex items-center bg-slate-800 rounded-xl overflow-hidden">
                  <Link href={`/leagues/${league.id}`}
                    className="flex-1 flex items-center justify-between px-4 py-3 hover:bg-slate-700 transition">
                    <span className="font-medium">{league.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-400">{league.code}</span>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </div>
                  </Link>
                  {league.role !== 'admin' && (
                    <button
                      onClick={() => setConfirmLeave(league.id)}
                      className="px-3 py-3 text-slate-600 hover:text-red-400 hover:bg-slate-700 transition border-l border-slate-700"
                      title="Abandonar torneo"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Modal de confirmación inline */}
                {confirmLeave === league.id && (
                  <div className="mt-1 bg-slate-800 border border-red-500/30 rounded-xl px-4 py-3 space-y-3">
                    <p className="text-sm text-slate-300">
                      ¿Seguro que querés abandonar <span className="font-semibold text-white">"{league.name}"</span>?
                      <span className="block text-xs text-slate-500 mt-1">No seguirás acumulando puntos en este torneo.</span>
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleLeave(league)}
                        disabled={leaving === league.id}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-400 disabled:opacity-50 transition"
                      >
                        {leaving === league.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <LogOut className="w-3.5 h-3.5" />}
                        Sí, abandonar
                      </button>
                      <button
                        onClick={() => setConfirmLeave(null)}
                        className="text-xs px-3 py-1.5 bg-slate-700 text-slate-300 font-semibold rounded-lg hover:bg-slate-600 transition"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
