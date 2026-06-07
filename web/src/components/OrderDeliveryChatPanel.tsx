import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchDeliveryChatMessages,
  normalizeDeliveryChatMessage,
  postDeliveryChatMessage,
  markChatSeen,
  upsertDeliveryChatMessage,
  type DeliveryChatMessage,
} from '../lib/deliveryChatApi'
import { createOrdersHubConnection, startOrdersHub } from '../lib/orderHub'

function formatTime(utc: string): string {
  return new Date(utc).toLocaleTimeString('sq-AL', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

type Props = {
  token: string
  orderId: number
  allowPost: boolean
  compact?: boolean
  useOwnHubConnection?: boolean
  refreshSignal?: number
}

export function OrderDeliveryChatPanel({
  token,
  orderId,
  allowPost,
  compact: _compact,
  useOwnHubConnection = true,
  refreshSignal = 0,
}: Props) {
  const [items, setItems] = useState<DeliveryChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [pendingId, setPendingId] = useState<number | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const list = await fetchDeliveryChatMessages(token, orderId)
      setItems(list)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Chat nuk u ngarkua.')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [token, orderId])

  const loadSilent = useCallback(async () => {
    try {
      const list = await fetchDeliveryChatMessages(token, orderId)
      setItems(list)
    } catch { /* silent */ }
  }, [token, orderId])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (refreshSignal <= 0) return
    void loadSilent()
  }, [refreshSignal, loadSilent])

  useEffect(() => {
    if (!useOwnHubConnection) return
    const conn = createOrdersHubConnection(token)
    conn.on('deliveryChatMessage', (raw: unknown) => {
      const msg = normalizeDeliveryChatMessage(raw)
      if (!msg || msg.orderId !== orderId) return
      setItems((prev) => upsertDeliveryChatMessage(prev, msg))
    })
    conn.on('deliveryChatSeen', (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return
      const r = raw as Record<string, unknown>
      const oid = Number(r.orderId ?? r.OrderId)
      if (oid !== orderId) return
      const seenAt = String(r.seenAtUtc ?? r.SeenAtUtc ?? new Date().toISOString())
      setItems((prev) => prev.map((m) => m.senderRole === 'customer' && !m.seenAtUtc ? { ...m, seenAtUtc: seenAt } : m))
    })
    let cancelled = false
    ;(async () => {
      try {
        await startOrdersHub(conn, [{ kind: 'order', orderId }])
      } catch (err) {
        console.warn('[Chat] SignalR nuk u lidh — përdoret polling çdo 12s.', err)
      }
      if (cancelled) return
    })()
    return () => {
      cancelled = true
      void conn.stop()
    }
  }, [token, orderId, useOwnHubConnection])

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      void loadSilent()
    }, 12_000)
    return () => window.clearInterval(id)
  }, [loadSilent])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [items.length])

  useEffect(() => {
    if (!items.length) return
    const unread = items.filter((m) => m.senderRole !== 'customer' && !m.seenAtUtc)
    if (unread.length > 0) {
      const now = new Date().toISOString()
      setItems((prev) => prev.map((m) => m.senderRole !== 'customer' && !m.seenAtUtc ? { ...m, seenAtUtc: now } : m))
      void markChatSeen(token, orderId).catch(() => {})
    }
  }, [items.length, token, orderId])

  async function onSend(e: React.FormEvent) {
    e.preventDefault()
    const t = draft.trim()
    if (!t || !allowPost || sending) return
    const tempId = -Date.now()
    const optimistic: DeliveryChatMessage = { id: tempId, orderId, senderUserId: 0, senderRole: 'customer', body: t, createdAtUtc: new Date().toISOString(), isDelivered: false, seenAtUtc: null }
    setItems((prev) => [...prev, optimistic])
    setPendingId(tempId)
    setDraft('')
    setSending(true)
    setError(null)
    const r = await postDeliveryChatMessage(token, orderId, t)
    setSending(false)
    setPendingId(null)
    if (!r.ok) {
      setItems((prev) => prev.filter((x) => x.id !== tempId))
      setError(r.message)
      return
    }
    setItems((prev) => upsertDeliveryChatMessage(prev, r.message, tempId))
    inputRef.current?.focus()
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#0b1120]" style={{ height: '420px' }}>
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-white/[0.08] bg-[#111827] px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/15">
          <svg className="h-5 w-5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-100">Chat me driverin</p>
          <p className="text-xs text-zinc-500">Mesazhet ruhen deri sa porosia të dorëzohet.</p>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
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

        {!loading && items.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-sm text-zinc-500">Nuk ka mesazhe ende.</p>
            <p className="mt-1 text-xs text-zinc-600">Shkruaj për të filluar bisedën me driverin.</p>
          </div>
        )}

        <div className="space-y-3">
          {items.map((msg) => {
            const isMe = msg.senderRole === 'customer'
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                  isMe
                    ? 'rounded-br-md bg-emerald-600 text-white'
                    : 'rounded-bl-md bg-[#1e293b] text-zinc-100'
                }`}>
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{msg.body}</p>
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
      {allowPost ? (
        <form onSubmit={(e) => void onSend(e)} className="flex shrink-0 items-end gap-2 border-t border-white/[0.08] bg-[#111827] px-4 py-3">
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
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </form>
      ) : (
        <div className="shrink-0 border-t border-white/[0.08] bg-[#111827] px-4 py-3 text-center">
          <p className="text-xs text-zinc-500">Biseda është e mbyllur — porosia u dorëzua ose u anulua.</p>
        </div>
      )}
    </div>
  )
}
