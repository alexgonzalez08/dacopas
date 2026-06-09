'use client'
import { useState, useEffect } from 'react'
import Feed, { FeedItem } from '@/components/feed'
import CreatePost from '@/components/create-post'
import WelcomeCard from '@/components/welcome-card'
import SuggestedFriendsCarousel from '@/components/suggested-friends-carousel'
import { initPushNotifications } from '@/lib/push'

type League = { id: string; name: string }
type SuggestedUser = { id: string; username: string; full_name: string | null; avatar_url: string | null; shared_leagues: string[] }

export default function DashboardClient({
  userId,
  username,
  avatarUrl,
  leagues,
  initialFeed,
  serverNow,
  hasLeagues,
  showWelcome,
  suggestedFriends,
}: {
  userId: string
  username: string
  avatarUrl?: string | null
  leagues: League[]
  initialFeed: FeedItem[]
  serverNow: string
  hasLeagues: boolean
  showWelcome: boolean
  suggestedFriends: SuggestedUser[]
}) {
  const [feed, setFeed] = useState<FeedItem[]>(initialFeed)

  useEffect(() => {
    initPushNotifications(userId)
  }, [userId])

  function handleNewPost(post: any) {
    const newItem: FeedItem = {
      kind: 'user_post',
      ...post,
      sortDate: new Date(post.created_at),
    }
    setFeed(prev => {
      const matchPosts = prev.filter(i => i.kind === 'match')
      const rest = prev.filter(i => i.kind !== 'match')
      return [...matchPosts, newItem, ...rest]
    })
  }

  function handleDeletePost(id: string) {
    setFeed(prev => prev.filter(i => !(i.kind === 'user_post' && (i as any).id === id)))
  }

  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-lg">Los Temas Actuales</h2>

      {showWelcome && <WelcomeCard username={username} userId={userId} />}

      <CreatePost userId={userId} username={username} avatarUrl={avatarUrl} leagues={leagues} onPost={handleNewPost} />
      <SuggestedFriendsCarousel userId={userId} suggestions={suggestedFriends} />
      <Feed items={feed} userId={userId} userAvatarUrl={avatarUrl} onDeletePost={handleDeletePost} serverNow={serverNow} />
    </div>
  )
}
