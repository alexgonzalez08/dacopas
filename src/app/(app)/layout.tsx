import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppHeader from '@/components/app-header'
import ChatToast from '@/components/chat-toast'
import SWRegister from '@/components/sw-register'
import { UnsavedChangesProvider } from '@/lib/unsaved-changes-context'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single(),
    supabase.from('league_members').select('leagues(id, name, image_url)').eq('user_id', user.id).is('left_at', null),
  ])

  const leagues = (memberships ?? [])
    .flatMap(m => m.leagues ? [m.leagues as unknown as { id: string; name: string; image_url: string | null }] : [])

  return (
    <UnsavedChangesProvider>
      <div className="flex flex-col min-h-screen">
        <SWRegister />
        <AppHeader username={profile?.username ?? ''} avatarUrl={profile?.avatar_url} userId={user.id} />
        <main className="flex-1 px-4 py-6 max-w-3xl mx-auto w-full pb-24 md:pb-6">{children}</main>
        <ChatToast userId={user.id} leagues={leagues} />
      </div>
    </UnsavedChangesProvider>
  )
}
