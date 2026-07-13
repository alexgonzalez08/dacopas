export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import LeaguesClient from './leagues-client'

export default async function LeaguesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: memberships }, { data: profile }] = await Promise.all([
    supabase
      .from('league_members')
      .select('role, leagues(id, name, code, image_url, ended_at, competition_name, is_public)')
      .eq('user_id', user!.id)
      .is('left_at', null),
    supabase
      .from('profiles')
      .select('leagues_info_seen')
      .eq('id', user!.id)
      .single(),
  ])

  const leagues = (memberships ?? [])
    .filter(m => m.leagues != null)
    .map(m => ({ ...(m.leagues as any), role: m.role ?? 'participant' }))

  const leagueIds = leagues.map(l => l.id)

  // Unread chat por liga
  let chatUnread: Record<string, number> = {}
  if (leagueIds.length > 0) {
    const { data: reads } = await supabase
      .from('league_chat_reads')
      .select('league_id, last_read_at')
      .eq('user_id', user!.id)
      .in('league_id', leagueIds)

    const readMap = new Map((reads ?? []).map(r => [r.league_id, r.last_read_at]))

    const counts = await Promise.all(
      leagueIds.map(async (leagueId) => {
        const lastRead = readMap.get(leagueId)
        let query = supabase
          .from('league_chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('league_id', leagueId)
          .neq('user_id', user!.id)
        if (lastRead) query = query.gt('created_at', lastRead)
        const { count } = await query
        return { leagueId, count: count ?? 0 }
      })
    )

    for (const { leagueId, count } of counts) {
      if (count > 0) chatUnread[leagueId] = count
    }
  }

  // Notificaciones pendientes por torneo (join_request para admins)
  let leagueNotifs: Record<string, number> = {}
  if (leagueIds.length > 0) {
    const { data: notifs } = await supabase
      .from('notifications')
      .select('metadata')
      .eq('user_id', user!.id)
      .eq('type', 'join_request')
      .eq('read', false)

    for (const n of notifs ?? []) {
      const lid = n.metadata?.league_id
      if (lid && leagueIds.includes(lid)) {
        leagueNotifs[lid] = (leagueNotifs[lid] ?? 0) + 1
      }
    }
  }

  return (
    <LeaguesClient
      leagues={leagues}
      userId={user!.id}
      leaguesInfoSeen={profile?.leagues_info_seen ?? false}
      chatUnread={chatUnread}
      leagueNotifs={leagueNotifs}
    />
  )
}
