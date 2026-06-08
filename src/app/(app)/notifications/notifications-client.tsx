'use client'
import NotificationsPanel, { Notification } from '@/components/notifications-panel'

export default function NotificationsClient({
  userId,
  initialNotifications,
}: {
  userId: string
  initialNotifications: Notification[]
}) {
  return (
    <div className="max-w-xl mx-auto">
      <NotificationsPanel userId={userId} initialNotifications={initialNotifications} />
    </div>
  )
}
