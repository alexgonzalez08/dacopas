import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppHeader from '@/components/app-header'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single()

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader username={profile?.username ?? ''} />
      <main className="flex-1 px-4 py-6 max-w-3xl mx-auto w-full">{children}</main>
    </div>
  )
}
