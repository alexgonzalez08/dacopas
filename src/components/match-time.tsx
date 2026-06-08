'use client'

export default function MatchTime({ matchDate }: { matchDate: string }) {
  const d = new Date(matchDate)
  return <>{d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>
}
