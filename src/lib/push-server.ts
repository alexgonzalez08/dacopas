import { GoogleAuth } from 'google-auth-library'
import { SupabaseClient, createClient as createAdmin } from '@supabase/supabase-js'
import webpush from 'web-push'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

const FCM_URL = `https://fcm.googleapis.com/v1/projects/${process.env.FIREBASE_PROJECT_ID}/messages:send`

async function getFCMAccessToken(): Promise<string> {
  const auth = new GoogleAuth({
    credentials: {
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
  })
  const client = await auth.getClient()
  const token = await client.getAccessToken()
  return token.token!
}

export async function sendPushToAllUsers(
  supabase: SupabaseClient,
  { title, body, data }: { title: string; body: string; data?: Record<string, string | undefined> }
) {
  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('token, platform, subscription')

  if (!tokens || tokens.length === 0) return { sent: 0, total: 0 }

  const webTokens = tokens.filter(t => t.platform === 'web' && t.subscription)
  const fcmTokens = tokens.filter(t => t.platform !== 'web')

  const webResults = await Promise.allSettled(webTokens.map(({ subscription }) =>
    webpush.sendNotification(JSON.parse(subscription), JSON.stringify({
      title,
      body,
      url: data?.url ?? '/notifications',
      image: data?.image,
      tag: data?.tag,
    }))
  ))

  if (fcmTokens.length === 0) {
    const sent = webResults.filter(r => r.status === 'fulfilled').length
    return { sent, total: tokens.length }
  }

  const accessToken = await getFCMAccessToken()
  const fcmResults = await Promise.allSettled(
    fcmTokens.map(({ token }) =>
      fetch(FCM_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          message: {
            token,
            notification: { title, body },
            android: { priority: 'high', notification: { sound: 'default' } },
            data: data ?? {},
          },
        }),
      })
    )
  )

  const sent = [...webResults, ...fcmResults].filter(r => r.status === 'fulfilled').length
  return { sent, total: tokens.length }
}

export async function sendPushToUsers({
  userIds,
  title,
  body,
  data,
}: {
  userIds: string[]
  title: string
  body: string
  data?: Record<string, string | undefined>
}) {
  if (userIds.length === 0) return

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: tokens } = await admin
    .from('push_tokens')
    .select('token, platform, subscription')
    .in('user_id', userIds)

  if (!tokens || tokens.length === 0) return

  const webTokens = tokens.filter(t => t.platform === 'web' && t.subscription)
  const fcmTokens = tokens.filter(t => t.platform !== 'web')

  // Web Push
  await Promise.allSettled(webTokens.map(({ subscription }) => {
    const sub = JSON.parse(subscription)
    return webpush.sendNotification(sub, JSON.stringify({ title, body, url: data?.url ?? '/notifications', image: data?.image, tag: data?.tag }))
  }))

  if (fcmTokens.length === 0) return

  const accessToken = await getFCMAccessToken()

  await Promise.allSettled(fcmTokens.map(({ token }) =>
    fetch(FCM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        message: {
          token,
          notification: { title, body },
          android: {
            priority: 'high',
            notification: {
              channel_id: 'dacopas_default',
              sound: 'default',
              icon: 'ic_stat_notification',
              image: 'https://dacopas.com/logo.png',
            },
          },
          apns: {
            headers: { 'apns-priority': '10' },
            payload: { aps: { alert: { title, body }, sound: 'default', badge: 1 } },
          },
          data: { url: '/notifications', ...(data ?? {}) },
        },
      }),
    })
  ))
}
