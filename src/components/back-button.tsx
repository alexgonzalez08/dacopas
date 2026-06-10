'use client'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export default function BackButton() {
  const router = useRouter()
  return (
    <button
      onClick={() => router.back()}
      className="fixed top-4 left-4 flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition z-10"
      style={{ top: 'max(1rem, env(safe-area-inset-top))' }}
    >
      <ArrowLeft className="w-4 h-4" />
      Volver
    </button>
  )
}
