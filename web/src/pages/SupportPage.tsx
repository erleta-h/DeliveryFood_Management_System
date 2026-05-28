import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
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
  type SupportTicketMessageRow,
} from '../lib/supportApi'
import { customerBtnPrimary, customerCard, customerCardMuted } from '../lib/customerTheme'
import { useAuthStore } from '../store/authStore'
import { useCustomerNotificationsStore } from '../store/customerNotificationsStore'

function timeLabel(iso: string) {
  return new Date(iso).toLocaleString('sq-AL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function SupportPage() {
  const token = useAuthStore((s) => s.token)
  const [searchParams] = useSearchParams()
  const orderIdParam = searchParams.get('orderId')
  const restaurantIdParam = searchParams.get('restaurantId')
  const initialOrderId = orderIdParam && /^\d+$/.test(orderIdParam) ? Number(orderIdParam) : undefined
  const initialRestaurantId = restaurantIdParam && /^\d+$/.test(restaurantIdParam) ? Number(restaurantIdParam) : undefined

  const [list, setList] = useState<MySupportTicketRow[] | null>(null)
  const [activeId, setActiveId] = useState<number | null>(null)
  const [thread, setThread] = useState<SupportTicketThread | null>(null)
  const [threadLoading, setThreadLoading] = useState(false)
  const [replyDraft, setReplyDraft] = useState('')
  const [replyBusy, setReplyBusy] = useState(false)
  const [showNewForm, setShowNewForm] = useState(false)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState(6)
  const [linkOrderId, setLinkOrderId] = useState(initialOrderId != null ? String(initialOrderId) : '')
  const [linkRestaurantId, setLinkRestaurantId] = useState(initialRestaurantId != null ? String(initialRestaurantId) : '')
  const [formMsg, setFormMsg] = useState<string | null>(null)
  const [formBusy, setFormBusy] = useState(false)
  const [chatMsg, setChatMsg] = useState<string | null>(null)

  const setUnreadCount = useCustomerNotificationsStore((s) => s.setUnreadCount)
  const lastSupportMessage = useCustomerNotificationsStore((s) => s.lastSupportMessage)
  const clearLastSupportMessage = useCustomerNotificationsStore((s) => s.clearLastSupportMessage)

  const chatEndRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    if (!token) return
    const rows = await fetchMySupportTickets(token)
    setList(rows)
  }, [token])

  useEffect(() => {
    if (!token) return
    setUnreadCount(0)
    void load().catch(() => setList([]))
  }, [token, load, setUnreadCount])

  useEffect(() => {
    if (!token || activeId == null) { setThread(null); return }
    setThreadLoading(true)
    void fetchSupportTicketThread(token, activeId)
      .then((t) => setThread(t))
      .catch(() => setThread(null))
      .finally(() => setThreadLoading(false))
  }, [token, activeId])

  useEffect(() => {
    if (lastSupportMessage && thread && lastSupportMessage.ticketId === thread.id) {
      const exists = thread.messages.some((m) => m.body === lastSupportMessage.body && m.authorEmail === lastSupportMessage.authorEmail)
      if (!exists) {
        const newMsg: SupportTicketMessageRow = {
          id: lastSupportMessage.messageId || Date.now(),
          authorUserId: lastSupportMessage.authorUserId,
          authorEmail: lastSupportMessage.authorEmail,
          isStaffReply: lastSupportMessage.isStaffReply,
          body: lastSupportMessage.body,
          createdAtUtc: lastSupportMessage.createdAtUtc,
        }
        setThread((prev) => prev ? { ...prev, messages: [...prev.messages, newMsg] } : prev)
      }
      clearLastSupportMessage()
    } else if (lastSupportMessage) {
      void load().catch(() => {})
      clearLastSupportMessage()
    }
  }, [lastSupportMessage, thread, clearLastSupportMessage, load])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread?.messages.length])

  async function submitNew(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    setFormMsg(null)
    setFormBusy(true)
    try {
      const oid = linkOrderId.trim() ? Number(linkOrderId.trim()) : undefined
      const rid = linkRestaurantId.trim() ? Number(linkRestaurantId.trim()) : undefined
      const r = await createSupportTicket(token, {
        subject, body, category,
        orderId: Number.isFinite(oid) ? oid : undefined,
        restaurantId: Number.isFinite(rid) ? rid : undefined,
      })
      if (!r.ok) { setFormMsg(r.message); return }
      setSubject(''); setBody(''); setCategory(6); setLinkOrderId(''); setLinkRestaurantId('')
      setShowNewForm(false)
      await load()
      setActiveId(r.id)
    } catch (err: unknown) {
      setFormMsg(err instanceof Error ? err.message : 'Gabim.')
    } finally { setFormBusy(false) }
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault()
    if (!token || activeId == null || !replyDraft.trim()) return
    setReplyBusy(true)
    setChatMsg(null)
    try {
      const r = await postSupportTicketMessage(token, activeId, replyDraft.trim())
      if (!r.ok) { setChatMsg(r.message); return }
      setReplyDraft('')
      const t = await fetchSupportTicketThread(token, activeId)
      setThread(t)
      await load()
    } catch (err: unknown) {
      setChatMsg(err instanceof Error ? err.message : 'Gabim.')
    } finally { setReplyBusy(false) }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void sendReply(e as unknown as React.FormEvent)
    }
  }

  if (!token) {
    return (
      <section className={customerCard}>
        <p className="text-zinc-400">Duhet të jesh i kyçur.</p>
      </section>
    )
  }

  const activeRow = list?.find((t) => t.id === activeId)

  return (
    <div className="flex h-[calc(100vh-90px)] gap-4 overflow-hidden">
      {/* ── Left: Ticket list ── */}
      <div className={`${activeId != null ? 'hidden md:flex' : 'flex'} w-full flex-col md:w-72 lg:w-80 shrink-0`}>
        <div className="flex items-center justify-between px-1 pb-3">
          <h1 className="text-lg font-bold text-zinc-100">Mbështetja</h1>
          <button type="button" onClick={() => { setShowNewForm(true); setActiveId(null) }}
            className="rounded-lg bg-violet-600/80 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-500">
            + Tiketë e re
          </button>
        </div>

        <div className="flex-1 space-y-1.5 overflow-y-auto pr-1 scrollbar-thin">
          {!list ? (
            <p className="py-8 text-center text-sm text-zinc-500">Duke ngarkuar…</p>
          ) : list.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">Nuk ka tiketa ende.</p>
          ) : list.map((t) => (
            <button key={t.id} type="button"
              onClick={() => { setActiveId(t.id); setShowNewForm(false) }}
              className={`w-full rounded-xl border p-3 text-left transition ${
                activeId === t.id
                  ? 'border-violet-500/40 bg-violet-500/10'
                  : 'border-white/[0.06] bg-[#1a1f2e]/50 hover:border-white/[0.12] hover:bg-[#1e2438]/60'
              }`}
            >
              <p className="truncate text-sm font-medium text-zinc-100">{t.subject}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className={`rounded-full border px-1.5 py-px text-[9px] font-semibold ${STATUS_COLORS[t.status] ?? ''}`}>
                  {STATUS_LABELS[t.status] ?? '?'}
                </span>
                <span className={`rounded-full border px-1.5 py-px text-[9px] font-semibold ${PRIORITY_COLORS[t.priority] ?? ''}`}>
                  {PRIORITY_LABELS[t.priority] ?? '?'}
                </span>
                <span className="text-[9px] text-zinc-500">{CATEGORY_LABELS[t.category] ?? 'Tjetër'}</span>
              </div>
              <p className="mt-1 text-[10px] text-zinc-600">
                #{t.id} · {t.messageCount} mesazhe · {timeLabel(t.createdAtUtc)}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Right: Chat / New form / Empty ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {showNewForm ? (
          /* ── New ticket form ── */
          <div className={`${customerCardMuted} flex flex-col gap-4 overflow-y-auto`}>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setShowNewForm(false)} className="text-zinc-500 hover:text-zinc-300 md:hidden">&larr;</button>
              <h2 className="text-base font-semibold text-zinc-100">Tiketë e re</h2>
            </div>
            <form onSubmit={(e) => void submitNew(e)} className="space-y-3">
              <input value={subject} onChange={(e) => setSubject(e.target.value)} required maxLength={200}
                placeholder="Titulli i problemit"
                className="w-full rounded-lg border border-white/10 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-violet-500/50" />
              <select value={category} onChange={(e) => setCategory(Number(e.target.value))}
                className="w-full rounded-lg border border-white/10 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 outline-none">
                {CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} required minLength={1} maxLength={4000} rows={4}
                placeholder="Përshkruaj problemin…"
                className="w-full rounded-lg border border-white/10 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-violet-500/50" />
              <div className="grid gap-3 sm:grid-cols-2">
                <input value={linkOrderId} onChange={(e) => setLinkOrderId(e.target.value)} inputMode="numeric"
                  placeholder="ID porosie (opsional)"
                  className="rounded-lg border border-white/10 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none" />
                <input value={linkRestaurantId} onChange={(e) => setLinkRestaurantId(e.target.value)} inputMode="numeric"
                  placeholder="ID restoranti (opsional)"
                  className="rounded-lg border border-white/10 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none" />
              </div>
              {formMsg && <p className="text-sm text-amber-200/90">{formMsg}</p>}
              <button type="submit" disabled={formBusy} className={customerBtnPrimary}>
                {formBusy ? 'Duke dërguar…' : 'Dërgo tiketën'}
              </button>
            </form>
          </div>
        ) : activeId == null ? (
          /* ── Empty state ── */
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10 text-2xl">💬</div>
            <p className="text-sm text-zinc-400">Zgjidh një tiketë nga lista ose hap një të re.</p>
          </div>
        ) : (
          /* ── Chat view ── */
          <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#171c28]/80">
            {/* Header */}
            <div className="shrink-0 border-b border-white/[0.08] px-4 py-3">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setActiveId(null)} className="text-zinc-500 hover:text-zinc-300 md:hidden">&larr;</button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-100">
                    {thread?.subject ?? activeRow?.subject ?? `Tiketa #${activeId}`}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {activeRow && (
                      <>
                        <span className={`rounded-full border px-2 py-px text-[10px] font-semibold ${STATUS_COLORS[activeRow.status] ?? ''}`}>
                          {STATUS_LABELS[activeRow.status] ?? '?'}
                        </span>
                        <span className={`rounded-full border px-2 py-px text-[10px] font-semibold ${PRIORITY_COLORS[activeRow.priority] ?? ''}`}>
                          {PRIORITY_LABELS[activeRow.priority] ?? '?'}
                        </span>
                        <span className="text-[10px] text-zinc-500">{CATEGORY_LABELS[activeRow.category] ?? 'Tjetër'}</span>
                      </>
                    )}
                    {thread?.orderNumber && <span className="text-[10px] text-zinc-500">Porosi: {thread.orderNumber}</span>}
                    {thread?.restaurantName && <span className="text-[10px] text-zinc-500">Restorant: {thread.restaurantName}</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-thin">
              {threadLoading ? (
                <p className="py-12 text-center text-sm text-zinc-500">Duke ngarkuar bisedën…</p>
              ) : thread ? (
                <>
                  {/* Initial message (always from customer) */}
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-2xl rounded-bl-md border border-white/[0.08] bg-[#1e2438] px-3.5 py-2.5">
                      <p className="whitespace-pre-wrap text-sm text-zinc-200">{thread.initialBody}</p>
                      <p className="mt-1 text-right text-[10px] text-zinc-500">{timeLabel(thread.createdAtUtc)}</p>
                    </div>
                  </div>

                  {thread.messages.map((m) => (
                    <div key={m.id} className={`flex ${m.isStaffReply ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                        m.isStaffReply
                          ? 'rounded-br-md border border-violet-500/25 bg-violet-950/40'
                          : 'rounded-bl-md border border-white/[0.08] bg-[#1e2438]'
                      }`}>
                        {m.isStaffReply && (
                          <p className="mb-0.5 text-[10px] font-medium text-violet-300/80">Support</p>
                        )}
                        <p className="whitespace-pre-wrap text-sm text-zinc-200">{m.body}</p>
                        <p className={`mt-1 text-[10px] ${m.isStaffReply ? 'text-left text-violet-400/50' : 'text-right text-zinc-500'}`}>
                          {timeLabel(m.createdAtUtc)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </>
              ) : (
                <p className="py-12 text-center text-sm text-zinc-500">Nuk u gjet biseda.</p>
              )}
            </div>

            {/* Input bar */}
            {thread && thread.status !== 3 ? (
              <div className="shrink-0 border-t border-white/[0.08] p-3">
                {chatMsg && <p className="mb-2 text-xs text-amber-300">{chatMsg}</p>}
                <form onSubmit={(e) => void sendReply(e)} className="flex items-end gap-2">
                  <textarea
                    value={replyDraft}
                    onChange={(e) => setReplyDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    maxLength={4000}
                    placeholder="Shkruaj përgjigje…"
                    className="flex-1 resize-none rounded-xl border border-white/10 bg-[#141928] px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-violet-500/40"
                  />
                  <button type="submit" disabled={replyBusy || !replyDraft.trim()}
                    className="shrink-0 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-40">
                    {replyBusy ? '…' : 'Dërgo'}
                  </button>
                </form>
                <p className="mt-2 text-[10px] text-zinc-600 text-center">Support-i zakonisht përgjigjet brenda disa minutave</p>
              </div>
            ) : thread?.status === 3 ? (
              <div className="shrink-0 border-t border-white/[0.08] px-4 py-3 text-center text-sm text-zinc-500">
                Tiketa është e mbyllur — nuk mund të dërgosh mesazhe.
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
