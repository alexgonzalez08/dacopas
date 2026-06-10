'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MessageCircle, X, Send, Loader2, Flag, Smile } from 'lucide-react'
import ReportModal from '@/components/report-modal'
import UserAvatar from '@/components/user-avatar'
import { format, isToday, isYesterday } from 'date-fns'
import { es } from 'date-fns/locale'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false })

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
  const [showEmoji, setShowEmoji] = useState(false)
  const [dragY, setDragY] = useState(0)
  const touchStartY = useRef(0)
  const dragging = useRef(false)

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

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch(`/api/leagues/chat?leagueId=${leagueId}`)
      .then(r => r.json())
      .then(({ messages: msgs }) => {
        setMessages(msgs ?? [])
        setUnread(0)
        setTimeout(() => scrollToBottom('instant'), 50)
        fetch('/api/leagues/chat/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leagueId }),
        })
      })
      .finally(() => setLoading(false))
  }, [open, leagueId, scrollToBottom])

  useEffect(() => {
    const channel = supabase
      .channel(`league-chat-${leagueId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'league_chat_messages', filter: `league_id=eq.${leagueId}` },
        async (payload) => {
          const row = payload.new as any
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', row.user_id)
            .single()
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
    setShowEmoji(false)

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
        setMessages(prev => prev.map(m => m.id === tempId ? message : m))
      }
    } catch {
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
    setShowEmoji(false)
  }

  return (
    <>
      {/* Botón fijo inferior derecha */}
      <button
        onClick={handleOpen}
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 5rem)' }}
        className="fixed right-4 z-40 flex items-center gap-2 px-5 py-3.5 md:gap-3 md:px-7 md:py-4 md:text-base md:rounded-2xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold rounded-xl shadow-lg transition"
        aria-label="Abrir chat del torneo"
      >
        <img src="/chat-icon.png" alt="Chat" className="w-7 h-7 object-contain md:w-8 md:h-8" />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-40" onClick={handleClose} />
      )}

      {/* Bottom sheet */}
      <div
        className={`fixed bottom-0 z-50 flex flex-col bg-slate-900 border border-slate-700 border-b-0 rounded-t-2xl shadow-2xl
          left-2 right-2 md:left-auto md:right-4 md:w-80
          ${open ? 'translate-y-0' : 'translate-y-full'}`}
        style={{
          maxHeight: '100dvh',
          height: open ? '100dvh' : 'auto',
          transform: open ? `translateY(${dragY}px)` : 'translateY(100%)',
          transition: dragging.current ? 'none' : 'transform 0.3s ease',
        }}
        onTouchStart={e => {
          touchStartY.current = e.touches[0].clientY
          dragging.current = true
        }}
        onTouchMove={e => {
          const delta = e.touches[0].clientY - touchStartY.current
          if (delta > 0) setDragY(delta)
        }}
        onTouchEnd={() => {
          dragging.current = false
          if (dragY > 80) {
            setDragY(0)
            handleClose()
          } else {
            setDragY(0)
          }
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2 pb-1 shrink-0 md:hidden">
          <div className="w-10 h-1 rounded-full bg-slate-600" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-yellow-400" />
            <span className="font-semibold text-sm">Mesa de Discusión</span>
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

        {/* Emoji picker */}
        {showEmoji && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowEmoji(false)} />
            <div className="shrink-0 border-t border-slate-700 relative z-50">
              <EmojiPicker
                onEmojiClick={(e) => {
                  setInput(prev => prev + e.emoji)
                  inputRef.current?.focus()
                }}
                theme={'dark' as any}
                skinTonesDisabled
                searchDisabled
                height={220}
                width="100%"
                lazyLoadEmojis
              />
            </div>
          </>
        )}

        {/* Input */}
        <div className="shrink-0 px-3 py-3 border-t border-slate-700 flex items-center gap-2">
          <button
            onClick={() => setShowEmoji(v => !v)}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition shrink-0 ${showEmoji ? 'bg-yellow-500 text-slate-900' : 'bg-slate-800 text-slate-400 hover:text-yellow-400'}`}
          >
            <Smile className="w-5 h-5" />
          </button>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="¿Qué opinás?"
            maxLength={500}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-yellow-500 transition"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="w-9 h-9 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-900 flex items-center justify-center transition disabled:opacity-40 shrink-0"
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
