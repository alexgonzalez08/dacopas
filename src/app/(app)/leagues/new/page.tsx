import { createClient } from '@/lib/supabase/server'
import LeaguesClient from './leagues-client'

export default async function LeaguesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: memberships } = await supabase
    .from('league_members')
    .select('role, leagues(id, name, code, image_url)')
    .eq('user_id', user!.id)
    .is('left_at', null)

  const leagues = (memberships ?? [])
    .filter(m => m.leagues != null)
    .map(m => ({ ...(m.leagues as any), role: m.role ?? 'participant' }))

  return <LeaguesClient leagues={leagues} />
}
