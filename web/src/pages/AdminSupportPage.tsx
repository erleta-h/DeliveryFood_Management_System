import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  fetchAdminSupportTickets,
  fetchAdminSupportTicketThread,
  postAdminSupportTicketMessage,
  adminChangeTicketStatus,
  adminChangeTicketPriority,
  adminAssignTicket,
  fetchAdminTicketAudit,
  fetchAdminSupportAgents,
  patchAdminSupportTicket,
  type AdminSupportTicketRow,
  type AdminSupportTicketThread,
  type AdminTicketAuditRow,
  type SupportAgentRow,
} from '../lib/adminApi'
import { ADMIN_SECTIONS } from '../lib/adminNav'
import {
  STATUS_LABELS,
  PRIORITY_LABELS,
  CATEGORY_LABELS,
} from '../lib/supportApi'
import { adminTicketHasNewActivity } from '../lib/adminSupportRead'
import { AdminIcon } from '../components/admin/adminIcons'
import {
  AdminFilterField,
  AdminFilterSelect,
  AdminPageShell,
  AdminSearchInput,
} from '../components/admin/AdminPageShell'
import { adminContentCard, customerBtnPrimary, customerBtnGhostSm } from '../lib/adminTheme'
import { SupportAttachmentList } from '../components/support/SupportAttachmentImage'
import { useAuthStore } from '../store/authStore'
import { useAdminNotificationsStore } from '../store/adminNotificationsStore'

const STATUS_COLORS_LIGHT: Record<number, string> = {
  0: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  1: 'bg-sky-100 text-sky-700 border-sky-200',
  2: 'bg-violet-100 text-violet-700 border-violet-200',
  3: 'bg-gray-100 text-gray-500 border-gray-200',
}

const PRIORITY_COLORS_LIGHT: Record<number, string> = {
  0: 'bg-gray-100 text-gray-500 border-gray-200',
  1: 'bg-amber-100 text-amber-700 border-amber-200',
  2: 'bg-orange-100 text-orange-700 border-orange-200',
  3: 'bg-red-100 text-red-700 border-red-200',
}

