'use client'

export default function MatchTime({ matchDate }: { matchDate: string | Date }) {
  const d = typeof matchDate === 'string' ? new Date(matchDate) : matchDate
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return <span suppressHydrationWarning>{h}:{m}</span>
}
