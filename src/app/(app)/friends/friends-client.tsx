'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import UserAvatar from '@/components/user-avatar'
import { UserPlus, UserCheck, UserX, Search, Clock, Users, Check, X, Loader2 } from 'lucide-react'
import Link from 'next/link'

type Profile = { id: string; username: string; full_name: string | null; avatar_url: string | null }
type Friendship = { id: string; requester?: Profile; addressee?: Profile; status: string }

export default function FriendsClient({
  userId,
  initialFollowing,
  initialFollowers,
  initialPending,
  initialRequests,
}: {
  userId: string
  initialFollowing: Friendship[]
  initialFollowers: Friendship[]
  initialPending: Friendship[]
  initialRequests: Friendship[]
}) {
  const [following, setFollowing] = useState(initialFollowing)
  const [followers, setFollowers] = useState(initialFollowers)
  const [pending, setPending] = useState(initialPending)
  const [requests, setRequests] = useState(initialRequests)
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [searching, setSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [tab, setTab] = useState<'following' | 'followers' | 'requests'>('following')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const q = search.trim()
    if (q.length < 2) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      const supabase = createClient()
      const { data } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
        .neq('id', userId)
        .limit(8)
      setSearchResults(data ?? [])
      setShowDropdown(true)
      setSearching(false)
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search, userId])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
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
      setShowDropdown(false)
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
      .select('*, requester:requester_id(id, username, full_name, avatar_url)')
      .single()
    if (data) {
      setRequests(r => r.filter(f => f.id !== friendshipId))
      setFollowers(f => [...f, data])
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

  async function unfollow(friendshipId: string) {
    setLoadingId(friendshipId)
    const supabase = createClient()
    await supabase.from('friendships').delete().eq('id', friendshipId)
    setFollowing(f => f.filter(fr => fr.id !== friendshipId))
    setLoadingId(null)
  }

  async function removeFollower(friendshipId: string) {
    setLoadingId(friendshipId)
    const supabase = createClient()
    await supabase.from('friendships').delete().eq('id', friendshipId)
    setFollowers(f => f.filter(fr => fr.id !== friendshipId))
    setLoadingId(null)
  }

  function isAlreadyFollowing(profileId: string) {
    return following.some(f => f.addressee?.id === profileId)
  }

  function isPendingSent(profileId: string) {
    return pending.some(f => f.addressee?.id === profileId)
  }

  const tabs = [
    { key: 'following' as const, label: 'Siguiendo', count: following.length },
    { key: 'followers' as const, label: 'Seguidores', count: followers.length },
    { key: 'requests' as const, label: 'Solicitudes', count: requests.length },
  ]

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold">Seguidores</h1>

      {/* Buscar usuarios */}
      <div className="bg-slate-800 rounded-2xl p-4 space-y-4">
        <h2 className="font-semibold text-slate-300 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-yellow-400" /> Agregar seguidor
        </h2>
        <form onSubmit={handleSearch} className="relative" ref={wrapperRef}>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                placeholder="Buscar por alias o nombre..."
                className="w-full bg-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500 text-slate-200 placeholder-slate-500"
              />
              {searching && (
                <Loader2 className="w-4 h-4 animate-spin text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              )}
            </div>
            <button
              type="submit"
              disabled={searching}
              className="px-3 py-2 bg-yellow-500 text-slate-900 font-semibold rounded-xl hover:bg-yellow-400 disabled:opacity-50 transition"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>

          {showDropdown && searchResults.length > 0 && (
            <div className="absolute z-10 left-0 right-0 mt-1 bg-slate-700 rounded-xl shadow-lg overflow-hidden border border-slate-600">
              {searchResults.map(profile => (
                <div key={profile.id} className="flex items-center justify-between px-3 py-2.5 hover:bg-slate-600/60 transition">
                  <UserAvatar
                    username={profile.username}
                    fullName={profile.full_name}
                    avatarUrl={profile.avatar_url}
                    size="md"
                    showName
                    showAlias
                  />
                  {isAlreadyFollowing(profile.id) ? (
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
                      Seguir
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {showDropdown && search.trim().length >= 2 && !searching && searchResults.length === 0 && (
            <div className="absolute z-10 left-0 right-0 mt-1 bg-slate-700 rounded-xl shadow-lg border border-slate-600 px-4 py-3 text-sm text-slate-400 text-center">
              No se encontraron usuarios
            </div>
          )}
        </form>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl overflow-hidden border border-slate-700">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 text-sm font-semibold transition flex items-center justify-center gap-2 ${tab === t.key ? 'bg-yellow-500 text-slate-900' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            {t.label}
            {t.key === 'requests' && t.count > 0
              ? <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{t.count}</span>
              : <span className="text-xs opacity-70">({t.count})</span>
            }
          </button>
        ))}
      </div>

      {/* Siguiendo */}
      {tab === 'following' && (
        <div className="space-y-2">
          {following.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              <p className="text-3xl mb-2">🔭</p>
              <p className="text-sm">No estás siguiendo a nadie todavía.</p>
            </div>
          ) : (
            following.map(f => {
              const profile = f.addressee
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
                    onClick={() => unfollow(f.id)}
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

      {/* Seguidores */}
      {tab === 'followers' && (
        <div className="space-y-2">
          {followers.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              <p className="text-3xl mb-2">👥</p>
              <p className="text-sm">Todavía nadie te sigue.</p>
            </div>
          ) : (
            followers.map(f => {
              const profile = f.requester
              if (!profile) return null
              const alreadyFollowing = isAlreadyFollowing(profile.id)
              const pendingSent = isPendingSent(profile.id)
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
                  <div className="flex items-center gap-2">
                    {alreadyFollowing ? (
                      <span className="flex items-center gap-1 text-xs text-green-400">
                        <UserCheck className="w-3.5 h-3.5" /> Siguiendo
                      </span>
                    ) : pendingSent ? (
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
                        Seguir
                      </button>
                    )}
                    <button
                      onClick={() => removeFollower(f.id)}
                      disabled={loadingId === f.id}
                      className="text-slate-500 hover:text-red-400 transition p-1.5 rounded-lg hover:bg-slate-700"
                      title="Eliminar seguidor"
                    >
                      {loadingId === f.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserX className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Solicitudes */}
      {tab === 'requests' && (
        <div className="space-y-6">
          {/* Recibidas */}
          <div className="space-y-2">
            <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold flex items-center gap-2">
              <Users className="w-3.5 h-3.5" /> Recibidas
              {requests.length > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{requests.length}</span>
              )}
            </p>
            {requests.length === 0 ? (
              <p className="text-sm text-slate-500 py-3 text-center">No tenés solicitudes recibidas.</p>
            ) : (
              requests.map(f => (
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
              ))
            )}
          </div>

          {/* Enviadas */}
          <div className="space-y-2">
            <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" /> Enviadas ({pending.length})
            </p>
            {pending.length === 0 ? (
              <p className="text-sm text-slate-500 py-3 text-center">No tenés solicitudes enviadas.</p>
            ) : (
              pending.map(f => (
                <div key={f.id} className="flex items-center justify-between bg-slate-800 rounded-xl px-4 py-3 opacity-70">
                  <Link href={`/profile/${f.addressee?.username ?? ''}`}>
                    <UserAvatar
                      username={f.addressee?.username ?? ''}
                      fullName={f.addressee?.full_name}
                      avatarUrl={f.addressee?.avatar_url}
                      size="md"
                      showName
                      showAlias
                      linkable={false}
                    />
                  </Link>
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <Clock className="w-3.5 h-3.5" /> Pendiente
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
