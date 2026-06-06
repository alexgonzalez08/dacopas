import { createClient } from '@/lib/supabase/client'

/**
 * Inicializa push notifications en Android/iOS via Capacitor.
 * Debe llamarse después de que el usuario inicia sesión.
 */
export async function initPushNotifications(userId: string) {
  // Solo en entorno nativo (Capacitor)
  if (typeof window === 'undefined') return
  if (!(window as any).Capacitor?.isNativePlatform()) return

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')

    // Verificar estado actual antes de pedir
    let status = await PushNotifications.checkPermissions()

    if (status.receive === 'prompt' || status.receive === 'prompt-with-rationale') {
      status = await PushNotifications.requestPermissions()
    }

    if (status.receive === 'denied') return

    if (status.receive !== 'granted') return

    // Registrar para recibir el token
    await PushNotifications.register()

    // Guardar token cuando llega
    PushNotifications.addListener('registration', async (token) => {
      await savePushToken(userId, token.value, 'android')
    })

    // Manejar notificación recibida con app abierta
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push recibida:', notification)
    })

    // Manejar tap en notificación
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const url = action.notification.data?.url
      if (url) window.location.href = url
    })

  } catch (err) {
    console.error('Error inicializando push:', err)
  }
}

async function savePushToken(userId: string, token: string, platform: string) {
  const supabase = createClient()
  await supabase
    .from('push_tokens')
    .upsert({ user_id: userId, token, platform }, { onConflict: 'user_id,token' })
}

/**
 * Envía una push notification a un usuario via API Route.
 */
export async function sendPushNotification({
  toUserId,
  title,
  body,
  data,
}: {
  toUserId: string
  title: string
  body: string
  data?: Record<string, string>
}) {
  try {
    await fetch('/api/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toUserId, title, body, data }),
    })
  } catch (err) {
    console.error('Error enviando push:', err)
  }
}
