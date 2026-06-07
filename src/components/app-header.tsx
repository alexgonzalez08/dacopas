'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Trophy, LogOut, LayoutDashboard, Star, Users, UserCircle, UserPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import WhistleIcon from '@/components/whistle-icon'

const DESKTOP_NAV = [
  { href: '/dashboard', label: 'Inicio', icon: LayoutDashboard },
  { href: '/predictions', label: 'Mis Pronósticos', icon: Star },
  { href: '/leagues/new', label: 'Torneos', icon: Users },
  { href: '/friends', label: 'Amistades', icon: UserPlus },
  { href: '/profile', label: 'Mi Perfil', icon: UserCircle },
]

const BOTTOM_NAV = [
  { href: '/predictions', label: 'Pronósticos', icon: Star },
  { href: '/leagues', label: 'Ligas', icon: Trophy },
  { href: '/friends', label: 'Amistades', icon: UserPlus },
]

export default function AppHeader({ username, avatarUrl, userId }: { username: string; avatarUrl?: string | null; userId: string }) {
  const [unread, setUnread] = useState(0)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const supabase = createClient()

    async function fetchUnread() {
      const { data } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('read', false)
      setUnread(data?.length ?? 0)
    }

    fetchUnread()

    const channel = supabase
      .channel('notifications-badge')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, () => fetchUnread())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, () => fetchUnread())
      .subscribe()

    const interval = setInterval(fetchUnread, 15000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [userId])

  useEffect(() => {
    if (pathname === '/notifications') setUnread(0)
  }, [pathname])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      <header className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-yellow-400">
          <Trophy className="w-5 h-5" />
          Dacopas
        </Link>

        <div className="flex items-center gap-3">
          {/* Desktop nav */}
          <nav className="hidden md:flex gap-1">
            {DESKTOP_NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition ${
                  pathname.startsWith(href) && href !== '/dashboard'
                    ? 'bg-slate-800 text-white'
                    : pathname === href && href === '/dashboard'
                    ? 'bg-slate-800 text-white'
                    : 'hover:bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" /> {label}
              </Link>
            ))}
          </nav>

          {/* Notificaciones */}
          <Link href="/notifications" className="relative p-1.5 text-slate-400 hover:text-white transition">
            <WhistleIcon className="w-5 h-5" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </Link>

          {/* Avatar / perfil */}
          <Link href="/profile" className="flex items-center gap-2 hover:opacity-80 transition">
            <div style={{ width: 32, height: 32 }} className="rounded-full bg-slate-700 overflow-hidden shrink-0 flex items-center justify-center text-xs font-bold text-slate-300 uppercase">
              {avatarUrl
                ? <img src={avatarUrl} alt={username} className="w-full h-full object-cover" />
                : username[0]
              }
            </div>
            <span className="hidden md:block text-sm text-slate-400">{username}</span>
          </Link>

          {/* Logout */}
          <button onClick={signOut} className="text-slate-400 hover:text-white transition">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Barra de navegación inferior — solo mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800 flex">
        {BOTTOM_NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href === '/leagues' ? '/leagues/new' : href}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-xs font-medium transition ${
                active ? 'text-yellow-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5px]' : ''}`} />
              {label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
