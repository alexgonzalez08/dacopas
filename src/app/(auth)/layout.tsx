import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-800 bg-slate-900/80 backdrop-blur-sm flex justify-center py-3">
        <Link href="/privacy" className="text-xs text-slate-500 hover:text-slate-300 transition">
          Privacidad
        </Link>
      </nav>
    </>
  )
}
