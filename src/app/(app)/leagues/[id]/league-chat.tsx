'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MessageCircle, X, Send, Loader2, Flag } from 'lucide-react'
import ReportModal from '@/components/report-modal'
import UserAvatar from '@/components/user-avatar'
import { format, isToday, isYesterday } from 'date-fns'
import { es } from 'date-fns/locale'
import { useSearchParams } from 'next/navigation'

type Message = {
  id: string
  content: string
  created_at: string
  user_id: string
  profiles: { username: string; avatar_url: string | null } | null
}

function formatMsgTime(dateStr: string) {
  const d = new Date(dateStr)
  if (isToday(d)) return format(d, 'HH:mm')
  if (isYesterday(d)) return `ayer ${format(d, 'HH:mm')}`
  return format(d, 'd MMM HH:mm', { locale: es })
}

export default function LeagueChat({
  leagueId,
  userId,
  username,
  avatarUrl,
}: {
  leagueId: string
  userId: string
  username: string
  avatarUrl?: string | null
}) {
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(searchParams.get('chat') === 'open')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [unread, setUnread] = useState(0)
  const [reportMsgId, setReportMsgId] = useState<string | null>(null)

  // Cargar unread inicial desde el servidor
  useEffect(() => {
    if (open) return
    fetch('/api/leagues/chat/unread')
      .then(r => r.json())
      .then(({ counts }) => {
        const count = counts?.[leagueId] ?? 0
        setUnread(count)
      })
      .catch(() => {})
  }, [leagueId, open])
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior })
  }, [])

  // Cargar mensajes iniciales
  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch(`/api/leagues/chat?leagueId=${leagueId}`)
      .then(r => r.json())
      .then(({ messages: msgs }) => {
        setMessages(msgs ?? [])
        setUnread(0)
        setTimeout(() => scrollToBottom('instant'), 50)
        // Marcar como leído en servidor
        fetch('/api/leagues/chat/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leagueId }),
        })
      })
      .finally(() => setLoading(false))
  }, [open, leagueId, scrollToBottom])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`league-chat-${leagueId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'league_chat_messages', filter: `league_id=eq.${leagueId}` },
        async (payload) => {
          const row = payload.new as any
          // Traer perfil del emisor
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', row.user_id)
            .single()
          // Desencriptar via API (el content llega encriptado desde Supabase)
          let decryptedContent = row.content
          try {
            const res = await fetch(`/api/leagues/chat/decrypt`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ content: row.content }),
            })
            if (res.ok) {
              const { content } = await res.json()
              decryptedContent = content
            }
          } catch {}
          const msg: Message = { ...row, content: decryptedContent, profiles: profile }
          setMessages(prev => {
            // Evitar duplicados si el mensaje ya fue agregado optimistamente
            if (prev.some(m => m.id === msg.id)) return prev
            return [...prev, msg]
          })
          if (open) {
            setTimeout(() => scrollToBottom(), 50)
          } else if (row.user_id !== userId) {
            setUnread(n => n + 1)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [leagueId, userId, open, scrollToBottom, supabase])

  async function handleSend() {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    setInput('')

    // Optimistic insert
    const tempId = `tmp-${Date.now()}`
    const optimistic: Message = {
      id: tempId,
      content: text,
      created_at: new Date().toISOString(),
      user_id: userId,
      profiles: { username, avatar_url: avatarUrl ?? null },
    }
    setMessages(prev => [...prev, optimistic])
    setTimeout(() => scrollToBottom(), 50)

    try {
      const res = await fetch('/api/leagues/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId, content: text }),
      })
      const { message } = await res.json()
      if (message) {
        // Reemplazar optimistic con el real
        setMessages(prev => prev.map(m => m.id === tempId ? message : m))
      }
    } catch {
      // Revertir si falla
      setMessages(prev => prev.filter(m => m.id !== tempId))
      setInput(text)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  function handleOpen() {
    setOpen(true)
    setUnread(0)
    fetch('/api/leagues/chat/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leagueId }),
    })
  }

  function handleClose() {
    setOpen(false)
  }

  return (
    <>
      {/* Botón inline */}
      <button
        onClick={handleOpen}
        className="relative flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold rounded-xl shadow transition"
        aria-label="Abrir chat del torneo"
      >
        <img src="/chat-icon.png" alt="Chat" className="w-5 h-5 object-contain" />
        Chat
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Backdrop ligero */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={handleClose}
        />
      )}

      {/* Bottom sheet */}
      <div
        className={`fixed bottom-0 z-50 flex flex-col bg-slate-900 border border-slate-700 border-b-0 rounded-t-2xl shadow-2xl transition-transform duration-300
          left-2 right-2 md:left-auto md:right-4 md:w-80
          ${open ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ maxHeight: '50vh', height: open ? '50vh' : 'auto' }}
      >
        {/* Handle + header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-yellow-400" />
            <span className="font-semibold text-sm">Chat del torneo</span>
          </div>
          <button
            onClick={handleClose}
            className="w-7 h-7 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
            </div>
          ) : messages.length === 0 ? (
            <p className="text-center text-slate-500 text-sm py-8">
              Sin mensajes aún. ¡Sé el primero en escribir!
            </p>
          ) : (
            messages.map(msg => {
              const isOwn = msg.user_id === userId
              return (
                <div key={msg.id} className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                  {!isOwn && (
                    <UserAvatar
                      username={msg.profiles?.username ?? '?'}
                      avatarUrl={msg.profiles?.avatar_url}
                      size="sm"
                    />
                  )}
                  <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                    {!isOwn && (
                      <span className="text-xs text-slate-400 font-medium px-1">
                        {msg.profiles?.username ?? 'Usuario'}
                      </span>
                    )}
                    <div className="flex items-center gap-1.5">
                      <div className={`px-3 py-2 rounded-2xl text-sm leading-snug ${
                        isOwn
                          ? 'bg-yellow-500 text-slate-900 font-medium rounded-br-sm'
                          : 'bg-slate-700 text-white rounded-bl-sm'
                      }`}>
                        {msg.content}
                      </div>
                      {!isOwn && (
                        <button
                          onClick={() => setReportMsgId(msg.id)}
                          className="text-slate-600 hover:text-red-400 transition shrink-0"
                        >
                          <Flag className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 px-1">
                      {formatMsgTime(msg.created_at)}
                    </span>
                  </div>
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 px-4 py-3 border-t border-slate-700 flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="Escribí un mensaje..."
            maxLength={500}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-yellow-500 transition"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="w-10 h-10 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-900 flex items-center justify-center transition disabled:opacity-40 shrink-0"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>


      </div>
      {reportMsgId && (
        <ReportModal type="message" targetId={reportMsgId} onClose={() => setReportMsgId(null)} />
      )}
    </>
  )
}
