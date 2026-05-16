import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchDeliveryChatMessages,
  normalizeDeliveryChatMessage,
  postDeliveryChatMessage,
  type DeliveryChatMessage,
} from '../lib/deliveryChatApi'
import { createOrdersHubConnection } from '../lib/orderHub'
import { customerBtnPrimary } from '../lib/customerTheme'

type Props = {
  token: string
  orderId: number
  /** False pas dorëzimit / kur API nuk lejon më shkrime. */
  allowPost: boolean
  /** Stil i shkurtër për panelin e driverit. */
  compact?: boolean
  /**
   * Kur `false`, prindëri (p.sh. OrderDetailPage) dëgjon `deliveryChatMessage` në të njëjtën lidhje hub
   * dhe rrit `refreshSignal` — shmang lidhjen e dytë SignalR që mund të dështojë heshtur.
   */
  useOwnHubConnection?: boolean
  /** Rritet nga prindëri kur vjen mesazh realtime — rifreskim i heshtur i listës. */
  refreshSignal?: number
}

export function OrderDeliveryChatPanel({
  token,
  orderId,
  allowPost,
  compact,
  useOwnHubConnection = true,
  refreshSignal = 0,
}: Props) {
  const [items, setItems] = useState<DeliveryChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

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
    } catch {
      /* rifreskim rezervë — mos mbishkruaj gabimin e ngarkimit fillestar */
    }
  }, [token, orderId])

  useEffect(() => {
    void load()
  }, [load])

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
      setItems((prev) => (prev.some((x) => x.id === msg.id) ? prev : [...prev, msg]))
    })
    let stopped = false
    ;(async () => {
      try {
        await conn.start()
        if (!stopped) await conn.invoke('JoinOrder', orderId)
      } catch {
        /* SignalR — dev */
      }
    })()
    return () => {
      stopped = true
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

  async function onSend(e: React.FormEvent) {
    e.preventDefault()
    const t = draft.trim()
    if (!t || !allowPost || sending) return
    setSending(true)
    setError(null)
    const r = await postDeliveryChatMessage(token, orderId, t)
    setSending(false)
    if (!r.ok) {
      setError(r.message)
      return
    }
    setDraft('')
    setItems((prev) => (prev.some((x) => x.id === r.message.id) ? prev : [...prev, r.message]))
  }

  const boxClass = compact
    ? 'rounded-lg border border-white/10 bg-zinc-950/60'
    : 'rounded-xl border border-white/10 bg-zinc-950/50'

  return (
    <div className={compact ? 'mt-4' : 'mt-4 space-y-2'}>
      <p className={`font-semibold uppercase tracking-wide text-zinc-500 ${compact ? 'text-[10px]' : 'text-xs'}`}>
        Chat me {compact ? 'klientin' : 'korrierin / klientin'}
      </p>
      <p className="text-[11px] text-zinc-600">
        Vetëm për këtë porosi. Mesazhet ruhen deri sa porosia të dorëzohet.
      </p>
      {error ? <p className="text-xs text-amber-200/90">{error}</p> : null}
      {loading ? <p className="text-xs text-zinc-500">Duke ngarkuar mesazhet…</p> : null}
      <div
        className={`${boxClass} max-h-48 overflow-y-auto px-2 py-2 ${compact ? 'text-xs' : 'text-sm'}`}
      >
        {items.length === 0 && !loading ? (
          <p className="text-zinc-500">Nuk ka mesazhe ende.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((m) => (
              <li
                key={m.id}
                className={`rounded-md px-2 py-1.5 ${
                  m.senderRole === 'driver'
                    ? 'ml-4 bg-emerald-500/15 text-emerald-100/95'
                    : 'mr-4 bg-sky-500/15 text-sky-100/95'
                }`}
              >
                <span className="text-[10px] uppercase text-zinc-500">
                  {m.senderRole === 'driver' ? 'Korrieri' : 'Klienti'} ·{' '}
                  {new Date(m.createdAtUtc).toLocaleTimeString('sq-AL', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <p className="whitespace-pre-wrap break-words text-zinc-200">{m.body}</p>
              </li>
            ))}
          </ul>
        )}
        <div ref={bottomRef} />
      </div>
      {allowPost ? (
        <form onSubmit={(e) => void onSend(e)} className="flex flex-wrap gap-2 pt-1">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={2000}
            placeholder="Shkruaj mesazh…"
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100"
          />
          <button type="submit" disabled={sending || !draft.trim()} className={customerBtnPrimary}>
            {sending ? '…' : 'Dërgo'}
          </button>
        </form>
      ) : (
        <p className="text-[11px] text-zinc-600">Dërgesa e mbyllur — vetëm lexim i mesazheve.</p>
      )}
    </div>
  )
}
