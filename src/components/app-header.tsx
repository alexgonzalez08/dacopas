'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Trophy, LogOut, LayoutDashboard, Star, Users, Menu, X, UserCircle, UserPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import WhistleIcon from '@/components/whistle-icon'

const NAV_LINKS = [
  { href: '/dashboard', label: 'Inicio', icon: LayoutDashboard },
  { href: '/predictions', label: 'Mis Pronósticos', icon: Star },
  { href: '/leagues/new', label: 'Torneos', icon: Users },
  { href: '/friends', label: 'Amistades', icon: UserPlus },
  { href: '/profile', label: 'Mi Perfil', icon: UserCircle },
]

export default function AppHeader({ username, avatarUrl, userId }: { username: string; avatarUrl?: string | null; userId: string }) {
  const [open, setOpen] = useState(false)
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

    // Realtime
    const channel = supabase
      .channel('notifications-badge')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, () => fetchUnread())
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, () => fetchUnread())
      .subscribe()

    // Polling cada 15s como fallback
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
            {NAV_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white"
              >
                <Icon className="w-4 h-4" /> {label}
              </Link>
            ))}
          </nav>

          {/* Silbato de notificaciones */}
          <Link href="/notifications" className="relative p-1.5 text-slate-400 hover:text-white transition">
            <WhistleIcon className="w-5 h-5" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </Link>

          <Link href="/profile" className="hidden md:flex items-center gap-2 hover:opacity-80 transition">
            <div style={{ width: 32, height: 32 }} className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden shrink-0 flex items-center justify-center text-xs font-bold text-slate-300 uppercase">
              {avatarUrl
                ? <img src={avatarUrl} alt={username} className="w-full h-full object-cover" />
                : username[0]
              }
            </div>
            <span className="text-sm text-slate-400">{username}</span>
          </Link>
          <button onClick={signOut} className="text-slate-400 hover:text-white hidden md:block">
            <LogOut className="w-4 h-4" />
          </button>

          {/* Mobile hamburger */}
          <button
            onClick={() => setOpen(v => !v)}
            className="md:hidden text-slate-400 hover:text-white p-1"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden fixed inset-0 z-30 bg-slate-900/95 flex flex-col pt-20 px-6" onClick={() => setOpen(false)}>
          <div className="space-y-1">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-4 text-lg font-medium text-slate-200 hover:text-yellow-400 hover:bg-slate-800 rounded-xl transition"
              >
                <Icon className="w-5 h-5" /> {label}
              </Link>
            ))}
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-4 text-lg font-medium text-slate-200 hover:text-yellow-400 hover:bg-slate-800 rounded-xl transition"
            >
              <WhistleIcon className="w-5 h-5" />
              Notificaciones
              {unread > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </Link>
          </div>
          <div className="mt-auto mb-10 border-t border-slate-800 pt-4">
            <div className="px-4 py-2 text-sm text-slate-500 mb-2">{username}</div>
            <button
              onClick={signOut}
              className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-400 transition w-full"
            >
              <LogOut className="w-5 h-5" /> Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </>
  )
}
