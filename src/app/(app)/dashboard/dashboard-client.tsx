'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Feed, { FeedItem } from '@/components/feed'
import CreatePost from '@/components/create-post'
import WelcomeCard from '@/components/welcome-card'
import SuggestedFriendsCarousel from '@/components/suggested-friends-carousel'
import PublicLeaguesCarousel from '@/components/public-leagues-carousel'
import ChampionPredictionCard from '@/components/champion-prediction-card'
import { initPushNotifications } from '@/lib/push'
import { Bell, X } from 'lucide-react'
import { ChampionPrediction } from '@/types'
import { ChampionMatchLike } from '@/lib/champion-teams'

type League = { id: string; name: string }
type PublicLeague = { id: string; name: string; image_url: string | null; competition_name: string | null }
type SuggestedUser = { id: string; username: string; full_name: string | null; avatar_url: string | null; shared_leagues: string[] }
type ChampionPredictionProps = {
  competitionName: string
  teams: { name: string; flag: string | null }[]
  finalMatch: ChampionMatchLike | null
  prediction: ChampionPrediction | null
}

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
  championPredictionProps,
  publicLeagues,
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
  championPredictionProps: ChampionPredictionProps | null
  publicLeagues: PublicLeague[]
}) {
  const [feed, setFeed] = useState<FeedItem[]>(() => {
    try {
      const dismissed = JSON.parse(localStorage.getItem('dismissed_system_posts') ?? '[]') as string[]
      if (dismissed.length === 0) return initialFeed
      return initialFeed.filter(i => !(i.kind === 'user_post' && (i as any).is_system && dismissed.includes((i as any).id)))
    } catch {
      return initialFeed
    }
  })
  const [showPushBanner, setShowPushBanner] = useState(false)
  const [pushStatus, setPushStatus] = useState<'idle' | 'loading' | 'error'>('idle')

  useEffect(() => {
    // En Android/Capacitor seguimos con el flujo automático
    initPushNotifications(userId)

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    if (!isIOS || !isStandalone) return

    if (Notification.permission === 'granted') {
      // Permiso ya concedido — suscribir silenciosamente en background
      import('@/lib/push').then(({ initWebPushFromGesture }) => initWebPushFromGesture())
      return
    }

    // Mostrar banner para pedir permiso
    const dismissed = localStorage.getItem('push_banner_dismissed')
    if (!dismissed && Notification.permission === 'default') {
      setShowPushBanner(true)
    }
  }, [userId])

  async function handleEnableNotifications() {
    setPushStatus('loading')
    const { initWebPushFromGesture } = await import('@/lib/push')
    const ok = await initWebPushFromGesture()
    if (ok) {
      setShowPushBanner(false)
      localStorage.setItem('push_banner_dismissed', '1')
    } else {
      setPushStatus('error')
    }
  }

  function handleDismissBanner() {
    setShowPushBanner(false)
    localStorage.setItem('push_banner_dismissed', '1')
  }

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
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg">Los Temas Actuales</h2>
        <Link href="/support" className="text-xs text-slate-500 hover:text-yellow-400 transition">
          ¿Tenés un problema? Reportalo aquí
        </Link>
      </div>

      {showPushBanner && (
        <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3">
          <Bell className="w-5 h-5 text-yellow-400 shrink-0" />
          <p className="text-sm text-slate-300 flex-1">
            {pushStatus === 'error' ? 'No se pudo activar. Intentá de nuevo.' : 'Activá las notificaciones para no perderte nada'}
          </p>
          <button
            onClick={handleEnableNotifications}
            disabled={pushStatus === 'loading'}
            className="text-xs font-bold text-yellow-400 hover:text-yellow-300 shrink-0 disabled:opacity-50"
          >
            {pushStatus === 'loading' ? '...' : 'Activar'}
          </button>
          <button onClick={handleDismissBanner} className="text-slate-500 hover:text-slate-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {showWelcome && <WelcomeCard username={username} userId={userId} />}

      <CreatePost userId={userId} username={username} avatarUrl={avatarUrl} leagues={leagues} onPost={handleNewPost} />
      <SuggestedFriendsCarousel userId={userId} suggestions={suggestedFriends} />
      <PublicLeaguesCarousel leagues={publicLeagues} />
      {championPredictionProps && (
        <ChampionPredictionCard
          userId={userId}
          competitionName={championPredictionProps.competitionName}
          teams={championPredictionProps.teams}
          finalMatch={championPredictionProps.finalMatch}
          prediction={championPredictionProps.prediction}
          className=""
        />
      )}
      <Feed items={feed} userId={userId} userAvatarUrl={avatarUrl} onDeletePost={handleDeletePost} serverNow={serverNow} />
    </div>
  )
}
