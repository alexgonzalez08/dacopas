'use client'
import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export default function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="flex items-center gap-2 px-3 py-2 bg-slate-700 rounded-lg text-sm hover:bg-slate-600 transition">
      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
      {copied ? 'Copiado' : 'Copiar código'}
    </button>
  )
}
