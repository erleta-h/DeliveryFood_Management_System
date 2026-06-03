import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  KitchenSupportThreadPanel,
  formatKitchenTicketId,
} from '../components/kitchen/support/KitchenSupportThreadPanel'
import { fetchKitchenContext } from '../lib/kitchenApi'
import {
  CATEGORY_OPTIONS,
  CATEGORY_LABELS,
  PRIORITY_OPTIONS,
  STATUS_COLORS,
  STATUS_LABELS,
  createSupportTicket,
  fetchMySupportTickets,
  fetchSupportTicketThread,
  postSupportTicketMessage,
  type MySupportTicketRow,
  type SupportTicketThread,
} from '../lib/supportApi'
import { ticketHasNewActivity } from '../lib/kitchenSupportRead'
import { useAuthStore } from '../store/authStore'
import { useKitchenNotificationsStore } from '../store/kitchenNotificationsStore'
import { SupportPhotoPicker } from '../components/support/SupportPhotoPicker'
import { uploadSupportAttachment, validateSupportPhotos } from '../lib/supportAttachments'

const cardClass = 'rounded-xl border border-violet-500/20 bg-[#161b22] ring-1 ring-[#21262d]'
const fieldClass =
  'w-full rounded-lg border border-[#30363d] bg-[#0d1117] px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500/50'

type StatusFilter = 'all' | 0 | 1 | 2 | 3

const FILTER_PILLS: { key: StatusFilter; label: string; activeClass: string }[] = [
  { key: 'all', label: 'Të gjitha', activeClass: 'bg-violet-600/30 text-violet-200 ring-violet-500/40' },
  { key: 0, label: 'Hapura', activeClass: 'bg-amber-500/20 text-amber-200 ring-amber-500/35' },
  { key: 1, label: 'Në shqyrtim', activeClass: 'bg-sky-500/20 text-sky-200 ring-sky-500/35' },
  { key: 2, label: 'Zgjidhura', activeClass: 'bg-emerald-500/20 text-emerald-200 ring-emerald-500/35' },
  { key: 3, label: 'Mbyllura', activeClass: 'bg-zinc-600/30 text-zinc-300 ring-zinc-500/35' },
]

function statusIconClass(status: number): string {
  switch (status) {
    case 0:
      return 'text-amber-400'
    case 1:
      return 'text-sky-400'
    case 2:
      return 'text-emerald-400'
    default:
      return 'text-zinc-500'
  }
}

