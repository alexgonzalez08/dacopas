'use client'
import { useState, useEffect } from 'react'
import { FileText, Plus, ChevronLeft, Pencil, Check, X, Loader2, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import UserAvatar from '@/components/user-avatar'
import AgreementsInfoModal from '@/components/agreements-info-modal'
import UnsavedChangesGuard from '@/components/unsaved-changes-guard'

type Role = 'admin' | 'moderator' | 'participant'
type Member = {
  user_id: string
  role: Role
  profiles: { username: string; full_name: string | null; avatar_url: string | null } | null
}
type Vote = { id: string; user_id: string; status: 'pending' | 'accepted' | 'declined'; voted_at: string | null }
type Agreement = {
  id: string
  title: string
  content: string
  status: 'pending' | 'approved' | 'denied'
  created_by: string
  created_at: string
  updated_at: string
  votes: Vote[]
}

function StatusBadge({ status }: { status: Agreement['status'] }) {
  if (status === 'approved') return (
    <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-green-500/20 text-green-400 font-semibold border border-green-500/30">
      <Check className="w-3 h-3" /> Aprobado
    </span>
  )
  if (status === 'denied') return (
    <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 font-semibold border border-red-500/30">
      <X className="w-3 h-3" /> Denegado
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-orange-500/20 text-orange-400 font-semibold border border-orange-500/30">
      <Clock className="w-3 h-3" /> En Espera
    </span>
  )
}

function VoteStatusBadge({ status }: { status: Vote['status'] }) {
  if (status === 'accepted') return (
    <span className="inline-flex items-center gap-1 text-xs text-green-400 font-medium">
      <Check className="w-3 h-3" /> Aceptado
    </span>
  )
  if (status === 'declined') return (
    <span className="inline-flex items-center gap-1 text-xs text-red-400 font-medium">
      <X className="w-3 h-3" /> Denegado
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-xs text-orange-400 font-medium">
      <Clock className="w-3 h-3" /> En Espera
    </span>
  )
}

export default function LeagueAgreements({
  leagueId,
  userId,
  userRole,
  members,
  leagueName,
  leaguesInfoSeen = false,
}: {
  leagueId: string
  userId: string
  userRole: Role
  members: Member[]
  leagueName: string
  leaguesInfoSeen?: boolean
}) {
  const [agreements, setAgreements] = useState<Agreement[]>([])
  const [myVoteMap, setMyVoteMap] = useState<Map<string, Vote>>(new Map())
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Agreement | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Agreement | null>(null)
  const [formTitle, setFormTitle] = useState('')
  const [formContent, setFormContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [voting, setVoting] = useState<string | null>(null)
  const [formError, setFormError] = useState('')

  const isAdmin = userRole === 'admin'

  useEffect(() => {
    fetchAgreements()
  }, [leagueId])

  async function fetchAgreements() {
    const res = await fetch(`/api/leagues/agreements?leagueId=${leagueId}`)
    const json = await res.json()
    const data: Agreement[] = json.agreements ?? []
    setAgreements(data)
    setMyVoteMap(new Map(
      data.flatMap(a => {
        const v = a.votes.find(v => v.user_id === userId)
        return v ? [[a.id, v]] : []
      })
    ))
    setLoading(false)
  }

  function openCreate() {
    setEditing(null)
    setFormTitle('')
    setFormContent('')
    setFormError('')
    setShowForm(true)
  }

  function openEdit(a: Agreement) {
    setEditing(a)
    setFormTitle(a.title)
    setFormContent(a.content)
    setFormError('')
    setShowForm(true)
  }

  async function handleSave() {
    if (!formTitle.trim() || !formContent.trim()) { setFormError('Completá título y contenido'); return }
    setSaving(true)
    setFormError('')

    if (editing) {
      const res = await fetch(`/api/leagues/agreements/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: formTitle, content: formContent }),
      })
      const json = await res.json()
      if (!res.ok) { setFormError(json.error ?? 'Error al guardar'); setSaving(false); return }
      setAgreements(prev => prev.map(a => {
        if (a.id !== editing.id) return a
        return { ...a, ...json.agreement, votes: a.votes.map(v => ({ ...v, status: 'pending' as const, voted_at: null })) }
      }))
      if (selected?.id === editing.id) {
        setSelected(s => s ? { ...s, ...json.agreement, votes: s.votes.map(v => ({ ...v, status: 'pending' as const, voted_at: null })) } : s)
      }
      setMyVoteMap(new Map())
    } else {
      const res = await fetch('/api/leagues/agreements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId, title: formTitle, content: formContent }),
      })
      const json = await res.json()
      if (!res.ok) { setFormError(json.error ?? 'Error al crear'); setSaving(false); return }
      setAgreements(prev => [{ ...json.agreement, votes: [] }, ...prev])
    }

    setShowForm(false)
    setSaving(false)
  }

  async function handleVote(agreementId: string, vote: 'accepted' | 'declined') {
    setVoting(vote + agreementId)
    const res = await fetch(`/api/leagues/agreements/${agreementId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vote }),
    })
    const json = await res.json()
    if (res.ok) {
      const newAgreementStatus = json.agreementStatus as Agreement['status']
      const now = new Date().toISOString()
      setMyVoteMap(prev => {
        const next = new Map(prev)
        const existing = next.get(agreementId)
        if (existing) next.set(agreementId, { ...existing, status: vote, voted_at: now })
        return next
      })
      setAgreements(prev => prev.map(a => {
        if (a.id !== agreementId) return a
        return {
          ...a,
          status: newAgreementStatus,
          votes: a.votes.map(v => v.user_id === userId ? { ...v, status: vote, voted_at: now } : v),
        }
      }))
      if (selected?.id === agreementId) {
        setSelected(s => s ? {
          ...s,
          status: newAgreementStatus,
          votes: s.votes.map(v => v.user_id === userId ? { ...v, status: vote, voted_at: now } : v),
        } : s)
      }
    }
    setVoting(null)
  }

  const memberMap = new Map(members.map(m => [m.user_id, m]))
  const adminMember = members.find(m => m.user_id === userId && m.role === 'admin')
    || members.find(m => m.role === 'admin')

  // ——— MODAL FORMULARIO ———
  if (showForm) {
    const isDirty = editing
      ? formTitle !== editing.title || formContent !== editing.content
      : formTitle.trim().length > 0 || formContent.trim().length > 0

    return (
      <div className="space-y-4">
        <UnsavedChangesGuard isDirty={isDirty} id="agreement-form" />
        <div className="flex items-center gap-3">
          <button onClick={() => setShowForm(false)} className="p-1.5 text-slate-400 hover:text-white transition">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="font-semibold text-white">{editing ? 'Editar acuerdo' : 'Nuevo acuerdo'}</h2>
        </div>

        <div className="bg-slate-800 rounded-2xl p-5 space-y-4">
          <div>
            <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1.5 block">Título</label>
            <input
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              placeholder="Ej: Premio para el campeón"
              maxLength={120}
              className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-yellow-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1.5 block">Contrato</label>
            <p className="text-xs text-slate-500 mb-2">Escribí el acuerdo con todos los detalles. Todos los miembros deben aceptarlo.</p>
            <textarea
              value={formContent}
              onChange={e => setFormContent(e.target.value)}
              placeholder="Descripción completa del acuerdo..."
              rows={8}
              className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-yellow-500 resize-none"
            />
          </div>
          {formError && <p className="text-red-400 text-sm">{formError}</p>}
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !formTitle.trim() || !formContent.trim()}
          className="w-full flex items-center justify-center gap-2 py-3 bg-yellow-500 text-slate-900 font-semibold rounded-xl hover:bg-yellow-400 disabled:opacity-50 transition"
        >
          {saving
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <><FileText className="w-4 h-4" /> {editing ? 'Guardar cambios' : 'Enviar a miembros'}</>
          }
        </button>
      </div>
    )
  }

  // ——— DETALLE DE ACUERDO ———
  if (selected) {
    const myVote = myVoteMap.get(selected.id) ?? selected.votes.find(v => v.user_id === userId)
    const canVote = !isAdmin && myVote?.status === 'pending' && selected.status === 'pending'
    const canEdit = isAdmin && selected.status === 'denied' && selected.created_by === userId

    // Construir lista de participantes con su voto
    const adminOfLeague = members.find(m => m.role === 'admin')
    const nonAdminMembers = members.filter(m => m.user_id !== selected.created_by)

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelected(null)} className="p-1.5 text-slate-400 hover:text-white transition">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="font-semibold text-white flex-1 truncate">{selected.title}</h2>
          {canEdit && (
            <button onClick={() => openEdit(selected)} className="p-1.5 text-slate-400 hover:text-yellow-400 transition">
              <Pencil className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="bg-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <StatusBadge status={selected.status} />
            <p className="text-xs text-slate-500">
              {formatDistanceToNow(new Date(selected.created_at), { addSuffix: true, locale: es })}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2">Contrato</p>
            <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{selected.content}</p>
          </div>
        </div>

        {/* Miembros y sus votos */}
        <div className="bg-slate-800 rounded-2xl p-5 space-y-3">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Firmas</p>
          <div className="space-y-2">
            {/* Admin creador */}
            {adminOfLeague && (
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <UserAvatar
                    username={adminOfLeague.profiles?.username ?? ''}
                    fullName={adminOfLeague.profiles?.full_name ?? null}
                    avatarUrl={adminOfLeague.profiles?.avatar_url ?? null}
                    size="sm"
                    showName
                    linkable
                  />
                </div>
                <span className="text-xs text-yellow-400 font-medium shrink-0">Creador</span>
              </div>
            )}
            {/* Resto de miembros */}
            {nonAdminMembers.map(m => {
              const vote = selected.votes.find(v => v.user_id === m.user_id)
              return (
                <div key={m.user_id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <UserAvatar
                      username={m.profiles?.username ?? ''}
                      fullName={m.profiles?.full_name ?? null}
                      avatarUrl={m.profiles?.avatar_url ?? null}
                      size="sm"
                      showName
                      linkable
                    />
                  </div>
                  <VoteStatusBadge status={vote?.status ?? 'pending'} />
                </div>
              )
            })}
          </div>
        </div>

        {/* Botones de votación */}
        {canVote && (
          <div className="flex gap-3">
            <button
              onClick={() => handleVote(selected.id, 'accepted')}
              disabled={!!voting}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-400 disabled:opacity-50 transition"
            >
              {voting === 'accepted' + selected.id
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <><Check className="w-4 h-4" /> Aceptar</>}
            </button>
            <button
              onClick={() => handleVote(selected.id, 'declined')}
              disabled={!!voting}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-500/20 text-red-400 border border-red-500/30 font-semibold rounded-xl hover:bg-red-500/30 disabled:opacity-50 transition"
            >
              {voting === 'declined' + selected.id
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <><X className="w-4 h-4" /> Declinar</>}
            </button>
          </div>
        )}
      </div>
    )
  }

  // ——— LISTA DE ACUERDOS ———
  if (loading) return (
    <div className="flex justify-center py-12">
      <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
    </div>
  )

  // Acuerdos aprobados que el nuevo miembro no vivió (sin fila de voto)
  const approvedUnseen = !isAdmin
    ? agreements.filter(a => a.status === 'approved' && !a.votes.find(v => v.user_id === userId))
    : []

  return (
    <div className="space-y-4">
      {leaguesInfoSeen && <AgreementsInfoModal />}

      {approvedUnseen.length > 0 && (
        <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl px-4 py-3">
          <FileText className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-200 leading-snug">
            Este torneo tiene <span className="font-semibold">{approvedUnseen.length} acuerdo{approvedUnseen.length !== 1 ? 's' : ''} aprobado{approvedUnseen.length !== 1 ? 's' : ''}</span> anteriores a tu ingreso. Revisalos para estar al tanto de los compromisos del torneo.
          </p>
        </div>
      )}

      {isAdmin && (
        <button
          onClick={openCreate}
          className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-slate-600 rounded-xl text-sm text-slate-400 hover:text-white hover:border-slate-400 transition"
        >
          <Plus className="w-4 h-4" /> Nuevo acuerdo
        </button>
      )}

      {agreements.length === 0 ? (
        <div className="text-center py-10 text-slate-500">
          <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Sin acuerdos todavía.</p>
          {isAdmin && <p className="text-xs mt-1">Creá el primero para que los miembros lo firmen.</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {agreements.map(a => {
            const myVote = myVoteMap.get(a.id) ?? a.votes.find(v => v.user_id === userId)
            const accepted = a.votes.filter(v => v.status === 'accepted').length
            const total = a.votes.length
            const needsMyVote = !isAdmin && myVote?.status === 'pending' && a.status === 'pending'

            return (
              <button
                key={a.id}
                onClick={() => setSelected(a)}
                className="w-full text-left bg-slate-800 rounded-2xl p-4 hover:bg-slate-700/80 transition space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-medium text-white text-sm truncate">{a.title}</span>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">
                    {a.status === 'pending' ? `${accepted}/${total} aceptaron` : ''}
                    {a.status === 'approved' ? 'Todos aceptaron' : ''}
                    {a.status === 'denied' ? 'Alguien declinó' : ''}
                  </p>
                  {needsMyVote && (
                    <span className="text-xs text-yellow-400 font-semibold animate-pulse">Tu firma es requerida →</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
