'use client'
import { useState, RefObject, MouseEvent } from 'react'
import { toPng } from 'html-to-image'
import { Share2, Check, Loader2 } from 'lucide-react'

type Status = 'idle' | 'loading' | 'done' | 'error'

export default function ShareImageButton({
  targetRef,
  fileName,
  shareTitle,
  shareText,
  backgroundColor = '#1e293b',
  label = 'Compartir',
  className,
}: {
  targetRef: RefObject<HTMLElement | null>
  fileName: string
  shareTitle?: string
  shareText?: string
  backgroundColor?: string
  label?: string
  className?: string
}) {
  const [status, setStatus] = useState<Status>('idle')

  async function handleClick(e: MouseEvent) {
    e.stopPropagation()
    const node = targetRef.current
    if (!node || status === 'loading') return

    setStatus('loading')
    try {
      const dataUrl = await toPng(node, {
        backgroundColor,
        pixelRatio: 2,
        cacheBust: true,
        filter: n => !(n instanceof HTMLElement && n.dataset.shareIgnore === 'true'),
      })
      const blob = await (await fetch(dataUrl)).blob()
      const file = new File([blob], `${fileName}.png`, { type: 'image/png' })

      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: shareTitle, text: shareText })
        setStatus('idle')
        return
      }

      if (navigator.clipboard && 'write' in navigator.clipboard && typeof window.ClipboardItem !== 'undefined') {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
          setStatus('done')
          setTimeout(() => setStatus('idle'), 2000)
          return
        } catch {
          // Sigue al fallback de descarga
        }
      }

      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `${fileName}.png`
      link.click()
      setStatus('done')
      setTimeout(() => setStatus('idle'), 2000)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setStatus('idle')
        return
      }
      setStatus('error')
      setTimeout(() => setStatus('idle'), 2000)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={status === 'loading'}
      className={className ?? 'flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition px-3 py-1.5 rounded-lg hover:bg-slate-700 disabled:opacity-50'}
    >
      {status === 'loading' ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : status === 'done' ? (
        <Check className="w-3.5 h-3.5 text-green-400" />
      ) : (
        <Share2 className="w-3.5 h-3.5" />
      )}
      {status === 'loading' ? 'Generando...' : status === 'error' ? 'Error' : status === 'done' ? 'Listo' : label}
    </button>
  )
}