export default function KitchenSupportPage() {
  const token = useAuthStore((s) => s.token)
  const [searchParams, setSearchParams] = useSearchParams()
  const unreadTicketIds = useKitchenNotificationsStore((s) => s.unreadTicketIds)
  const syncUnreadFromTicketList = useKitchenNotificationsStore((s) => s.syncUnreadFromTicketList)
  const markTicketRead = useKitchenNotificationsStore((s) => s.markTicketRead)
  const hydrateUnread = useKitchenNotificationsStore((s) => s.hydrateUnread)

  const [list, setList] = useState<MySupportTicketRow[] | null>(null)
  const [restaurantId, setRestaurantId] = useState<number | null>(null)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState(6)
  const [priority, setPriority] = useState(1)
  const [linkOrderId, setLinkOrderId] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const selectedId = useMemo(() => {
    const q = searchParams.get('ticket')
    if (!q) return null
    const n = parseInt(q, 10)
    return Number.isFinite(n) ? n : null
  }, [searchParams])

  const [thread, setThread] = useState<SupportTicketThread | null>(null)
  const [threadLoading, setThreadLoading] = useState(false)
  const [replyDraft, setReplyDraft] = useState('')
  const [replyBusy, setReplyBusy] = useState(false)
  const [createPhotos, setCreatePhotos] = useState<File[]>([])
  const [replyPhotos, setReplyPhotos] = useState<File[]>([])

  const load = useCallback(async () => {
    if (!token) return
    const rows = await fetchMySupportTickets(token)
    syncUnreadFromTicketList(rows)
    setList(rows)
  }, [token, syncUnreadFromTicketList])

  useEffect(() => {
    hydrateUnread()
  }, [hydrateUnread])

  useEffect(() => {
    if (!token) return
    void fetchKitchenContext(token).then((r) => {
      if (r.ok && r.context.restaurantId) setRestaurantId(r.context.restaurantId)
    })
    void load().catch(() => setList([]))
  }, [token, load])

  useEffect(() => {
    if (!token || selectedId == null) {
      setThread(null)
      return
    }
    setThreadLoading(true)
    void fetchSupportTicketThread(token, selectedId)
      .then((t) => setThread(t))
      .catch(() => setThread(null))
      .finally(() => setThreadLoading(false))
  }, [token, selectedId])

  useEffect(() => {
    if (!thread || selectedId == null) return
    const messageCount = 1 + thread.messages.length
    markTicketRead(selectedId, messageCount)
  }, [thread, selectedId, markTicketRead])

  const filteredList = useMemo(() => {
    if (!list) return null
    if (statusFilter === 'all') return list
    return list.filter((t) => t.status === statusFilter)
  }, [list, statusFilter])

  function openTicket(id: number) {
    setSearchParams({ ticket: String(id) })
    setReplyDraft('')
    setReplyPhotos([])
  }

  function closeTicket() {
    setSearchParams({})
    setThread(null)
    setReplyDraft('')
  }

  function clearForm() {
    setSubject('')
    setBody('')
    setCategory(6)
    setPriority(1)
    setLinkOrderId('')
    setCreatePhotos([])
    setMsg(null)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!token) return
    setMsg(null)
    setBusy(true)
    try {
      const orderRef = linkOrderId.trim()
      const oid = orderRef && /^\d+$/.test(orderRef) ? Number(orderRef) : undefined
      const orderNumber =
        orderRef && !/^\d+$/.test(orderRef) ? orderRef : undefined
      const payload: Parameters<typeof createSupportTicket>[1] = {
        subject: subject.trim(),
        body: body.trim(),
        category,
        priority,
      }
      if (oid !== undefined && Number.isFinite(oid)) payload.orderId = oid
      if (orderNumber) payload.orderNumber = orderNumber
      if (restaurantId != null) payload.restaurantId = restaurantId
      const photoErr = validateSupportPhotos(createPhotos)
      if (photoErr) {
        setMsg(photoErr)
        return
      }
      const r = await createSupportTicket(token, payload)
      if (!r.ok) {
        setMsg(r.message)
        return
      }
      for (const file of createPhotos) {
        const up = await uploadSupportAttachment(token, r.id, file)
        if (!up.ok) {
          setMsg(`Tiketa u krijua, por fotoja «${file.name}»: ${up.message}`)
          await load()
          openTicket(r.id)
          return
        }
      }
      clearForm()
      setMsg(`Tiketa ${formatKitchenTicketId(r.id)} u dërgua te supporti i platformës.`)
      await load()
      openTicket(r.id)
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Gabim.')
    } finally {
      setBusy(false)
    }
  }

  async function sendReply(e: FormEvent) {
    e.preventDefault()
    if (!token || selectedId == null) return
    setReplyBusy(true)
    setMsg(null)
    try {
      const photoErr = validateSupportPhotos(replyPhotos)
      if (photoErr) {
        setMsg(photoErr)
        return
      }
      const r = await postSupportTicketMessage(token, selectedId, replyDraft)
      if (!r.ok) {
        setMsg(r.message)
        return
      }
      if (r.messageId > 0) {
        for (const file of replyPhotos) {
          const up = await uploadSupportAttachment(token, selectedId, file, r.messageId)
          if (!up.ok) {
            setMsg(`Mesazhi u dërgua, por fotoja «${file.name}»: ${up.message}`)
            return
          }
        }
      }
      setReplyDraft('')
      setReplyPhotos([])
      const t = await fetchSupportTicketThread(token, selectedId)
      setThread(t)
      if (t) markTicketRead(selectedId, 1 + t.messages.length)
      await load()
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Gabim.')
    } finally {
      setReplyBusy(false)
    }
  }

  if (!token) {
    return (
      <section className={`${cardClass} p-5`}>
        <p className="text-zinc-400">Duhet të jesh i kyçur.</p>
      </section>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
            <path d="M3 11h3a2 2 0 0 0 2-2V6a7 7 0 0 1 14 0v3a2 2 0 0 0 2 2h1v2h-1a8 8 0 0 1-7 7v2H9v-2a8 8 0 0 1-7-7H3v-2z" />
          </svg>
        </span>
        <div>
          <h1 className="text-2xl font-bold text-white">Mbështetja</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Krijo një tiketë të re dhe ne do të ndihmojmë sa më shpejt.
          </p>
        </div>
      </div>

      {msg ? (
        <p className="rounded-lg border border-violet-500/25 bg-violet-500/10 px-3 py-2 text-sm text-violet-100">
          {msg}
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className={`${cardClass} p-5`}>
          <h2 className="text-sm font-semibold text-white">Krijo tiketë të re</h2>
          <form onSubmit={(e) => void submit(e)} className="mt-4 space-y-4">
            <label className="block text-xs font-medium text-zinc-500">
              Titulli i tiketës
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={200}
                required
                disabled={busy}
                className={`${fieldClass} mt-1.5`}
                placeholder="p.sh. Problem me pagesën"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-500">
              Lloji i problemit
              <select
                value={category}
                onChange={(e) => setCategory(Number(e.target.value))}
                disabled={busy}
                className={`${fieldClass} mt-1.5`}
              >
                {CATEGORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-zinc-500">
              Prioriteti
              <select
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                disabled={busy}
                className={`${fieldClass} mt-1.5`}
              >
                {PRIORITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
        <label className="block text-xs font-medium text-zinc-500">
          ID e porosisë (opsional)
          <input
            value={linkOrderId}
            onChange={(e) => setLinkOrderId(e.target.value)}
            disabled={busy}
            placeholder="FD-20260603-… ose ID numerik"
            className={`${fieldClass} mt-1.5 font-mono text-[13px]`}
          />
          <span className="mt-1 block text-[11px] text-zinc-600">
            Nëse numri është i gabuar, tiketa prapë dërgohet — porosia nuk lidhet.
          </span>
        </label>
            <label className="block text-xs font-medium text-zinc-500">
              Mesazhi
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
                minLength={1}
                maxLength={4000}
                rows={5}
                disabled={busy}
                className={`${fieldClass} mt-1.5 min-h-[7rem] resize-y`}
              />
            </label>
            <SupportPhotoPicker files={createPhotos} onChange={setCreatePhotos} disabled={busy} />
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="submit"
                disabled={busy || !subject.trim() || !body.trim()}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-45 sm:flex-none sm:px-6"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
                {busy ? 'Duke dërguar…' : 'Dërgo tiketën'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={clearForm}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#30363d] px-4 py-2.5 text-sm text-zinc-300 hover:bg-[#21262d]"
              >
                Pastro fushat
              </button>
            </div>
          </form>
        </section>

        <section className={`${cardClass} flex min-h-[420px] flex-col p-5`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-white">Tiketat e mia</h2>
            <button
              type="button"
              disabled={busy}
              onClick={() => void load()}
              className="rounded-lg border border-[#30363d] px-3 py-1.5 text-xs text-zinc-300 hover:bg-[#21262d]"
            >
              Rifresko
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {FILTER_PILLS.map((p) => {
              const active = statusFilter === p.key
              return (
                <button
                  key={String(p.key)}
                  type="button"
                  onClick={() => setStatusFilter(p.key)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 transition ${
                    active ? p.activeClass : 'text-zinc-500 ring-[#30363d] hover:text-zinc-300'
                  }`}
                >
                  {p.label}
                </button>
              )
            })}
          </div>
          <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto">
            {!filteredList ? (
              <p className="text-sm text-zinc-500">Duke ngarkuar…</p>
            ) : filteredList.length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-500">
                {statusFilter === 'all' ? 'Ende nuk ke tiketa.' : 'Nuk ka tiketa për këtë filtër.'}
              </p>
            ) : (
              filteredList.map((t) => {
                const selected = selectedId === t.id
                const hasNewReply = ticketHasNewActivity(t.id, t.messageCount, t.status, unreadTicketIds)
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => openTicket(t.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                      selected
                        ? 'border-violet-500/40 bg-violet-500/10'
                        : hasNewReply
                          ? 'border-violet-400/55 bg-violet-500/15 ring-1 ring-violet-400/30 hover:border-violet-400/70'
                          : 'border-[#30363d] bg-[#0d1117] hover:border-violet-500/25'
                    }`}
                  >
                    <span className={`shrink-0 ${statusIconClass(t.status)}`} aria-hidden>
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 8v4l2 2" />
                      </svg>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="block truncate text-sm font-medium text-white">{t.subject}</span>
                        {hasNewReply ? (
                          <span className="shrink-0 rounded-full bg-violet-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                            1
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-zinc-500">
                        {formatKitchenTicketId(t.id)}
                        {t.orderNumber ? ` · Porosia: ${t.orderNumber}` : ''}
                      </span>
                      <span className="mt-1.5 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[t.status] ?? ''}`}
                        >
                          {STATUS_LABELS[t.status] ?? t.status}
                        </span>
                        <span className="text-[10px] text-zinc-600">
                          {CATEGORY_LABELS[t.category] ?? 'Tjetër'}
                        </span>
                      </span>
                    </span>
                    <span className="hidden shrink-0 text-right text-[10px] text-zinc-500 sm:block">
                      {new Date(t.createdAtUtc).toLocaleString('sq-AL', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <svg className="h-4 w-4 shrink-0 text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                )
              })
            )}
          </div>
        </section>
      </div>

      <div className="flex gap-3 rounded-xl border border-violet-500/20 bg-violet-950/15 px-4 py-3.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-violet-300" aria-hidden>
          ?
        </span>
        <p className="text-[13px] leading-relaxed text-zinc-400">
          <span className="font-medium text-violet-200/90">Keni nevojë për ndihmë urgjente?</span> Për probleme
          kritike (pagesë, porosi e bllokuar), zgjidh prioritetin «Lartë» ose «Urgjent» dhe lidh numrin e porosisë.
          Ekipi i platformës përgjigjet në panelin e support-it.
        </p>
      </div>

      {selectedId != null ? (
      <KitchenSupportThreadPanel
        token={token}
        thread={thread}
        loading={threadLoading}
        busy={replyBusy}
        replyDraft={replyDraft}
        replyPhotos={replyPhotos}
        onReplyPhotosChange={setReplyPhotos}
        onReplyDraftChange={setReplyDraft}
        onClose={closeTicket}
        onSendReply={(e) => void sendReply(e)}
      />
      ) : null}
    </div>
  )
}
