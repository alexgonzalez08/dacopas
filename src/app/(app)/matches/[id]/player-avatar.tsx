'use client'
import { useState } from 'react'

export default function PlayerAvatar({
  id,
  number,
  ringColor,
  fallbackBg,
}: {
  id: number
  number: number
  ringColor: string
  fallbackBg: string
}) {
  const [failed, setFailed] = useState(false)
  const src = `https://media.api-sports.io/football/players/${id}.png`

  return (
    <div className={`w-11 h-11 rounded-full ring-2 ${ringColor} overflow-hidden shadow-lg ${failed ? fallbackBg : 'bg-slate-700'} flex items-center justify-center`}>
      {!failed ? (
        <img
          src={src}
          alt=""
          className="w-full h-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="text-[11px] font-bold text-white leading-none">{number}</span>
      )}
    </div>
  )
}
