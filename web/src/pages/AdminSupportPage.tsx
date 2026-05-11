import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchAdminAudit,
  fetchAdminSupportTickets,
  fetchAdminSupportTicketThread,
  patchAdminSupportTicket,
  postAdminSupportTicketMessage,
  type AdminAuditListResult,
  type AdminSupportTicketRow,
  type AdminSupportTicketThread,
} from '../lib/adminApi'
import { ADMIN_SECTIONS } from '../lib/adminNav'
import { hasAdminRole, hasPermission } from '../lib/jwtRoles'
import { customerBtnGhost, customerBtnPrimary, customerCardMuted } from '../lib/customerTheme'
import { useAuthStore } from '../store/authStore'

const TICKET_STATUS_SQ: Record<number, string> = {
  0: 'Hapur',
  1: 'Mbyllur',
}

export default function AdminSupportPage() {
  const token = useAuthStore((s) => s.token)
  const def = ADMIN_SECTIONS.support
  const [audit, setAudit] = useState<AdminAuditListResult | null>(null)
  const [tickets, setTickets] = useState<AdminSupportTicketRow[] | null>(null)
  const [ticketPage, setTicketPage] = useState(1)
  const [ticketTotal, setTicketTotal] = useState(0)
  const [ticketPs, setTicketPs] = useState(25)
  const [ticketSearch, setTicketSearch] = useState('')
  const [appliedTicketSearch, setAppliedTicketSearch] = useState('')
  const [ticketSort, setTicketSort] = useState('created_desc')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [thread, setThread] = useState<AdminSupportTicketThread | null>(null)
  const [threadLoading, setThreadLoading] = useState(false)
  const [staffReplyDraft, setStaffReplyDraft] = useState<Record<number, string>>({})
  const [ticketMsg, setTicketMsg] = useState<string | null>(null)

  const canSeeAudit = token != null && (hasAdminRole(token) || hasPermission(token, 'admin.audit'))
  const canLinkUsers =
    token != null && (hasAdminRole(token) || hasPermission(token, 'admin.customers'))
  const canLinkOrders =
    token != null && (hasAdminRole(token) || hasPermission(token, 'admin.orders'))
  const canLinkSecurity =
    token != null && (hasAdminRole(token) || hasPermission(token, 'admin.audit'))

  const loadTickets = useCallback(async () => {
    if (!token) return
    const d = await fetchAdminSupportTickets(token, {
      search: appliedTicketSearch || undefined,
      sort: ticketSort,
      page: ticketPage,
      pageSize: 25,
    })
    setTickets(d.items)
    setTicketTotal(d.total)
    setTicketPs(d.pageSize)
  }, [token, ticketPage, appliedTicketSearch, ticketSort])

  useEffect(() => {
    if (!token || !canSeeAudit) {
      setAudit(null)
      return
    }
    void fetchAdminAudit(token, { page: 1, pageSize: 12 }).then(setAudit)
  }, [token, canSeeAudit])

  useEffect(() => {
    if (!token) return
    void loadTickets().catch(() => setTickets([]))
  }, [token, loadTickets])

  useEffect(() => {
    if (!token || expandedId == null) {
      setThread(null)
      return
    }
    setThreadLoading(true)
    void fetchAdminSupportTicketThread(token, expandedId)
      .then((t) => setThread(t))
      .catch(() => setThread(null))
      .finally(() => setThreadLoading(false))
  }, [token, expandedId])

  async function closeTicket(t: AdminSupportTicketRow) {
    if (!token) return
    setTicketMsg(null)
    const r = await patchAdminSupportTicket(token, t.id, { status: 1, adminNote: t.adminNote })
    if (!r.ok) {
      setTicketMsg(r.message)
      return
    }
    await loadTickets()
    if (expandedId === t.id && token) {
      const th = await fetchAdminSupportTicketThread(token, t.id)
      setThread(th)
    }
  }

  async function reopenTicket(id: number) {
    if (!token) return
    setTicketMsg(null)
    const row = tickets?.find((x) => x.id === id)
    const r = await patchAdminSupportTicket(token, id, { status: 0, adminNote: row?.adminNote ?? null })
    if (!r.ok) {
      setTicketMsg(r.message)
      return
    }
    await loadTickets()
    if (expandedId === id && token) {
      const th = await fetchAdminSupportTicketThread(token, id)
      setThread(th)
    }
  }

  async function sendStaffReply(ticketId: number) {
    if (!token) return
    const text = (staffReplyDraft[ticketId] ?? '').trim()
    if (!text) return
    setTicketMsg(null)
    const r = await postAdminSupportTicketMessage(token, ticketId, text)
    if (!r.ok) {
      setTicketMsg(r.message)
      return
    }
    setStaffReplyDraft((d) => ({ ...d, [ticketId]: '' }))
    const th = await fetchAdminSupportTicketThread(token, ticketId)
    setThread(th)
    await loadTickets()
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-3xl" aria-hidden>
          {def.icon}
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-100">{def.title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-400">{def.intro}</p>
      </div>

      {(canLinkUsers || canLinkOrders || canLinkSecurity) ? (
        <div className="flex flex-wrap gap-2">
          {canLinkUsers ? (
            <Link to="/admin/users" className={customerBtnGhost}>
              Klientët
            </Link>
          ) : null}
          {canLinkOrders ? (
            <Link to="/admin/orders" className={customerBtnGhost}>
              Porositë
            </Link>
          ) : null}
          {canLinkSecurity ? (
            <Link to="/admin/security" className={customerBtnGhost}>
              Audit
            </Link>
          ) : null}
        </div>
      ) : null}

      <section className={`${customerCardMuted} p-5`}>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-violet-200/80">
          Tiketat e klientëve
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Zgjero një tiketë: mesazhet lart me scroll; përgjigja dhe mbyllja poshtë.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="block text-xs text-zinc-500">
            Kërkim
            <input
              value={ticketSearch}
              onChange={(e) => setTicketSearch(e.target.value)}
              placeholder="Subjekt, përmbajtje, email"
              className="mt-1 block w-56 rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100"
            />
          </label>
          <label className="block text-xs text-zinc-500">
            Renditja
            <select
              value={ticketSort}
              onChange={(e) => {
                setTicketSort(e.target.value)
                setTicketPage(1)
              }}
              className="mt-1 block w-44 rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100"
            >
              <option value="created_desc">Më e reja</option>
              <option value="created_asc">Më e vjetra</option>
              <option value="subject_asc">Subjekti A–Z</option>
              <option value="status_asc">Statusi</option>
            </select>
          </label>
          <button
            type="button"
            className={customerBtnGhost}
            onClick={() => {
              setAppliedTicketSearch(ticketSearch.trim())
              setTicketPage(1)
            }}
          >
            Filtrimi
          </button>
        </div>
        {ticketMsg ? <p className="mt-3 text-sm text-amber-200">{ticketMsg}</p> : null}
        {!tickets ? (
          <p className="mt-4 text-sm text-zinc-500">Duke ngarkuar…</p>
        ) : tickets.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-400">Nuk ka tiketa.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {tickets.map((t) => {
              const open = expandedId === t.id
              return (
                <li key={t.id} className="rounded-lg border border-white/10 bg-zinc-950/40 p-3">
                  <button
                    type="button"
                    onClick={() => setExpandedId(open ? null : t.id)}
                    className="flex w-full flex-wrap items-baseline justify-between gap-2 text-left"
                  >
                    <span className="text-sm font-medium text-zinc-100">{t.subject}</span>
                    <span className="text-xs text-zinc-500">
                      {t.userEmail} · #{t.id} · {TICKET_STATUS_SQ[t.status] ?? t.status} · {t.messageCount}{' '}
                      mesazhe · {new Date(t.createdAtUtc).toLocaleString('sq-AL')}
                    </span>
                  </button>
                  {t.orderNumber || t.restaurantName ? (
                    <p className="mt-1 text-xs text-zinc-600">
                      {t.orderNumber ? <span>Porosi {t.orderNumber}</span> : null}
                      {t.orderNumber && t.restaurantName ? ' · ' : null}
                      {t.restaurantName ? <span>{t.restaurantName}</span> : null}
                    </p>
                  ) : null}
                  {open ? (
                    <div className="mt-4 border-t border-white/10 pt-4">
                      {threadLoading ? (
                        <p className="text-sm text-zinc-500">Duke ngarkuar thread-in…</p>
                      ) : thread && thread.id === t.id ? (
                        <div className="flex max-h-[min(520px,72vh)] flex-col overflow-hidden rounded-xl border border-violet-500/25 bg-zinc-950/80 shadow-lg shadow-black/40">
                          <div className="shrink-0 border-b border-white/10 px-3 py-2.5">
                            <p className="text-xs font-semibold uppercase tracking-wide text-violet-200/90">
                              Historia e bisedës
                            </p>
                            <p className="mt-0.5 text-[11px] text-zinc-500">
                              Mesazhet lart mund të jenë të gjatë — përdor scroll brenda kësaj zone.
                            </p>
                          </div>
                          <div className="min-h-[8rem] flex-1 overflow-y-auto overscroll-y-contain px-3 py-3 [scrollbar-gutter:stable]">
                            <div className="space-y-3">
                              <div className="rounded-lg border border-white/10 bg-zinc-900/50 p-3">
                                <p className="text-xs font-medium text-zinc-500">Mesazhi fillestar</p>
                                <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-200">
                                  {thread.initialBody}
                                </p>
                              </div>
                              {thread.messages.map((m) => (
                                <div
                                  key={m.id}
                                  className={`rounded-lg border p-3 ${
                                    m.isStaffReply
                                      ? 'border-violet-500/30 bg-violet-950/25'
                                      : 'border-white/10 bg-zinc-900/40'
                                  }`}
                                >
                                  <p className="text-xs text-zinc-500">
                                    {m.isStaffReply ? 'Staf' : 'Klient'} · {m.authorEmail} ·{' '}
                                    {new Date(m.createdAtUtc).toLocaleString('sq-AL')}
                                  </p>
                                  <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-200">{m.body}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="shrink-0 space-y-4 border-t border-violet-500/30 bg-[#121015] px-3 py-4">
                            {thread.status === 0 ? (
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-300/95">
                                  Përgjigju klientit
                                </p>
                                <p className="mt-0.5 text-[11px] text-zinc-500">
                                  Kjo dërgohet te klienti dhe njofton me push (nëse ka aktivizuar).
                                </p>
                                <textarea
                                  value={staffReplyDraft[t.id] ?? ''}
                                  onChange={(e) =>
                                    setStaffReplyDraft((d) => ({ ...d, [t.id]: e.target.value }))
                                  }
                                  rows={3}
                                  maxLength={4000}
                                  placeholder="Shkruaj përgjigjen…"
                                  aria-label="Përgjigje për klientin"
                                  className="mt-2 block w-full rounded-lg border border-violet-500/25 bg-zinc-900/90 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-400/50 focus:outline-none"
                                />
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    className={customerBtnPrimary}
                                    onClick={() => void sendStaffReply(t.id)}
                                  >
                                    Dërgo përgjigjen
                                  </button>
                                  <button
                                    type="button"
                                    className={customerBtnGhost}
                                    onClick={() => void closeTicket(t)}
                                  >
                                    Mbyll tiketën
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <p className="text-sm text-zinc-500">
                                  Tiketa është e mbyllur — rihap për të dërguar përgjigje të reja.
                                </p>
                                <button
                                  type="button"
                                  className={customerBtnPrimary}
                                  onClick={() => void reopenTicket(t.id)}
                                >
                                  Rihap tiketën
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap text-sm text-zinc-300">{t.body}</p>
                      )}
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
        {tickets && tickets.length > 0 ? (
          <div className="mt-4 flex items-center justify-between text-sm text-zinc-400">
            <span>
              {ticketTotal} tiketa · faqja {ticketPage}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className={customerBtnGhost}
                disabled={ticketPage <= 1}
                onClick={() => setTicketPage((x) => Math.max(1, x - 1))}
              >
                ←
              </button>
              <button
                type="button"
                className={customerBtnGhost}
                disabled={ticketPage * ticketPs >= ticketTotal}
                onClick={() => setTicketPage((x) => x + 1)}
              >
                →
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {canSeeAudit ? (
        <section className={`${customerCardMuted} p-5`}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-violet-200/80">
            Aktiviteti së fundmi (audit)
          </h2>
          {!audit ? (
            <p className="mt-4 text-sm text-zinc-500">Duke ngarkuar…</p>
          ) : audit.items.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-400">Nuk ka hyra ende.</p>
          ) : (
            <ul className="mt-4 space-y-2 text-sm text-zinc-300">
              {audit.items.map((a) => (
                <li key={a.id} className="border-b border-white/5 pb-2">
                  <span className="text-zinc-500">
                    {new Date(a.createdAt).toLocaleString('sq-AL')}
                  </span>{' '}
                  <span className="text-zinc-100">{a.action}</span> · {a.entity}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <section className={`${customerCardMuted} p-5`}>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-violet-200/80">
          Rrjedha e planifikuar
        </h2>
        <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-zinc-400 marker:text-violet-400">
          {def.features.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}
