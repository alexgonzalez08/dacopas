'use client'
import { useState } from 'react'
import Feed, { FeedItem } from '@/components/feed'
import CreatePost from '@/components/create-post'
import WelcomeCard from '@/components/welcome-card'

type League = { id: string; name: string }

export default function DashboardClient({
  userId,
  username,
  avatarUrl,
  leagues,
  initialFeed,
  serverNow,
  hasLeagues,
}: {
  userId: string
  username: string
  avatarUrl?: string | null
  leagues: League[]
  initialFeed: FeedItem[]
  serverNow: string
  hasLeagues: boolean
}) {
  const [feed, setFeed] = useState<FeedItem[]>(initialFeed)
  const [showWelcome, setShowWelcome] = useState(!hasLeagues)

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
      <h2 className="font-semibold text-lg">Actividad reciente</h2>

      {showWelcome && <WelcomeCard username={username} />}

      <CreatePost userId={userId} username={username} avatarUrl={avatarUrl} leagues={leagues} onPost={handleNewPost} />
      <Feed items={feed} userId={userId} onDeletePost={handleDeletePost} serverNow={serverNow} />
    </div>
  )
}