export default function AdminSupportPage() {
  const token = useAuthStore((s) => s.token)
  const [searchParams, setSearchParams] = useSearchParams()
  const def = ADMIN_SECTIONS.support
  const unreadTicketIds = useAdminNotificationsStore((s) => s.unreadTicketIds)
  const supportUnreadCount = useAdminNotificationsStore((s) => s.supportUnreadCount)
  const syncSupportUnreadFromList = useAdminNotificationsStore((s) => s.syncSupportUnreadFromList)
  const markSupportTicketRead = useAdminNotificationsStore((s) => s.markSupportTicketRead)
  const hydrateSupportUnread = useAdminNotificationsStore((s) => s.hydrateSupportUnread)

  const [tickets, setTickets] = useState<AdminSupportTicketRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(25)
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [sort, setSort] = useState('created_desc')
  const [fStatus, setFStatus] = useState<number | null>(null)
  const [fCategory, setFCategory] = useState<number | null>(null)
  const [fPriority, setFPriority] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [thread, setThread] = useState<AdminSupportTicketThread | null>(null)
  const [threadLoading, setThreadLoading] = useState(false)
  const [threadError, setThreadError] = useState<string | null>(null)
  const [replyDraft, setReplyDraft] = useState('')
  const [replyBusy, setReplyBusy] = useState(false)

  const [auditTrail, setAuditTrail] = useState<AdminTicketAuditRow[]>([])
  const [auditLoading, setAuditLoading] = useState(false)

  const [agents, setAgents] = useState<SupportAgentRow[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState<string>('')
  const [actionBusy, setActionBusy] = useState(false)

  const loadTickets = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const d = await fetchAdminSupportTickets(token, {
        search: appliedSearch || undefined,
        sort,
        page,
        pageSize,
        status: fStatus,
        category: fCategory,
        priority: fPriority,
      })
      setTickets(d.items)
      syncSupportUnreadFromList(d.items)
      setTotal(d.total)
    } catch {
      setTickets([])
    } finally {
      setLoading(false)
    }
  }, [token, page, pageSize, appliedSearch, sort, fStatus, fCategory, fPriority, syncSupportUnreadFromList])

  useEffect(() => {
    hydrateSupportUnread()
  }, [hydrateSupportUnread])

  useEffect(() => { void loadTickets() }, [loadTickets])

  useEffect(() => {
    if (!token) return
    void fetchAdminSupportAgents(token)
      .then(setAgents)
      .catch(() => setAgents([]))
  }, [token])

  const loadThread = useCallback(async (id: number) => {
    if (!token) return
    setThreadLoading(true)
    setAuditLoading(true)
    setThreadError(null)
    try {
      const t = await fetchAdminSupportTicketThread(token, id)
      if (!t) {
        setThread(null)
        setThreadError('Tiketa nuk u gjet.')
        setAuditTrail([])
        return
      }
      setThread(t)
      setSelectedAgentId(t.assignedToUserId != null ? String(t.assignedToUserId) : '')
      try {
        const a = await fetchAdminTicketAudit(token, id)
        setAuditTrail(a)
      } catch {
        setAuditTrail([])
      }
    } catch (e: unknown) {
      setThread(null)
      setAuditTrail([])
      setThreadError(e instanceof Error ? e.message : 'Gabim ngarkimi të tiketës.')
    } finally {
      setThreadLoading(false)
      setAuditLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (selectedId == null) {
      setThread(null)
      setAuditTrail([])
      setThreadError(null)
      return
    }
    void loadThread(selectedId)
  }, [selectedId, loadThread])

  useEffect(() => {
    if (!thread || selectedId == null) return
    markSupportTicketRead(selectedId, 1 + thread.messages.length)
  }, [thread, selectedId, markSupportTicketRead])

  useEffect(() => {
    const q = searchParams.get('ticket')
    if (!q || !/^\d+$/.test(q)) return
    const id = Number(q)
    if (!Number.isFinite(id)) return
    setSelectedId(id)
  }, [searchParams])

  async function sendReply() {
    if (!token || !selectedId || !replyDraft.trim()) return
    setReplyBusy(true)
    setMsg(null)
    const r = await postAdminSupportTicketMessage(token, selectedId, replyDraft.trim())
    if (!r.ok) { setMsg(r.message); setReplyBusy(false); return }
    setReplyDraft('')
    setReplyBusy(false)
    const t = await fetchAdminSupportTicketThread(token, selectedId)
    if (t) {
      setThread(t)
      markSupportTicketRead(selectedId, 1 + t.messages.length)
    } else {
      await loadThread(selectedId)
    }
    await loadTickets()
  }

  async function doChangeStatus(status: number) {
    if (!token || !selectedId) return
    setActionBusy(true); setMsg(null)
    const r = await adminChangeTicketStatus(token, selectedId, status)
    if (!r.ok) { setMsg(r.message); setActionBusy(false); return }
    setActionBusy(false)
    await loadThread(selectedId)
    await loadTickets()
  }

  async function doChangePriority(priority: number) {
    if (!token || !selectedId) return
    setActionBusy(true); setMsg(null)
    const r = await adminChangeTicketPriority(token, selectedId, priority)
    if (!r.ok) { setMsg(r.message); setActionBusy(false); return }
    setActionBusy(false)
    await loadThread(selectedId)
    await loadTickets()
  }

  async function doAssign() {
    if (!token || !selectedId || !selectedAgentId) return
    const id = Number(selectedAgentId)
    if (!Number.isFinite(id) || id < 1) {
      setMsg('Zgjidh një agjent.')
      return
    }
    setActionBusy(true)
    setMsg(null)
    const r = await adminAssignTicket(token, selectedId, id)
    if (!r.ok) {
      setMsg(r.message)
      setActionBusy(false)
      return
    }
    setActionBusy(false)
    await loadThread(selectedId)
    await loadTickets()
  }

  async function doUpdateNote(note: string | null) {
    if (!token || !selectedId || !thread) return
    setActionBusy(true); setMsg(null)
    const r = await patchAdminSupportTicket(token, selectedId, { status: thread.status, adminNote: note })
    if (!r.ok) { setMsg(r.message); setActionBusy(false); return }
    setActionBusy(false)
    await loadThread(selectedId)
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const filterBar = (
    <div className="flex flex-wrap items-end gap-3">
      <AdminFilterField label="Kërkim">
        <AdminSearchInput
          value={search}
          onChange={setSearch}
          placeholder="Subjekt, email, ID tikete…"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setAppliedSearch(search.trim())
              setPage(1)
            }
          }}
        />
      </AdminFilterField>
      <AdminFilterField label="Statusi" className="w-36">
        <AdminFilterSelect
          value={fStatus ?? ''}
          onChange={(e) => {
            setFStatus(e.target.value === '' ? null : Number(e.target.value))
            setPage(1)
          }}
        >
          <option value="">Të gjitha</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </AdminFilterSelect>
      </AdminFilterField>
      <AdminFilterField label="Kategoria" className="w-40">
        <AdminFilterSelect
          value={fCategory ?? ''}
          onChange={(e) => {
            setFCategory(e.target.value === '' ? null : Number(e.target.value))
            setPage(1)
          }}
        >
          <option value="">Të gjitha</option>
          {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </AdminFilterSelect>
      </AdminFilterField>
      <AdminFilterField label="Prioriteti" className="w-36">
        <AdminFilterSelect
          value={fPriority ?? ''}
          onChange={(e) => {
            setFPriority(e.target.value === '' ? null : Number(e.target.value))
            setPage(1)
          }}
        >
          <option value="">Të gjitha</option>
          {Object.entries(PRIORITY_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </AdminFilterSelect>
      </AdminFilterField>
      <AdminFilterField label="Renditja" className="w-40">
        <AdminFilterSelect
          value={sort}
          onChange={(e) => {
            setSort(e.target.value)
            setPage(1)
          }}
        >
          <option value="created_desc">Më e reja</option>
          <option value="created_asc">Më e vjetra</option>
          <option value="priority_desc">Prioriteti</option>
          <option value="status_asc">Statusi</option>
        </AdminFilterSelect>
      </AdminFilterField>
      <button
        type="button"
        className={`${customerBtnPrimary} inline-flex h-10 items-center gap-2 px-4`}
        onClick={() => {
          setAppliedSearch(search.trim())
          setPage(1)
        }}
      >
        <AdminIcon name="filter" size={16} />
        Filtro
      </button>
    </div>
  )

  return (
    <AdminPageShell
      fill
      title={def.title}
      intro={def.intro}
      titleBadge={
        <span className="inline-flex items-center rounded-lg bg-rose-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-rose-600">
          SOS
        </span>
      }
      filters={filterBar}
    >
      {msg && (
        <p className="mb-3 shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {msg}
        </p>
      )}

      <div className="grid h-full min-h-[520px] grid-cols-1 gap-4 lg:grid-cols-[minmax(260px,300px)_minmax(0,1fr)_minmax(260px,300px)] xl:grid-cols-[minmax(280px,320px)_minmax(0,1fr)_minmax(280px,320px)]">
        <div className={`flex min-h-0 flex-col overflow-hidden ${adminContentCard}`}>
          <div className="shrink-0 border-b border-gray-100 bg-gray-50/50 px-4 py-3">
            <p className="flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
              <span>{total} tiketa</span>
              {supportUnreadCount > 0 ? (
                <span className="rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-bold normal-case text-white">
                  {supportUnreadCount} të reja
                </span>
              ) : null}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <p className="p-4 text-sm text-gray-400">Duke ngarkuar...</p>
            ) : tickets.length === 0 ? (
              <p className="p-4 text-sm text-gray-400">Nuk ka tiketa.</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {tickets.map((t) => {
                  const hasNew = adminTicketHasNewActivity(t.id, t.messageCount, t.status, unreadTicketIds)
                  const active = selectedId === t.id
                  return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(t.id)
                        setReplyDraft('')
                        setSearchParams({ ticket: String(t.id) }, { replace: true })
                      }}
                      className={`w-full px-4 py-3.5 text-left transition ${
                        active
                          ? 'bg-violet-50 ring-1 ring-inset ring-violet-200'
                          : hasNew
                            ? 'bg-violet-50/60 hover:bg-violet-50'
                            : 'hover:bg-gray-50/80'
                      }`}
                    >
                      <div className="flex gap-3">
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${avatarTone(t.userEmail)}`}
                        >
                          {emailInitial(t.userEmail)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-2">
                            <span className="truncate text-sm font-semibold text-gray-900">{t.subject}</span>
                            {hasNew ? (
                              <span className="shrink-0 rounded-full bg-violet-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                1
                              </span>
                            ) : null}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-gray-500">{t.userEmail}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS_LIGHT[t.status] ?? 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                              {STATUS_LABELS[t.status] ?? t.status}
                            </span>
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${PRIORITY_COLORS_LIGHT[t.priority] ?? 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                              {PRIORITY_LABELS[t.priority] ?? t.priority}
                            </span>
                          </div>
                          <p className="mt-1.5 text-[10px] text-gray-400">
                            #{t.id} · {timeAgoShort(t.createdAtUtc)}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                  )
                })}
              </ul>
            )}
          </div>
          {tickets.length > 0 && (
            <div className="shrink-0 flex items-center justify-between border-t border-gray-100 bg-gray-50/40 px-4 py-2.5 text-xs text-gray-500">
              <span>
                Faqja {page} nga {totalPages}
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Faqja e mëparshme"
                >
                  <AdminIcon name="chevronLeft" size={16} />
                </button>
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  aria-label="Faqja tjetër"
                >
                  <AdminIcon name="chevronRight" size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className={`flex min-h-0 flex-col overflow-hidden ${adminContentCard}`}>
          {selectedId == null ? (
            <div className="flex flex-1 items-center justify-center p-8">
              <p className="text-sm text-gray-400">Zgjidh një tiketë nga lista.</p>
            </div>
          ) : threadLoading ? (
            <div className="flex flex-1 items-center justify-center p-8">
              <p className="text-sm text-gray-400">Duke ngarkuar bisedën...</p>
            </div>
          ) : !thread ? (
            <div className="flex flex-1 items-center justify-center p-8">
              <p className="text-sm text-amber-700">{threadError ?? 'Tiketa nuk u gjet.'}</p>
            </div>
          ) : (
            <>
              <div className="shrink-0 border-b border-gray-100 bg-white px-5 py-4">
                <p className="text-base font-semibold text-gray-900">{thread.subject}</p>
                <p className="mt-1 text-xs text-gray-500">
                  #{thread.id} · {thread.userEmail} ·{' '}
                  {new Date(thread.createdAtUtc).toLocaleString('sq-AL', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <div className="flex-1 overflow-y-auto bg-gray-50/40 px-5 py-4 space-y-3">
                <div className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Mesazhi fillestar</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">{thread.initialBody}</p>
                  {token ? (
                    <SupportAttachmentList
                      token={token}
                      ticketId={thread.id}
                      attachments={thread.initialAttachments}
                      admin
                    />
                  ) : null}
                </div>
                {thread.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`rounded-lg border p-3 ${
                      m.isStaffReply
                        ? 'border-violet-200 bg-violet-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <p className="text-xs text-gray-500">
                      {m.isStaffReply ? 'Staf' : 'Klient'} · {m.authorEmail} · {new Date(m.createdAtUtc).toLocaleString('sq-AL')}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">{m.body}</p>
                    {token ? (
                      <SupportAttachmentList
                        token={token}
                        ticketId={thread.id}
                        attachments={m.attachments}
                        admin
                      />
                    ) : null}
                  </div>
                ))}
              </div>
              <div className="shrink-0 border-t border-gray-100 bg-white p-4">
                {thread.status !== 3 ? (
                  <div className="space-y-3">
                    <div className="relative">
                      <textarea
                        value={replyDraft}
                        onChange={(e) => setReplyDraft(e.target.value)}
                        rows={3}
                        maxLength={4000}
                        placeholder="Shkruaj përgjigjen..."
                        className="block w-full resize-none rounded-xl border border-gray-200 bg-gray-50/50 px-3 pb-11 pt-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/15"
                      />
                      <div className="pointer-events-none absolute bottom-3 left-3 flex gap-0.5 text-gray-400">
                        <span className="rounded-lg p-1.5 hover:bg-gray-100" title="Bashkëngjitje (së shpejti)">
                          <AdminIcon name="paperclip" size={18} />
                        </span>
                        <span className="rounded-lg p-1.5 hover:bg-gray-100" title="Emoji (së shpejti)">
                          <AdminIcon name="message" size={18} />
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        disabled={replyBusy || !replyDraft.trim()}
                        className={`${customerBtnPrimary} rounded-xl px-5 py-2.5`}
                        onClick={() => void sendReply()}
                      >
                        {replyBusy ? 'Duke dërguar...' : 'Dërgo përgjigjen'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Tiketa e mbyllur.</p>
                )}
              </div>
            </>
          )}
        </div>

        <div className={`flex min-h-0 flex-col overflow-hidden ${adminContentCard}`}>
          {selectedId == null || !thread ? (
            <div className="flex flex-1 items-center justify-center p-6">
              <p className="text-xs text-gray-400">Detajet shfaqen kur zgjidhet tiketa.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              <div className="space-y-2.5 rounded-xl border border-gray-100 bg-gray-50/60 p-4">
                <SectionLabel>Info</SectionLabel>
                <InfoRow label="ID tikete" value={`#${thread.id}`} />
                <InfoRow
                  label="Krijuar"
                  value={new Date(thread.createdAtUtc).toLocaleString('sq-AL', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                />
                <InfoRow label="Dërguesi" value={thread.userEmail} />
                {thread.restaurantName ? <InfoRow label="Restoranti" value={thread.restaurantName} /> : null}
                <InfoRow label="Kategoria" value={CATEGORY_LABELS[thread.category] ?? 'Tjetër'} />
                {thread.orderNumber ? (
                  <InfoRow label="Lidhur me porosi" value={thread.orderNumber} />
                ) : null}
                {thread.driverName ? <InfoRow label="Driver" value={thread.driverName} /> : null}
                {thread.assignedToEmail ? <InfoRow label="Agjenti" value={thread.assignedToEmail} /> : null}
                {thread.status === 2 && thread.resolvedAtUtc ? (
                  <InfoRow
                    label="Data e zgjidhjes"
                    value={new Date(thread.resolvedAtUtc).toLocaleString('sq-AL', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  />
                ) : null}
              </div>

              <div className="space-y-2">
                <SectionLabel>Statusi</SectionLabel>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(STATUS_LABELS).map(([v, l]) => {
                    const val = Number(v)
                    const on = thread.status === val
                    return (
                      <button
                        key={v}
                        type="button"
                        disabled={actionBusy}
                        onClick={() => void doChangeStatus(val)}
                        className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                          on
                            ? STATUS_COLORS_LIGHT[val] ?? ''
                            : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        {l}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <SectionLabel>Prioriteti</SectionLabel>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(PRIORITY_LABELS).map(([v, l]) => {
                    const val = Number(v)
                    const label = l === 'Mesatar' ? 'Normal' : l
                    const on = thread.priority === val
                    return (
                      <button
                        key={v}
                        type="button"
                        disabled={actionBusy}
                        onClick={() => void doChangePriority(val)}
                        className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                          on
                            ? PRIORITY_COLORS_LIGHT[val] ?? ''
                            : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <SectionLabel>Agjenti</SectionLabel>
                <div className="flex gap-1.5">
                  <select
                    value={selectedAgentId}
                    onChange={(e) => setSelectedAgentId(e.target.value)}
                    disabled={actionBusy || agents.length === 0}
                    className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900"
                  >
                    <option value="">— Zgjidh agjentin —</option>
                    {agents.map((a) => (
                      <option key={a.id} value={String(a.id)}>
                        {a.displayName}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={actionBusy || !selectedAgentId}
                    className={customerBtnGhostSm}
                    onClick={() => void doAssign()}
                  >
                    Cakto
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <SectionLabel>Shënim i brendshëm</SectionLabel>
                <AdminNoteEditor
                  current={thread.adminNote}
                  busy={actionBusy}
                  onSave={(val) => void doUpdateNote(val)}
                />
              </div>

              <div className="space-y-2">
                <SectionLabel>Audit trail</SectionLabel>
                {auditLoading ? (
                  <p className="text-xs text-gray-400">Duke ngarkuar...</p>
                ) : auditTrail.length === 0 ? (
                  <p className="text-xs text-gray-400">Asnjë veprim ende.</p>
                ) : (
                  <ul className="space-y-3 border-l-2 border-violet-200 pl-4">
                    {auditTrail.map((a, i) => (
                      <li key={`${a.id}-${a.createdAtUtc}`} className="relative text-[11px] leading-snug">
                        <span
                          className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ring-2 ring-white ${
                            i === 0 ? 'bg-violet-500' : 'bg-gray-300'
                          }`}
                        />
                        <p className="font-medium text-gray-500">
                          {new Date(a.createdAtUtc).toLocaleString('sq-AL', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        <p className="mt-0.5 text-gray-700">{a.action}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminPageShell>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{children}</p>
  )
}

const AVATAR_TONES = [
  'bg-violet-500',
  'bg-sky-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-indigo-500',
] as const

function emailInitial(email: string) {
  const c = email.trim()[0]
  return c ? c.toUpperCase() : '?'
}

function avatarTone(email: string) {
  let h = 0
  for (let i = 0; i < email.length; i++) h = (h + email.charCodeAt(i)) % AVATAR_TONES.length
  return AVATAR_TONES[h]
}

function timeAgoShort(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'tani'
  if (min < 60) return `${min} m`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} orë`
  const d = Math.floor(h / 24)
  return `${d} d`
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="shrink-0 text-[10px] font-semibold text-gray-400 w-16">{label}</span>
      <span className="text-xs text-gray-700 break-all">{value}</span>
    </div>
  )
}

function AdminNoteEditor({
  current,
  busy,
  onSave,
}: {
  current: string | null
  busy: boolean
  onSave: (val: string | null) => void
}) {
  const [draft, setDraft] = useState(current ?? '')
  useEffect(() => setDraft(current ?? ''), [current])

  return (
    <div className="space-y-1">
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={2}
        maxLength={2000}
        className="block w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 focus:border-violet-400 focus:outline-none"
        placeholder="Vetëm për ekipin e platformës — restoranti nuk e sheh"
      />
      <button
        type="button"
        disabled={busy || draft === (current ?? '')}
        className={`${customerBtnPrimary} mt-1 w-full rounded-xl py-2 text-xs`}
        onClick={() => onSave(draft.trim() || null)}
      >
        Ruaj shënimin
      </button>
    </div>
  )
}