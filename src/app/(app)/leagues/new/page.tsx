import { createClient } from '@/lib/supabase/server'
import LeaguesClient from './leagues-client'

export default async function LeaguesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: memberships } = await supabase
    .from('league_members')
    .select('leagues(id, name, code)')
    .eq('user_id', user!.id)

  const leagues = memberships?.map(m => m.leagues).filter(Boolean) ?? []

  return <LeaguesClient leagues={leagues as any} />
}
