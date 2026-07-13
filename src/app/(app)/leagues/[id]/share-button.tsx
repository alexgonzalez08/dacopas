'use client'
import { useState } from 'react'
import { Share2, Check, Copy } from 'lucide-react'

export default function ShareButton({ leagueId, leagueName, competitionName }: { leagueId: string; leagueName: string; competitionName: string }) {
  const [copied, setCopied] = useState(false)

  const url = `https://dacopas.com/leagues/${leagueId}/join`
  const text = `¡Uníte a mi torneo "${leagueName}" en Dacopas y predecí los resultados de ${competitionName}! 🏆⚽`

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: leagueName, text, url })
      } catch {}
      return
    }
    // Fallback: copiar link
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleShare}
      className="flex items-center justify-center gap-2 px-3 py-1.5 md:px-2.5 md:py-1 bg-yellow-500 hover:bg-yellow-400 text-slate-900 rounded-lg text-sm md:text-xs font-semibold transition"
    >
      {copied
        ? <><Check className="w-3.5 h-3.5" /> Copiado</>
        : <><Share2 className="w-3.5 h-3.5" /> Compartir</>
      }
    </button>
  )
}
