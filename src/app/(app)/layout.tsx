import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppHeader from '@/components/app-header'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, avatar_url')
    .eq('id', user.id)
    .single()

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader username={profile?.username ?? ''} avatarUrl={profile?.avatar_url} userId={user.id} />
      <main className="flex-1 px-4 py-6 max-w-3xl mx-auto w-full pb-24 md:pb-6">{children}</main>
    </div>
  )
}
