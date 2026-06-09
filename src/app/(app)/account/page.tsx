import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AccountClient from './account-client'

export const metadata = { title: 'Gestión de Cuenta — Dacopas' }

export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, full_name, bio, avatar_url')
    .eq('id', user.id)
    .single()

  return <AccountClient userId={user.id} email={user.email!} profile={profile} />
}
