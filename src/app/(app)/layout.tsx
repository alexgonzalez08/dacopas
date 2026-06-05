import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Trophy, LogOut, LayoutDashboard, Star, Users } from 'lucide-react'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single()

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-yellow-400">
          <Trophy className="w-5 h-5" />
          MyScore FootApp
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-400">{profile?.username}</span>
          <form action={signOut}>
            <button type="submit" className="text-slate-400 hover:text-white">
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </header>
      <nav className="flex gap-1 px-4 py-2 bg-slate-900/50 border-b border-slate-800 overflow-x-auto">
        <Link href="/dashboard" className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white whitespace-nowrap">
          <LayoutDashboard className="w-4 h-4" /> Inicio
        </Link>
        <Link href="/predictions" className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white whitespace-nowrap">
          <Star className="w-4 h-4" /> Mis Pronósticos
        </Link>
        <Link href="/leagues/new" className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white whitespace-nowrap">
          <Users className="w-4 h-4" /> Ligas
        </Link>
      </nav>
      <main className="flex-1 px-4 py-6 max-w-3xl mx-auto w-full">{children}</main>
    </div>
  )
}
