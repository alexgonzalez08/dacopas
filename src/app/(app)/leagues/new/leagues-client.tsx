'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createLeague, joinLeague } from '@/lib/leagues'
import { Trophy, Copy, Check, ChevronRight } from 'lucide-react'
import Link from 'next/link'

type League = { id: string; name: string; code: string }

export default function LeaguesClient({ leagues }: { leagues: League[] }) {
  const router = useRouter()
  const params = useSearchParams()
  const [tab, setTab] = useState<'create' | 'join'>(params.get('join') ? 'join' : 'create')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [created, setCreated] = useState<{ name: string; code: string } | null>(null)
  const [copied, setCopied] = useState(false)

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
        <h2 className="text-xl font-bold">¡Liga creada!</h2>
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
            <button
              key={t}
              onClick={() => { setTab(t); setError('') }}
              className={`flex-1 py-2.5 text-sm font-semibold transition ${tab === t ? 'bg-yellow-500 text-slate-900' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
            >
              {t === 'create' ? 'Crear liga' : 'Unirse a liga'}
            </button>
          ))}
        </div>

        {tab === 'create' ? (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Nombre de la liga</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                placeholder="Ej: Los Pibes del Trabajo"
                className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:outline-none focus:border-yellow-500"
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={loading} className="w-full py-3 bg-yellow-500 text-slate-900 font-semibold rounded-lg hover:bg-yellow-400 disabled:opacity-50 transition">
              {loading ? 'Creando...' : 'Crear liga'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Código de la liga</label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                required
                placeholder="Ej: AB3XYZ"
                maxLength={6}
                className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:outline-none focus:border-yellow-500 uppercase tracking-widest text-lg font-bold"
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={loading} className="w-full py-3 bg-yellow-500 text-slate-900 font-semibold rounded-lg hover:bg-yellow-400 disabled:opacity-50 transition">
              {loading ? 'Uniéndose...' : 'Unirse'}
            </button>
          </form>
        )}
      </div>

      {leagues.length > 0 && (
        <div>
          <h2 className="font-semibold text-slate-300 mb-3">Mis ligas</h2>
          <div className="space-y-2">
            {leagues.map(league => (
              <Link
                key={league.id}
                href={`/leagues/${league.id}`}
                className="flex items-center justify-between bg-slate-800 rounded-xl px-4 py-3 hover:bg-slate-700 transition"
              >
                <span className="font-medium">{league.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-400">{league.code}</span>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
