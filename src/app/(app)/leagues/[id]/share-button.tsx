'use client'
import { useState } from 'react'
import { Share2, Check, Copy } from 'lucide-react'

export default function ShareButton({ leagueId, leagueName }: { leagueId: string; leagueName: string }) {
  const [copied, setCopied] = useState(false)

  const url = `https://dacopas.com/leagues/${leagueId}/join`
  const text = `¡Uníte a mi torneo "${leagueName}" en Dacopas y predecí los resultados del Mundial 2026! 🏆⚽`

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
      className="flex items-center gap-2 px-3 py-2 bg-yellow-500 hover:bg-yellow-400 text-slate-900 rounded-lg text-sm font-semibold transition"
    >
      {copied
        ? <><Check className="w-4 h-4" /> Copiado</>
        : <><Share2 className="w-4 h-4" /> Compartir</>
      }
    </button>
  )
}
