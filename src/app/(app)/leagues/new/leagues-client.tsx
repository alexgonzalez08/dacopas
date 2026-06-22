'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createLeague, joinLeague, leaveLeague } from '@/lib/leagues'
import { Trophy, Copy, Check, ChevronRight, LogOut, X, Loader2, Plus, Hash, ImageIcon } from 'lucide-react'
import Link from 'next/link'
import { sendPushNotification } from '@/lib/push'
import LeaguesInfoModal from '@/components/leagues-info-modal'

type League = { id: string; name: string; code: string; role: string; image_url?: string | null }

export default function LeaguesClient({
  leagues: initial,
  userId,
  leaguesInfoSeen,
  chatUnread: initialChatUnread = {},
  leagueNotifs = {},
}: {
  leagues: League[]
  userId: string
  leaguesInfoSeen: boolean
  chatUnread?: Record<string, number>
  leagueNotifs?: Record<string, number>
}) {
  const router = useRouter()

  const [leagues, setLeagues] = useState<League[]>(initial)
  const [chatUnread, setChatUnread] = useState<Record<string, number>>(initialChatUnread)
  const [leagueNotifsState, setLeagueNotifsState] = useState<Record<string, number>>(leagueNotifs)
  const [modal, setModal] = useState<'create' | 'join' | null>(null)
  const [visibleCount, setVisibleCount] = useState(10)

  const leagueIds = leagues.map(l => l.id)

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    function refreshUnread() {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(async () => {
        const res = await fetch('/api/leagues/chat/unread')
        if (res.ok) {
          const { counts } = await res.json()
          setChatUnread(counts ?? {})
        }
      }, 2000)
    }
    async function refreshNotifs() {
      const supabase = createClient()
      const { data: notifs } = await supabase
        .from('notifications')
        .select('metadata')
        .eq('user_id', userId)
        .eq('type', 'join_request')
        .is('read_at', null)
      const counts: Record<string, number> = {}
      for (const n of notifs ?? []) {
        const lid = n.metadata?.league_id
        if (lid && leagueIds.includes(lid)) counts[lid] = (counts[lid] ?? 0) + 1
      }
      setLeagueNotifsState(counts)
    }
    const supabase = createClient()
    const chatChannel = supabase
      .channel('leagues-chat-unread')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'league_chat_messages' }, refreshUnread)
      .subscribe()
    const notifChannel = supabase
      .channel('leagues-notifs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, refreshNotifs)
      .subscribe()
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      supabase.removeChannel(chatChannel)
      supabase.removeChannel(notifChannel)
    }
  }, [])

  // Crear torneo
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const imageRef = useRef<HTMLInputElement>(null)

  // Unirse
  const [code, setCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')

  // Abandonar
  const [confirmLeave, setConfirmLeave] = useState<string | null>(null)
  const [leaving, setLeaving] = useState<string | null>(null)
  const [leftMessage, setLeftMessage] = useState<string | null>(null)
  const [leaveError, setLeaveError] = useState<string | null>(null)

  function closeModal() {
    setModal(null)
    setName(''); setDescription(''); setImageFile(null); setImagePreview(null); setCreateError('')
    setCode(''); setJoinError('')
  }

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true); setCreateError('')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      let imageUrl: string | undefined
      if (imageFile) {
        const ext = imageFile.name.split('.').pop()
        const path = `${user!.id}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('league-images')
          .upload(path, imageFile, { upsert: true })
        if (uploadError) {
          throw new Error(`Error al subir imagen: ${uploadError.message}`)
        }
        const { data: { publicUrl } } = supabase.storage.from('league-images').getPublicUrl(path)
        imageUrl = publicUrl
      }

      const league = await createLeague(name, user!.id, imageUrl, description || undefined)

      // Feed event: anunciar creación del torneo
      await supabase.from('feed_events').insert({
        user_id: user!.id,
        type: 'league_create',
        league_id: league.id,
      })

      // Notificar a todos los amigos con botón "Solicitar unirse"
      const { data: friendships } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`)

      const { data: profile } = await supabase
        .from('profiles').select('username').eq('id', user!.id).single()

      const friendIds = (friendships ?? []).map(f =>
        f.requester_id === user!.id ? f.addressee_id : f.requester_id
      )


      closeModal()
      router.push(`/leagues/${league.id}`)
    } catch (err: any) {
      setCreateError(err.message)
    } finally {
      setCreating(false)
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setJoining(true); setJoinError('')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const league = await joinLeague(code, user!.id)
      closeModal()
      router.push(`/leagues/${league.id}`)
    } catch (err: any) {
      setJoinError(err.message)
    } finally {
      setJoining(false)
    }
  }

  async function handleLeave(league: League) {
    setLeaving(league.id)
    setLeaveError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      await leaveLeague(league.id, user!.id)

      const { data: admins } = await supabase
        .from('league_members')
        .select('user_id')
        .eq('league_id', league.id)
        .eq('role', 'admin')
        .is('left_at', null)

      const { data: profile } = await supabase
        .from('profiles').select('username').eq('id', user!.id).single()

      await Promise.all((admins ?? []).map(a =>
        supabase.from('notifications').insert({
          user_id: a.user_id, from_user_id: user!.id, type: 'member_left',
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
    } catch (err: any) {
      setLeaveError(err?.message ?? 'Error al abandonar el torneo')
    } finally {
      setLeaving(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Encabezado con botones */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Mis torneos</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setModal('join')}
            className="flex items-center gap-1.5 text-sm px-3 py-2 bg-slate-800 text-slate-300 font-semibold rounded-xl hover:bg-slate-700 border border-slate-700 transition"
          >
            <Hash className="w-4 h-4" /> Unirse
          </button>
          <button
            onClick={() => setModal('create')}
            className="flex items-center gap-1.5 text-sm px-3 py-2 bg-yellow-500 text-slate-900 font-semibold rounded-xl hover:bg-yellow-400 transition"
          >
            <Plus className="w-4 h-4" /> Crear
          </button>
        </div>
      </div>

      {/* Modal informativo de torneos */}
      <LeaguesInfoModal userId={userId} autoOpen={!leaguesInfoSeen} />

      {/* Lista de torneos */}
      {leftMessage && (
        <div className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 text-sm text-green-400">
          <span>{leftMessage}</span>
          <button onClick={() => setLeftMessage(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {leagues.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No estás en ningún torneo todavía.</p>
          <p className="text-xs mt-1">Creá uno o uníte con un código.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {leagues.slice(0, visibleCount).map(league => {
            const totalNotifs = (chatUnread[league.id] ?? 0) + (leagueNotifsState[league.id] ?? 0)
            return (
              <div key={league.id}>
                <div className="flex items-center bg-slate-800 rounded-xl overflow-hidden">
                  {league.image_url && (
                    <img src={league.image_url} alt={league.name} className="w-12 h-12 object-cover shrink-0" />
                  )}
                  <Link
                    href={`/leagues/${league.id}`}
                    className="flex-1 flex items-center justify-between px-4 py-3 hover:bg-slate-700 transition min-w-0"
                  >
                    <span className="font-medium truncate">{league.name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      {totalNotifs > 0 && (
                        <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                          {totalNotifs > 9 ? '9+' : totalNotifs}
                        </span>
                      )}
                      <span className="text-xs font-mono text-slate-400">{league.code}</span>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </div>
                  </Link>
                </div>
              </div>
            )
          })}
          {leagues.length > visibleCount && (
            <button
              onClick={() => setVisibleCount(c => c + 10)}
              className="w-full py-2.5 text-sm text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
            >
              Ver más ({leagues.length - visibleCount} restantes)
            </button>
          )}
        </div>
      )}

      {/* Modal: Crear torneo */}
      {modal === 'create' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm" onClick={closeModal}>
          <div className="w-full max-w-sm bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <h2 className="font-bold text-white flex items-center gap-2"><Trophy className="w-4 h-4 text-yellow-400" /> Crear torneo</h2>
              <button onClick={closeModal} className="text-slate-500 hover:text-white transition"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleCreate} className="p-4 space-y-4">
              {/* Imagen opcional */}
              <div
                onClick={() => imageRef.current?.click()}
                className="relative w-full h-32 rounded-xl border-2 border-dashed border-slate-700 hover:border-yellow-500/50 transition cursor-pointer overflow-hidden flex items-center justify-center bg-slate-800"
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-slate-500">
                    <ImageIcon className="w-6 h-6" />
                    <span className="text-xs">Imagen del torneo (opcional)</span>
                  </div>
                )}
              </div>
              <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />

              <div>
                <label className="block text-sm text-slate-400 mb-1">Nombre del torneo</label>
                <input
                  type="text" value={name} onChange={e => setName(e.target.value)} required autoFocus
                  placeholder="Ej: Los Pibes del Trabajo"
                  className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:outline-none focus:border-yellow-500"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Descripción <span className="text-slate-600 text-xs">(opcional)</span>
                </label>
                <textarea
                  value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="¿De qué trata este torneo? Contale a tus amigos..."
                  rows={3} maxLength={300}
                  className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:outline-none focus:border-yellow-500 resize-none text-sm"
                />
              </div>

              {createError && <p className="text-red-400 text-sm">{createError}</p>}

              <button type="submit" disabled={creating}
                className="w-full py-3 bg-yellow-500 text-slate-900 font-semibold rounded-lg hover:bg-yellow-400 disabled:opacity-50 transition flex items-center justify-center gap-2">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
                {creating ? 'Creando...' : 'Crear torneo'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Unirse a torneo */}
      {modal === 'join' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm" onClick={closeModal}>
          <div className="w-full max-w-sm bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <h2 className="font-bold text-white flex items-center gap-2"><Hash className="w-4 h-4 text-yellow-400" /> Unirse a torneo</h2>
              <button onClick={closeModal} className="text-slate-500 hover:text-white transition"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleJoin} className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Código del torneo</label>
                <input
                  type="text" value={code} onChange={e => setCode(e.target.value.toUpperCase())} required autoFocus
                  placeholder="Ej: AB3XYZ" maxLength={6}
                  className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:outline-none focus:border-yellow-500 uppercase tracking-widest text-xl font-bold text-center"
                />
              </div>
              {joinError && <p className="text-red-400 text-sm">{joinError}</p>}
              <button type="submit" disabled={joining}
                className="w-full py-3 bg-yellow-500 text-slate-900 font-semibold rounded-lg hover:bg-yellow-400 disabled:opacity-50 transition flex items-center justify-center gap-2">
                {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Hash className="w-4 h-4" />}
                {joining ? 'Uniéndose...' : 'Unirse al torneo'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
