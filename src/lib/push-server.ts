import { GoogleAuth } from 'google-auth-library'
import { SupabaseClient } from '@supabase/supabase-js'

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
  { title, body, data }: { title: string; body: string; data?: Record<string, string> }
) {
  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('token')

  if (!tokens || tokens.length === 0) return { sent: 0, total: 0 }

  const accessToken = await getFCMAccessToken()

  const results = await Promise.allSettled(
    tokens.map(({ token }) =>
      fetch(FCM_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          message: {
            token,
            notification: { title, body },
            android: {
              priority: 'high',
              notification: { sound: 'default', click_action: 'FLUTTER_NOTIFICATION_CLICK' },
            },
            data: data ?? {},
          },
        }),
      })
    )
  )

  const sent = results.filter(r => r.status === 'fulfilled').length
  return { sent, total: tokens.length }
}
