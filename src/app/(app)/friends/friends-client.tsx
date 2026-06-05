'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import UserAvatar from '@/components/user-avatar'
import { UserPlus, UserCheck, UserX, Search, Clock, Users, Check, X, Loader2 } from 'lucide-react'
import Link from 'next/link'

type Profile = { id: string; username: string; full_name: string | null; avatar_url: string | null }
type Friendship = { id: string; requester?: Profile; addressee?: Profile; status: string }

export default function FriendsClient({
  userId,
  initialFriends,
  initialPending,
  initialRequests,
}: {
  userId: string
  initialFriends: Friendship[]
  initialPending: Friendship[]
  initialRequests: Friendship[]
}) {
  const [friends, setFriends] = useState(initialFriends)
  const [pending, setPending] = useState(initialPending)
  const [requests, setRequests] = useState(initialRequests)
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [searching, setSearching] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [tab, setTab] = useState<'friends' | 'requests'>('friends')

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!search.trim()) return
    setSearching(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .ilike('username', `%${search.trim()}%`)
      .neq('id', userId)
      .limit(10)
    setSearchResults(data ?? [])
    setSearching(false)
  }

  async function sendRequest(addresseeId: string) {
    setLoadingId(addresseeId)
    const supabase = createClient()
    const { data } = await supabase
      .from('friendships')
      .insert({ requester_id: userId, addressee_id: addresseeId, status: 'pending' })
      .select('*, addressee:addressee_id(id, username, full_name, avatar_url)')
      .single()
    if (data) {
      setPending(p => [...p, data])
      setSearchResults(r => r.filter(u => u.id !== addresseeId))
    }
    setLoadingId(null)
  }

  async function acceptRequest(friendshipId: string) {
    setLoadingId(friendshipId)
    const supabase = createClient()
    const { data } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId)
      .select('*, requester:requester_id(id, username, full_name, avatar_url), addressee:addressee_id(id, username, full_name, avatar_url)')
      .single()
    if (data) {
      setRequests(r => r.filter(f => f.id !== friendshipId))
      setFriends(f => [...f, data])
    }
    setLoadingId(null)
  }

  async function declineRequest(friendshipId: string) {
    setLoadingId(friendshipId)
    const supabase = createClient()
    await supabase.from('friendships').delete().eq('id', friendshipId)
    setRequests(r => r.filter(f => f.id !== friendshipId))
    setLoadingId(null)
  }

  async function removeFriend(friendshipId: string) {
    setLoadingId(friendshipId)
    const supabase = createClient()
    await supabase.from('friendships').delete().eq('id', friendshipId)
    setFriends(f => f.filter(fr => fr.id !== friendshipId))
    setLoadingId(null)
  }

  function getFriendProfile(f: Friendship): Profile | null {
    if (f.requester?.id === userId) return f.addressee ?? null
    return f.requester ?? null
  }

  function isAlreadyFriend(profileId: string) {
    return friends.some(f => f.requester?.id === profileId || f.addressee?.id === profileId)
  }

  function isPendingSent(profileId: string) {
    return pending.some(f => f.addressee?.id === profileId)
  }

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold">Seguidores</h1>

      {/* Buscar usuarios */}
      <div className="bg-slate-800 rounded-2xl p-4 space-y-4">
        <h2 className="font-semibold text-slate-300 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-yellow-400" /> Agregar seguidor
        </h2>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por alias..."
            className="flex-1 bg-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500 text-slate-200 placeholder-slate-500"
          />
          <button
            type="submit"
            disabled={searching}
            className="px-3 py-2 bg-yellow-500 text-slate-900 font-semibold rounded-xl hover:bg-yellow-400 disabled:opacity-50 transition"
          >
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </button>
        </form>

        {searchResults.length > 0 && (
          <div className="space-y-2">
            {searchResults.map(profile => (
              <div key={profile.id} className="flex items-center justify-between bg-slate-700/50 rounded-xl px-3 py-2.5">
                <Link href={`/profile/${profile.username}`}>
                  <UserAvatar
                    username={profile.username}
                    fullName={profile.full_name}
                    avatarUrl={profile.avatar_url}
                    size="md"
                    showName
                    showAlias
                  />
                </Link>
                {isAlreadyFriend(profile.id) ? (
                  <span className="flex items-center gap-1 text-xs text-green-400">
                    <UserCheck className="w-3.5 h-3.5" /> Siguiendo
                  </span>
                ) : isPendingSent(profile.id) ? (
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <Clock className="w-3.5 h-3.5" /> Pendiente
                  </span>
                ) : (
                  <button
                    onClick={() => sendRequest(profile.id)}
                    disabled={loadingId === profile.id}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 bg-yellow-500 text-slate-900 font-semibold rounded-lg hover:bg-yellow-400 disabled:opacity-50 transition"
                  >
                    {loadingId === profile.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <UserPlus className="w-3.5 h-3.5" />
                    }
                    Agregar
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl overflow-hidden border border-slate-700">
        {(['friends', 'requests'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-sm font-semibold transition flex items-center justify-center gap-2 ${tab === t ? 'bg-yellow-500 text-slate-900' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            {t === 'friends'
              ? <><Users className="w-4 h-4" /> Mis seguidores ({friends.length})</>
              : <><Clock className="w-4 h-4" /> Solicitudes {requests.length > 0 && <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{requests.length}</span>}</>
            }
          </button>
        ))}
      </div>

      {/* Lista de seguidores */}
      {tab === 'friends' && (
        <div className="space-y-2">
          {friends.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              <p className="text-3xl mb-2">👥</p>
              <p className="text-sm">Todavía no tenés seguidores. ¡Buscá por alias arriba!</p>
            </div>
          ) : (
            friends.map(f => {
              const profile = getFriendProfile(f)
              if (!profile) return null
              return (
                <div key={f.id} className="flex items-center justify-between bg-slate-800 rounded-xl px-4 py-3">
                  <Link href={`/profile/${profile.username}`}>
                    <UserAvatar
                      username={profile.username}
                      fullName={profile.full_name}
                      avatarUrl={profile.avatar_url}
                      size="md"
                      showName
                      showAlias
                      linkable={false}
                    />
                  </Link>
                  <button
                    onClick={() => removeFriend(f.id)}
                    disabled={loadingId === f.id}
                    className="text-slate-500 hover:text-red-400 transition p-1.5 rounded-lg hover:bg-slate-700"
                    title="Dejar de seguir"
                  >
                    {loadingId === f.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserX className="w-4 h-4" />}
                  </button>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Solicitudes recibidas */}
      {tab === 'requests' && (
        <div className="space-y-4">
          {/* Recibidas */}
          {requests.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Recibidas</p>
              {requests.map(f => (
                <div key={f.id} className="flex items-center justify-between bg-slate-800 rounded-xl px-4 py-3">
                  <Link href={`/profile/${f.requester?.username ?? ''}`}>
                    <UserAvatar
                      username={f.requester?.username ?? ''}
                      fullName={f.requester?.full_name}
                      avatarUrl={f.requester?.avatar_url}
                      size="md"
                      showName
                      showAlias
                      linkable={false}
                    />
                  </Link>
                  <div className="flex gap-2">
                    <button
                      onClick={() => acceptRequest(f.id)}
                      disabled={loadingId === f.id}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-400 disabled:opacity-50 transition"
                    >
                      <Check className="w-3.5 h-3.5" /> Aceptar
                    </button>
                    <button
                      onClick={() => declineRequest(f.id)}
                      disabled={loadingId === f.id}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 bg-slate-700 text-slate-300 font-semibold rounded-lg hover:bg-slate-600 disabled:opacity-50 transition"
                    >
                      <X className="w-3.5 h-3.5" /> Rechazar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Enviadas */}
          {pending.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Enviadas</p>
              {pending.map(f => (
                <div key={f.id} className="flex items-center justify-between bg-slate-800 rounded-xl px-4 py-3 opacity-70">
                  <Link href={`/profile/${f.addressee?.username ?? ''}`}>
                    <UserAvatar
                      username={f.addressee?.username ?? ''}
                      fullName={f.addressee?.full_name}
                      avatarUrl={f.addressee?.avatar_url}
                      size="md"
                      showName
                      showAlias
                    />
                  </Link>
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <Clock className="w-3.5 h-3.5" /> Pendiente
                  </span>
                </div>
              ))}
            </div>
          )}

          {requests.length === 0 && pending.length === 0 && (
            <div className="text-center py-10 text-slate-500">
              <p className="text-3xl mb-2">📭</p>
              <p className="text-sm">No tenés solicitudes pendientes.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
