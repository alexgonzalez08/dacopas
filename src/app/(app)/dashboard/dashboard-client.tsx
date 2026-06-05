'use client'
import { useState } from 'react'
import Feed, { FeedItem } from '@/components/feed'
import CreatePost from '@/components/create-post'

export default function DashboardClient({
  userId,
  username,
  avatarUrl,
  initialFeed,
  serverNow,
}: {
  userId: string
  username: string
  avatarUrl?: string | null
  initialFeed: FeedItem[]
  serverNow: string
}) {
  const [feed, setFeed] = useState<FeedItem[]>(initialFeed)

  function handleNewPost(post: any) {
    const newItem: FeedItem = {
      kind: 'user_post',
      ...post,
      sortDate: new Date(post.created_at),
    }
    // Insertar después de los match posts (que van siempre primero)
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
      <CreatePost userId={userId} username={username} avatarUrl={avatarUrl} onPost={handleNewPost} />
      <Feed items={feed} userId={userId} onDeletePost={handleDeletePost} serverNow={serverNow} />
    </div>
  )
}
