import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  createSupportTicket,
  fetchMySupportTickets,
  fetchSupportTicketThread,
  postSupportTicketMessage,
  CATEGORY_OPTIONS,
  CATEGORY_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  type MySupportTicketRow,
  type SupportTicketThread,
} from '../lib/supportApi'
import { useAuthStore } from '../store/authStore'

const btnPrimary =
  'rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50'
const cardMuted = 'rounded-xl border border-white/10 bg-[#141a28]'

export default function DriverSupportPage() {
  const token = useAuthStore((s) => s.token)

  const [list, setList] = useState<MySupportTicketRow[] | null>(null)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState(6)
  const [linkOrderId, setLinkOrderId] = useState('')
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
      const r = await createSupportTicket(token, {
        subject,
        body,
        category,
        orderId: Number.isFinite(oid) ? oid : undefined,
      })
      if (!r.ok) {
        setMsg(r.message)
        return
      }
      setSubject('')
      setBody('')
      setCategory(6)
      setLinkOrderId('')
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
      <section className={cardMuted + ' p-5'}>
        <p className="text-zinc-400">Duhet të jesh i kyçur.</p>
      </section>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-zinc-100">Mbështetja</h1>
        <Link to="/driver" className="text-xs text-sky-400 hover:text-sky-300">
          ← Paneli
        </Link>
      </div>

      <form onSubmit={(e) => void submit(e)} className={`${cardMuted} max-w-xl space-y-3 p-4`}>
        <p className="text-sm font-medium text-zinc-300">Hap një tiketë të re</p>
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
          Kategoria
          <select
            value={category}
            onChange={(e) => setCategory(Number(e.target.value))}
            className="mt-1 block w-full rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100"
          >
            {CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-zinc-500">
          Mesazhi
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            minLength={1}
            maxLength={4000}
            rows={4}
            className="mt-1 block w-full rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100"
          />
        </label>
        <label className="block text-xs text-zinc-500">
          ID porosie (opsional)
          <input
            value={linkOrderId}
            onChange={(e) => setLinkOrderId(e.target.value)}
            inputMode="numeric"
            placeholder="p.sh. numri i porosisë"
            className="mt-1 block w-full rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100"
          />
        </label>
        {msg ? <p className="text-sm text-amber-200/90">{msg}</p> : null}
        <button type="submit" disabled={busy} className={btnPrimary}>
          {busy ? 'Duke dërguar…' : 'Dërgo tiketën'}
        </button>
      </form>

      <div>
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
                <li key={t.id} className={`${cardMuted} p-3`}>
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => {
                      setExpandedId(open ? null : t.id)
                      setReplyDraft('')
                    }}
                  >
                    <p className="text-sm font-medium text-zinc-100">{t.subject}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[t.status] ?? ''}`}>
                        {STATUS_LABELS[t.status] ?? t.status}
                      </span>
                      <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${PRIORITY_COLORS[t.priority] ?? ''}`}>
                        {PRIORITY_LABELS[t.priority] ?? t.priority}
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {CATEGORY_LABELS[t.category] ?? 'Tjetër'}
                      </span>
                      <span className="text-[10px] text-zinc-600">
                        #{t.id} · {t.messageCount} mesazhe · {new Date(t.createdAtUtc).toLocaleString('sq-AL')}
                      </span>
                    </div>
                  </button>
                  {open ? (
                    <div className="mt-4 space-y-4 border-t border-white/10 pt-4">
                      {threadLoading ? (
                        <p className="text-sm text-zinc-500">Duke ngarkuar bisedën…</p>
                      ) : thread ? (
                        <>
                          {thread.orderNumber || thread.restaurantName ? (
                            <p className="text-xs text-zinc-500">
                              {thread.orderNumber ? <span>Porosi: {thread.orderNumber}</span> : null}
                              {thread.orderNumber && thread.restaurantName ? ' · ' : null}
                              {thread.restaurantName ? <span>Restorant: {thread.restaurantName}</span> : null}
                            </p>
                          ) : null}
                          <div className="rounded-lg border border-white/10 bg-zinc-950/50 p-3">
                            <p className="text-xs text-emerald-300/90">Mesazhi fillestar</p>
                            <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-200">{thread.initialBody}</p>
                          </div>
                          {thread.messages.map((m) => (
                            <div
                              key={m.id}
                              className={`rounded-lg border p-3 ${
                                m.isStaffReply
                                  ? 'border-emerald-500/30 bg-emerald-950/20'
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
                          {thread.status !== 3 ? (
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
                              <button type="submit" disabled={replyBusy} className={btnPrimary}>
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
    </div>
  )
}
