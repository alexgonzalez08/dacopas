'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User, Shield, FileText, Trash2, Check, X, Eye, EyeOff, Loader2, ChevronRight, ShieldAlert } from 'lucide-react'
import Link from 'next/link'

type Section = 'perfil' | 'seguridad' | 'privacidad' | 'seguridad_datos' | 'administracion'

function PasswordStrength({ password }: { password: string }) {
  const rules = [
    { label: 'Mínimo 8 caracteres', ok: password.length >= 8 },
    { label: 'Al menos una mayúscula', ok: /[A-Z]/.test(password) },
    { label: 'Al menos un número', ok: /[0-9]/.test(password) },
  ]
  if (!password) return null
  return (
    <ul className="mt-2 space-y-1">
      {rules.map(r => (
        <li key={r.label} className={`flex items-center gap-1.5 text-xs ${r.ok ? 'text-green-400' : 'text-slate-500'}`}>
          {r.ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
          {r.label}
        </li>
      ))}
    </ul>
  )
}

function isPasswordValid(p: string) {
  return p.length >= 8 && /[A-Z]/.test(p) && /[0-9]/.test(p)
}

export default function AccountClient({
  userId,
  email,
  profile,
}: {
  userId: string
  email: string
  profile: { username: string; full_name: string | null; bio: string | null; avatar_url: string | null } | null
}) {
  const [section, setSection] = useState<Section | null>(null)
  const router = useRouter()

  // Seguridad
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)
  const [pwSuccess, setPwSuccess] = useState(false)
  const [pwError, setPwError] = useState('')

  // Eliminar cuenta
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (!isPasswordValid(newPassword)) { setPwError('La contraseña no cumple los requisitos.'); return }
    if (newPassword !== confirmPassword) { setPwError('Las contraseñas no coinciden.'); return }
    setPwLoading(true); setPwError(''); setPwSuccess(false)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) { setPwError(error.message); setPwLoading(false); return }
    setPwSuccess(true)
    setNewPassword(''); setConfirmPassword('')
    setPwLoading(false)
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== profile?.username) { setDeleteError('El alias no coincide.'); return }
    setDeleteLoading(true); setDeleteError('')
    const res = await fetch('/api/auth/delete-account', { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json()
      setDeleteError(data.error ?? 'Error al eliminar la cuenta.')
      setDeleteLoading(false)
      return
    }
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const SECTIONS = [
    { id: 'perfil' as Section, label: 'Mi Perfil', description: 'Editá tu nombre, alias y foto', icon: User, href: '/profile' },
    { id: 'seguridad' as Section, label: 'Contraseña y Seguridad', description: 'Cambiá tu contraseña', icon: Shield },
    { id: 'privacidad' as Section, label: 'Privacidad', description: 'Política de privacidad de Dacopas', icon: FileText, href: '/privacy' },
    { id: 'seguridad_datos' as Section, label: 'Seguridad y Datos', description: 'Cómo solicitamos eliminar tu cuenta y tus datos', icon: ShieldAlert, href: '/security' },
    { id: 'administracion' as Section, label: 'Administración de Cuenta', description: 'Eliminá tu cuenta permanentemente', icon: Trash2 },
  ]

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gestión de Cuenta</h1>
        <p className="text-sm text-slate-500 mt-1">{email}</p>
      </div>

      <div className="space-y-2">
        {SECTIONS.map(({ id, label, description, icon: Icon, href }) => (
          <div key={id}>
            {href ? (
              <Link
                href={href}
                className="w-full flex items-center gap-4 px-4 py-4 bg-slate-800 hover:bg-slate-700 rounded-xl transition"
              >
                <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-yellow-400" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-white">{label}</p>
                  <p className="text-xs text-slate-500">{description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </Link>
            ) : (
              <button
                onClick={() => setSection(section === id ? null : id)}
                className="w-full flex items-center gap-4 px-4 py-4 bg-slate-800 hover:bg-slate-700 rounded-xl transition"
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${id === 'administracion' ? 'bg-red-500/20' : 'bg-slate-700'}`}>
                  <Icon className={`w-4 h-4 ${id === 'administracion' ? 'text-red-400' : 'text-yellow-400'}`} />
                </div>
                <div className="flex-1 text-left">
                  <p className={`text-sm font-semibold ${id === 'administracion' ? 'text-red-400' : 'text-white'}`}>{label}</p>
                  <p className="text-xs text-slate-500">{description}</p>
                </div>
                <ChevronRight className={`w-4 h-4 text-slate-600 transition-transform ${section === id ? 'rotate-90' : ''}`} />
              </button>
            )}

            {/* Panel expandible — Contraseña */}
            {id === 'seguridad' && section === 'seguridad' && (
              <div className="mt-1 px-4 py-4 bg-slate-800/60 rounded-xl border border-slate-700 space-y-4">
                {pwSuccess && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2">
                    <p className="text-green-400 text-sm flex items-center gap-2"><Check className="w-4 h-4" /> Contraseña actualizada correctamente.</p>
                  </div>
                )}
                <form onSubmit={handleChangePassword} className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Nueva contraseña</label>
                    <div className="relative">
                      <input
                        type={showNew ? 'text' : 'password'}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Mín. 8 caracteres"
                        className="w-full px-3 py-2 pr-9 rounded-lg bg-slate-900 border border-slate-700 text-sm focus:outline-none focus:border-yellow-500 placeholder-slate-600"
                      />
                      <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                        {showNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <PasswordStrength password={newPassword} />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Confirmar contraseña</label>
                    <div className="relative">
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Repetí tu contraseña"
                        className="w-full px-3 py-2 pr-9 rounded-lg bg-slate-900 border border-slate-700 text-sm focus:outline-none focus:border-yellow-500 placeholder-slate-600"
                      />
                      <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                        {showConfirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    {confirmPassword && newPassword !== confirmPassword && (
                      <p className="text-xs text-red-400 mt-1 flex items-center gap-1"><X className="w-3 h-3" /> Las contraseñas no coinciden</p>
                    )}
                  </div>
                  {pwError && <p className="text-red-400 text-xs">{pwError}</p>}
                  <button
                    type="submit"
                    disabled={pwLoading || !isPasswordValid(newPassword) || newPassword !== confirmPassword}
                    className="w-full py-2 bg-yellow-500 text-slate-900 font-semibold rounded-lg text-sm hover:bg-yellow-400 disabled:opacity-50 transition flex items-center justify-center gap-2"
                  >
                    {pwLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Guardando...</> : 'Guardar contraseña'}
                  </button>
                </form>
              </div>
            )}

            {/* Panel expandible — Eliminar cuenta */}
            {id === 'administracion' && section === 'administracion' && (
              <div className="mt-1 px-4 py-4 bg-red-500/5 rounded-xl border border-red-500/20 space-y-3">
                <p className="text-sm text-slate-400">
                  Esta acción es <span className="text-red-400 font-semibold">permanente e irreversible</span>. Se eliminarán todos tus datos: perfil, pronósticos, torneos y mensajes.
                </p>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Escribí tu alias <span className="text-white font-mono">@{profile?.username}</span> para confirmar
                  </label>
                  <input
                    type="text"
                    value={deleteConfirm}
                    onChange={e => setDeleteConfirm(e.target.value)}
                    placeholder={profile?.username}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm focus:outline-none focus:border-red-500 placeholder-slate-600"
                  />
                </div>
                {deleteError && <p className="text-red-400 text-xs">{deleteError}</p>}
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading || deleteConfirm !== profile?.username}
                  className="w-full py-2 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg text-sm disabled:opacity-50 transition flex items-center justify-center gap-2"
                >
                  {deleteLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Eliminando...</> : 'Eliminar mi cuenta'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
