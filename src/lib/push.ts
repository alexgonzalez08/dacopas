import { createClient } from '@/lib/supabase/client'

/**
 * Inicializa push notifications en Android/iOS via Capacitor.
 * Debe llamarse después de que el usuario inicia sesión.
 */
async function waitForCapacitor(maxMs = 5000): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    if ((window as any).Capacitor?.isNativePlatform()) return true
    await new Promise(r => setTimeout(r, 200))
  }
  return false
}

export async function initPushNotifications(userId: string) {
  if (typeof window === 'undefined') return

  const ready = await waitForCapacitor()
  if (!ready) return

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    const { Device } = await import('@capacitor/device')
    const info = await Device.getInfo()
    const platform = info.platform // 'android' | 'ios'

    // Agregar listeners ANTES de register() para no perder el evento
    await PushNotifications.addListener('registration', async (token) => {
      await savePushToken(userId, token.value, platform)
    })

    await PushNotifications.addListener('registrationError', (err) => {
      console.error('Error registrando push token:', err)
    })

    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push recibida:', notification)
    })

    await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const url = action.notification.data?.url
      if (url) window.location.href = url
    })

    // Verificar y pedir permiso
    let status = await PushNotifications.checkPermissions()

    if (status.receive === 'prompt' || status.receive === 'prompt-with-rationale') {
      status = await PushNotifications.requestPermissions()
    }

    if (status.receive !== 'granted') return

    // Registrar para recibir el token
    await PushNotifications.register()

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
