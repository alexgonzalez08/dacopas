/// <reference lib="webworker" />

const sw = self as unknown as ServiceWorkerGlobalScope

sw.addEventListener('push', (event) => {
  if (!event.data) return
  const data = event.data.json()
  const title = data.title ?? 'Dacopas'
  const options: NotificationOptions = {
    body: data.body ?? '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: data.url ?? '/notifications' },
  }
  event.waitUntil(sw.registration.showNotification(title, options))
})

sw.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/notifications'
  event.waitUntil(
    sw.clients.matchAll({ type: 'window' }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(url))
      if (existing) return existing.focus()
      return sw.clients.openWindow(url)
    })
  )
})
