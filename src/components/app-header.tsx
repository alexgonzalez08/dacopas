'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Trophy, LogOut, Star, Users, UserCircle, UserPlus, Share2, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import WhistleIcon from '@/components/whistle-icon'
import FriendsIcon from '@/components/friends-icon'
import ProfileIcon from '@/components/profile-icon'
import TorneosIcon from '@/components/torneos-icon'

const TORNEOS_TYPES = new Set([
  'league_invite', 'league_added', 'league_created', 'join_request',
  'mod_invite_request', 'mod_invite_approved', 'mod_invite_declined',
  'member_left', 'join_request_declined',
])
const AMISTADES_TYPES = new Set([
  'follow_request', 'follow_accepted', 'friend_post', 'post_reaction', 'post_comment',
])

const DESKTOP_NAV = [
  { href: '/predictions', label: 'Mis Pronósticos', icon: Star },
  { href: '/leagues/new', label: 'Torneos', icon: TorneosIcon },
  { href: '/friends', label: 'Amistades', icon: FriendsIcon },
  { href: '/profile', label: 'Mi Perfil', icon: ProfileIcon },
]

const BOTTOM_NAV = [
  { href: '/predictions', label: 'Pronósticos', icon: Star },
  { href: '/leagues', label: 'Torneos', icon: TorneosIcon },
  { href: '/friends', label: 'Amistades', icon: FriendsIcon },
]

function Badge({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
      {count > 99 ? '99+' : count}
    </span>
  )
}

export default function AppHeader({ username, avatarUrl, userId }: { username: string; avatarUrl?: string | null; userId: string }) {
  const [unread, setUnread] = useState(0)
  const [torneosUnread, setTorneosUnread] = useState(0)
  const [amistаdesUnread, setAmistаdesUnread] = useState(0)
  const [chatUnread, setChatUnread] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const supabase = createClient()

    async function fetchUnread() {
      const { data } = await supabase
        .from('notifications')
        .select('id, type')
        .eq('user_id', userId)
        .eq('read', false)

      const notifs = data ?? []
      setUnread(notifs.length)
      setTorneosUnread(notifs.filter(n => TORNEOS_TYPES.has(n.type)).length)
      setAmistаdesUnread(notifs.filter(n => AMISTADES_TYPES.has(n.type)).length)
    }

    fetchUnread()

    const channel = supabase
      .channel('notifications-badge')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, fetchUnread)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, fetchUnread)
      .subscribe()

    const interval = setInterval(fetchUnread, 15000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [userId])

  useEffect(() => {
    async function fetchChatUnread() {
      const res = await fetch('/api/leagues/chat/unread')
      if (res.ok) {
        const { total } = await res.json()
        setChatUnread(total ?? 0)
      }
    }

    fetchChatUnread()
    const supabase = createClient()
    const channel = supabase
      .channel('chat-unread-badge')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'league_chat_messages' }, fetchChatUnread)
      .subscribe()
    const interval = setInterval(fetchChatUnread, 30000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [userId])

  // Actualizar título de la pestaña del navegador
  useEffect(() => {
    const total = unread + chatUnread
    document.title = total > 0 ? `(${total > 99 ? '99+' : total}) Dacopas` : 'Dacopas'
  }, [unread, chatUnread])

  useEffect(() => {
    if (pathname === '/notifications') {
      setUnread(0)
      setTorneosUnread(0)
      setAmistаdesUnread(0)
    }
    if (pathname.startsWith('/leagues')) setChatUnread(0)
    if (pathname.startsWith('/friends')) setAmistаdesUnread(0)
  }, [pathname])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function handleShare() {
    const url = 'https://dacopas.com'
    const text = '⚽ ¡Jugá con tus amigos en Dacopas! Predecí los resultados del Mundial 2026 y competí en torneos privados.'
    if (navigator.share) {
      try { await navigator.share({ title: 'Dacopas', text, url }) } catch {}
      return
    }
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const torneosTotal = torneosUnread + chatUnread

  return (
    <>
      <header className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-yellow-400">
          <img src="/logo.png" alt="Dacopas" className="w-7 h-7 object-contain" />
          Dacopas
        </Link>

        <div className="flex items-center gap-2">
          {/* Desktop nav */}
          <nav className="hidden md:flex gap-1 mr-1">
            {DESKTOP_NAV.map(({ href, label, icon: Icon }) => {
              const isTorneos = href === '/leagues/new'
              const isAmistades = href === '/friends'
              const badgeCount = isTorneos ? torneosTotal : isAmistades ? amistаdesUnread : 0
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition ${
                    pathname.startsWith(href) && href !== '/dashboard'
                      ? 'bg-slate-800 text-white'
                      : pathname === href && href === '/dashboard'
                      ? 'bg-slate-800 text-white'
                      : 'hover:bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <span className="relative">
                    <Icon className="w-4 h-4" />
                    <Badge count={badgeCount} />
                  </span>
                  {label}
                </Link>
              )
            })}
          </nav>

          {/* Compartir app */}
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-yellow-500 hover:bg-yellow-400 text-slate-900 rounded-lg transition"
            title="Compartir Dacopas"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copiado' : 'Compartir'}</span>
          </button>

          {/* Notificaciones */}
          <Link href="/notifications" className="relative p-1.5 text-slate-400 hover:text-white transition">
            <WhistleIcon className="w-5 h-5" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </Link>

          {/* Avatar con dropdown (perfil + logout) */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="flex items-center gap-2 hover:opacity-80 transition"
            >
              <div style={{ width: 32, height: 32 }} className="rounded-full bg-slate-700 overflow-hidden shrink-0 flex items-center justify-center text-xs font-bold text-slate-300 uppercase">
                {avatarUrl
                  ? <img src={avatarUrl} alt={username} className="w-full h-full object-cover" />
                  : username[0]
                }
              </div>
              <span className="hidden md:block text-sm text-slate-400">{username}</span>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-10 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 min-w-40 overflow-hidden">
                <Link
                  href="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition"
                >
                  <UserCircle className="w-4 h-4" /> Mi perfil
                </Link>
                <div className="border-t border-slate-700" />
                <button
                  onClick={() => { setMenuOpen(false); signOut() }}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-slate-700 w-full transition"
                >
                  <LogOut className="w-4 h-4" /> Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Barra de navegación inferior — solo mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800 flex">
        {BOTTOM_NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          const isTorneos = href === '/leagues'
          const isAmistades = href === '/friends'
          const badgeCount = isTorneos ? torneosTotal : isAmistades ? amistаdesUnread : 0
          return (
            <Link
              key={href}
              href={href === '/leagues' ? '/leagues/new' : href}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-xs font-medium transition ${
                active ? 'text-yellow-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <span className="relative">
                <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5px]' : ''}`} />
                <Badge count={badgeCount} />
              </span>
              {label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
