'use client'
import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

export default function AuthCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const code = searchParams.get('code')
    if (!code) {
      router.replace('/login')
      return
    }

    const supabase = createClient()
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        router.replace('/login?error=link_expired')
        return
      }
      router.replace('/reset-password')
    })
  }, [])

  return (
    <main className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-yellow-400" />
    </main>
  )
}
