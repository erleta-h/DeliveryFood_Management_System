import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  fetchDeliveryChatMessages,
  normalizeDeliveryChatMessage,
  postDeliveryChatMessage,
  markChatSeen,
  type DeliveryChatMessage,
} from '../lib/deliveryChatApi'
import { createOrdersHubConnection } from '../lib/orderHub'
import { fetchDriverOrderDetail, DRIVER_LEG, type DriverOrderDetail } from '../lib/driverApi'
import { ORDER_STATUS_CANCELLED, ORDER_STATUS_DELIVERED } from '../lib/orderStatusLabels'
import { useAuthStore } from '../store/authStore'

function formatTime(utc: string): string {
  return new Date(utc).toLocaleTimeString('sq-AL', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function DriverChatPage() {
  const { orderId: orderIdParam } = useParams<{ orderId: string }>()
  const orderId = Number(orderIdParam)
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)

  const [order, setOrder] = useState<DriverOrderDetail | null>(null)
  const [messages, setMessages] = useState<DeliveryChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [pendingId, setPendingId] = useState<number | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const canPost =
    order != null &&
    order.orderStatus !== ORDER_STATUS_DELIVERED &&
    order.orderStatus !== ORDER_STATUS_CANCELLED &&
    order.driverLegStatus !== DRIVER_LEG.completed

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])


  const loadSilent = useCallback(async () => {
    if (!token || !orderId) return
    try {
      const list = await fetchDeliveryChatMessages(token, orderId)
      setMessages(list)
    } catch {
      /* silent fallback */
    }
  }, [token, orderId])

  useEffect(() => {
    if (!token || !orderId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([fetchDriverOrderDetail(token, orderId), fetchDeliveryChatMessages(token, orderId)])
      .then(([det, msgs]) => {
        if (cancelled) return
        setOrder(det)
        setMessages(msgs)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Gabim gjatë ngarkimit.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token, orderId])

  useEffect(() => {
    if (!token || !orderId) return
    const conn = createOrdersHubConnection(token)
    conn.on('deliveryChatMessage', (raw: unknown) => {
      const msg = normalizeDeliveryChatMessage(raw)
      if (!msg || msg.orderId !== orderId) return
      setMessages((prev) => (prev.some((x) => x.id === msg.id) ? prev : [...prev, msg]))
    })
    conn.on('deliveryChatSeen', (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return
      const r = raw as Record<string, unknown>
      const oid = Number(r.orderId ?? r.OrderId)
      if (oid !== orderId) return
      const seenAt = String(r.seenAtUtc ?? r.SeenAtUtc ?? new Date().toISOString())
      setMessages((prev) => prev.map((m) => m.senderRole === 'driver' && !m.seenAtUtc ? { ...m, seenAtUtc: seenAt } : m))
    })
    let stopped = false
    ;(async () => {
      try {
        await conn.start()
        if (!stopped) await conn.invoke('JoinOrder', orderId)
      } catch {
        /* SignalR fallback to polling */
      }
    })()
    return () => {
      stopped = true
      void conn.stop()
    }
  }, [token, orderId])

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      void loadSilent()
    }, 12_000)
    return () => window.clearInterval(id)
  }, [loadSilent])

  useEffect(() => {
    scrollToBottom()
  }, [messages.length, scrollToBottom])

  useEffect(() => {
    if (!token || !messages.length) return
    const unread = messages.filter((m) => m.senderRole !== 'driver' && !m.seenAtUtc)
    if (unread.length > 0) {
      const now = new Date().toISOString()
      setMessages((prev) => prev.map((m) => m.senderRole !== 'driver' && !m.seenAtUtc ? { ...m, seenAtUtc: now } : m))
      void markChatSeen(token, orderId).catch(() => {})
    }
  }, [messages.length, token, orderId])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const text = draft.trim()
    if (!text || !token || !canPost || sending) return
    const tempId = -Date.now()
    const optimistic: DeliveryChatMessage = { id: tempId, orderId, senderUserId: user?.id ?? 0, senderRole: 'driver', body: text, createdAtUtc: new Date().toISOString(), isDelivered: false, seenAtUtc: null }
    setMessages((prev) => [...prev, optimistic])
    setPendingId(tempId)
    setDraft('')
    setSending(true)
    setError(null)
    const r = await postDeliveryChatMessage(token, orderId, text)
    setSending(false)
    setPendingId(null)
    if (!r.ok) {
      setMessages((prev) => prev.filter((x) => x.id !== tempId))
      setError(r.message)
      return
    }
    setMessages((prev) => prev.map((x) => x.id === tempId ? r.message : x))
    inputRef.current?.focus()
  }

  const myUserId = user?.id ?? 0

  return (
    <div className="flex h-dvh flex-col bg-[#0b1120]">
      {/* Header */}
      <header className="flex shrink-0 items-center gap-3 border-b border-white/[0.08] bg-[#111827] px-4 py-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Kthehu mbrapa"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M19 12H5" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-100">Chat me klientin</p>
          {order && (
            <p className="truncate text-xs text-zinc-500">
              {order.customer.displayName} · {order.orderNumber}
            </p>
          )}
        </div>
      </header>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          </div>
        )}

        {error && (
          <p className="mb-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {error}
          </p>
        )}

        {!loading && messages.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-sm text-zinc-500">Nuk ka mesazhe ende.</p>
            <p className="mt-1 text-xs text-zinc-600">
              Shkruaj për të filluar bisedën me klientin.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {messages.map((msg) => {
            const isMe = msg.senderUserId === myUserId || msg.senderRole === 'driver'
            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                    isMe
                      ? 'rounded-br-md bg-emerald-600 text-white'
                      : 'rounded-bl-md bg-[#1e293b] text-zinc-100'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                    {msg.body}
                  </p>
                  <div className={`mt-1 flex items-center gap-1.5 ${isMe ? 'justify-end' : ''}`}>
                    <span className={`text-[10px] ${isMe ? 'text-emerald-200/60' : 'text-zinc-500'}`}>
                      {formatTime(msg.createdAtUtc)}
                    </span>
                    {isMe && (
                      <span className={`text-[10px] font-medium ${msg.seenAtUtc ? 'text-sky-400' : msg.id === pendingId ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        {msg.seenAtUtc ? 'Seen' : msg.id === pendingId ? 'Sending...' : 'Delivered'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      {canPost ? (
        <form
          onSubmit={(e) => void handleSend(e)}
          className="flex shrink-0 items-end gap-2 border-t border-white/[0.08] bg-[#111827] px-4 py-3"
        >
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={2000}
            placeholder="Shkruaj mesazh…"
            className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-[#1e293b] px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-colors focus:border-emerald-500/50"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white transition-colors hover:bg-emerald-500 disabled:opacity-40"
            aria-label="Dërgo"
          >
            {sending ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </form>
      ) : (
        <div className="shrink-0 border-t border-white/[0.08] bg-[#111827] px-4 py-3 text-center">
          <p className="text-xs text-zinc-500">
            Biseda është e mbyllur — porosia u dorëzua ose u anulua.
          </p>
        </div>
      )}
    </div>
  )
}
