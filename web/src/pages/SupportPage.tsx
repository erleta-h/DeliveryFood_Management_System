import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  createSupportTicket,
  fetchMySupportTickets,
  fetchSupportTicketThread,
  postSupportTicketMessage,
  type MySupportTicketRow,
  type SupportTicketThread,
} from '../lib/supportApi.ts'
import { customerBtnPrimary, customerCard, customerCardMuted, customerPanelSubtitle } from '../lib/customerTheme'
import { useAuthStore } from '../store/authStore'

const STATUS_SQ: Record<number, string> = {
  0: 'Hapur',
  1: 'Mbyllur',
}

export default function SupportPage() {
  const token = useAuthStore((s) => s.token)
  const [searchParams] = useSearchParams()
  const orderIdParam = searchParams.get('orderId')
  const restaurantIdParam = searchParams.get('restaurantId')
  const initialOrderId =
    orderIdParam && /^\d+$/.test(orderIdParam) ? Number(orderIdParam) : undefined
  const initialRestaurantId =
    restaurantIdParam && /^\d+$/.test(restaurantIdParam)
      ? Number(restaurantIdParam)
      : undefined

  const [list, setList] = useState<MySupportTicketRow[] | null>(null)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [linkOrderId, setLinkOrderId] = useState<string>(initialOrderId != null ? String(initialOrderId) : '')
  const [linkRestaurantId, setLinkRestaurantId] = useState<string>(
    initialRestaurantId != null ? String(initialRestaurantId) : '',
  )
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [thread, setThread] = useState<SupportTicketThread | null>(null)
  const [threadLoading, setThreadLoading] = useState(false)
  const [replyDraft, setReplyDraft] = useState('')
  const [replyBusy, setReplyBusy] = useState(false)

  const load = useCallback(async () => {
    if (!token) return
    const rows = await fetchMySupportTickets(token)
    setList(rows)
  }, [token])

  useEffect(() => {
    if (!token) return
    void load().catch(() => setList([]))
  }, [token, load])

  useEffect(() => {
    if (!token || expandedId == null) {
      setThread(null)
      return
    }
    setThreadLoading(true)
    void fetchSupportTicketThread(token, expandedId)
      .then((t) => setThread(t))
      .catch(() => setThread(null))
      .finally(() => setThreadLoading(false))
  }, [token, expandedId])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    setMsg(null)
    setBusy(true)
    try {
      const oid = linkOrderId.trim() ? Number(linkOrderId.trim()) : undefined
      const rid = linkRestaurantId.trim() ? Number(linkRestaurantId.trim()) : undefined
      const r = await createSupportTicket(token, {
        subject,
        body,
        orderId: Number.isFinite(oid) ? oid : undefined,
        restaurantId: Number.isFinite(rid) ? rid : undefined,
      })
      if (!r.ok) {
        setMsg(r.message)
        return
      }
      setSubject('')
      setBody('')
      setMsg(`Tiketa #${r.id} u dërgua.`)
      await load()
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Gabim.')
    } finally {
      setBusy(false)
    }
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault()
    if (!token || expandedId == null) return
    setReplyBusy(true)
    setMsg(null)
    try {
      const r = await postSupportTicketMessage(token, expandedId, replyDraft)
      if (!r.ok) {
        setMsg(r.message)
        return
      }
      setReplyDraft('')
      const t = await fetchSupportTicketThread(token, expandedId)
      setThread(t)
      await load()
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Gabim.')
    } finally {
      setReplyBusy(false)
    }
  }

  if (!token) {
    return (
      <section className={customerCard}>
        <p className="text-zinc-400">Duhet të jesh i kyçur.</p>
      </section>
    )
  }

  return (
    <section className={customerCard}>
      <h1 className="text-2xl font-bold text-zinc-100">Support & ankesa</h1>
      <p className={customerPanelSubtitle}>
        Hap një tiketë për probleme me porosi ose aplikacionin. Stafi i supportit përgjigjet në të njëjtin thread.
      </p>

      <form onSubmit={(e) => void submit(e)} className={`${customerCardMuted} mt-6 max-w-xl space-y-3 p-4`}>
        <label className="block text-xs text-zinc-500">
          Titulli
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={200}
            required
            className="mt-1 block w-full rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100"
          />
        </label>
        <label className="block text-xs text-zinc-500">
          Mesazhi
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            minLength={1}
            maxLength={4000}
            rows={5}
            className="mt-1 block w-full rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs text-zinc-500">
            ID porosie (opsional)
            <input
              value={linkOrderId}
              onChange={(e) => setLinkOrderId(e.target.value)}
              inputMode="numeric"
              placeholder="p.sh. nga «Porositë e mia»"
              className="mt-1 block w-full rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100"
            />
          </label>
          <label className="block text-xs text-zinc-500">
            ID restoranti (opsional)
            <input
              value={linkRestaurantId}
              onChange={(e) => setLinkRestaurantId(e.target.value)}
              inputMode="numeric"
              className="mt-1 block w-full rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100"
            />
          </label>
        </div>
        {msg ? <p className="text-sm text-amber-200/90">{msg}</p> : null}
        <button type="submit" disabled={busy} className={customerBtnPrimary}>
          {busy ? 'Duke dërguar…' : 'Dërgo tiketën'}
        </button>
      </form>

      <div className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Tiketat e mia</h2>
        {!list ? (
          <p className="mt-3 text-sm text-zinc-500">Duke ngarkuar…</p>
        ) : list.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">Ende nuk ke tiketa.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {list.map((t) => {
              const open = expandedId === t.id
              return (
                <li key={t.id} className={`${customerCardMuted} p-3`}>
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => {
                      setExpandedId(open ? null : t.id)
                      setReplyDraft('')
                    }}
                  >
                    <p className="text-sm font-medium text-zinc-100">{t.subject}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      #{t.id} · {STATUS_SQ[t.status] ?? t.status} · {t.messageCount} mesazhe ·{' '}
                      {new Date(t.createdAtUtc).toLocaleString('sq-AL')}
                    </p>
                  </button>
                  {open ? (
                    <div className="mt-4 space-y-4 border-t border-white/10 pt-4">
                      {threadLoading ? (
                        <p className="text-sm text-zinc-500">Duke ngarkuar bisedën…</p>
                      ) : thread ? (
                        <>
                          {thread.orderNumber || thread.restaurantName ? (
                            <p className="text-xs text-zinc-500">
                              {thread.orderNumber ? (
                                <span>Porosi: {thread.orderNumber}</span>
                              ) : null}
                              {thread.orderNumber && thread.restaurantName ? ' · ' : null}
                              {thread.restaurantName ? (
                                <span>Restorant: {thread.restaurantName}</span>
                              ) : null}
                            </p>
                          ) : null}
                          <div className="rounded-lg border border-white/10 bg-zinc-950/50 p-3">
                            <p className="text-xs text-violet-300/90">Mesazhi fillestar</p>
                            <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-200">{thread.initialBody}</p>
                          </div>
                          {thread.messages.map((m) => (
                            <div
                              key={m.id}
                              className={`rounded-lg border p-3 ${
                                m.isStaffReply
                                  ? 'border-violet-500/30 bg-violet-950/20'
                                  : 'border-white/10 bg-zinc-950/40'
                              }`}
                            >
                              <p className="text-xs text-zinc-500">
                                {m.isStaffReply ? 'Support' : 'Ti'} · {m.authorEmail} ·{' '}
                                {new Date(m.createdAtUtc).toLocaleString('sq-AL')}
                              </p>
                              <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-200">{m.body}</p>
                            </div>
                          ))}
                          {thread.status === 0 ? (
                            <form onSubmit={(e) => void sendReply(e)} className="space-y-2">
                              <label className="block text-xs text-zinc-500">
                                Shto përgjigje
                                <textarea
                                  value={replyDraft}
                                  onChange={(e) => setReplyDraft(e.target.value)}
                                  required
                                  minLength={1}
                                  maxLength={4000}
                                  rows={3}
                                  className="mt-1 block w-full rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100"
                                />
                              </label>
                              <button type="submit" disabled={replyBusy} className={customerBtnPrimary}>
                                {replyBusy ? 'Duke dërguar…' : 'Dërgo'}
                              </button>
                            </form>
                          ) : (
                            <p className="text-sm text-zinc-500">Tiketa është e mbyllur — nuk mund të shtosh mesazhe.</p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-zinc-500">Nuk u gjet thread-i.</p>
                      )}
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
