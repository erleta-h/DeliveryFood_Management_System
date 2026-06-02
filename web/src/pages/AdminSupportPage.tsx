import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  fetchAdminSupportTickets,
  fetchAdminSupportTicketThread,
  postAdminSupportTicketMessage,
  adminChangeTicketStatus,
  adminChangeTicketPriority,
  adminAssignTicket,
  fetchAdminTicketAudit,
  patchAdminSupportTicket,
  type AdminSupportTicketRow,
  type AdminSupportTicketThread,
  type AdminTicketAuditRow,
} from '../lib/adminApi'
import { ADMIN_SECTIONS } from '../lib/adminNav'
import {
  STATUS_LABELS,
  PRIORITY_LABELS,
  CATEGORY_LABELS,
} from '../lib/supportApi'
import { customerBtnPrimary, customerBtnGhost, customerBtnGhostSm } from '../lib/adminTheme'
import { useAuthStore } from '../store/authStore'

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

  const [assignInput, setAssignInput] = useState('')
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
      setTotal(d.total)
    } catch {
      setTickets([])
    } finally {
      setLoading(false)
    }
  }, [token, page, pageSize, appliedSearch, sort, fStatus, fCategory, fPriority])

  useEffect(() => { void loadTickets() }, [loadTickets])

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
    await loadThread(selectedId)
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
    if (!token || !selectedId || !assignInput.trim()) return
    const id = Number(assignInput.trim())
    if (!Number.isFinite(id) || id < 1) { setMsg('ID i pavlefshëm'); return }
    setActionBusy(true); setMsg(null)
    const r = await adminAssignTicket(token, selectedId, id)
    if (!r.ok) { setMsg(r.message); setActionBusy(false); return }
    setAssignInput('')
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

  return (
    <div className="space-y-4">
      <div>
        <p className="text-3xl" aria-hidden>{def.icon}</p>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">{def.title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">{def.intro}</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="block text-xs text-gray-500">
          Kërkim
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Subjekt, email"
            className="mt-1 block w-48 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
            onKeyDown={(e) => { if (e.key === 'Enter') { setAppliedSearch(search.trim()); setPage(1) } }}
          />
        </label>
        <label className="block text-xs text-gray-500">
          Statusi
          <select
            value={fStatus ?? ''}
            onChange={(e) => { setFStatus(e.target.value === '' ? null : Number(e.target.value)); setPage(1) }}
            className="mt-1 block w-32 rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm text-gray-900"
          >
            <option value="">Të gjitha</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label className="block text-xs text-gray-500">
          Kategoria
          <select
            value={fCategory ?? ''}
            onChange={(e) => { setFCategory(e.target.value === '' ? null : Number(e.target.value)); setPage(1) }}
            className="mt-1 block w-36 rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm text-gray-900"
          >
            <option value="">Të gjitha</option>
            {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label className="block text-xs text-gray-500">
          Prioriteti
          <select
            value={fPriority ?? ''}
            onChange={(e) => { setFPriority(e.target.value === '' ? null : Number(e.target.value)); setPage(1) }}
            className="mt-1 block w-32 rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm text-gray-900"
          >
            <option value="">Të gjitha</option>
            {Object.entries(PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label className="block text-xs text-gray-500">
          Renditja
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value); setPage(1) }}
            className="mt-1 block w-36 rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm text-gray-900"
          >
            <option value="created_desc">Më e reja</option>
            <option value="created_asc">Më e vjetra</option>
            <option value="priority_desc">Prioriteti</option>
            <option value="status_asc">Statusi</option>
          </select>
        </label>
        <button
          type="button" className={customerBtnGhost}
          onClick={() => { setAppliedSearch(search.trim()); setPage(1) }}
        >
          Filtro
        </button>
      </div>

      {msg && <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{msg}</p>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr_300px] xl:grid-cols-[380px_1fr_340px]">
        <div className="flex max-h-[80vh] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="shrink-0 border-b border-gray-200 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{total} tiketa</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <p className="p-4 text-sm text-gray-400">Duke ngarkuar...</p>
            ) : tickets.length === 0 ? (
              <p className="p-4 text-sm text-gray-400">Nuk ka tiketa.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {tickets.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(t.id)
                        setReplyDraft('')
                        setSearchParams({ ticket: String(t.id) }, { replace: true })
                      }}
                      className={`w-full px-3 py-3 text-left transition ${
                        selectedId === t.id ? 'bg-violet-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <p className="truncate text-sm font-medium text-gray-900">{t.subject}</p>
                      <p className="mt-0.5 truncate text-xs text-gray-500">{t.userEmail}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS_LIGHT[t.status] ?? 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                          {STATUS_LABELS[t.status] ?? t.status}
                        </span>
                        <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${PRIORITY_COLORS_LIGHT[t.priority] ?? 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                          {PRIORITY_LABELS[t.priority] ?? t.priority}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {CATEGORY_LABELS[t.category] ?? 'Tjetër'}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          #{t.id} · {t.messageCount} msg
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {tickets.length > 0 && (
            <div className="shrink-0 flex items-center justify-between border-t border-gray-200 px-3 py-2 text-xs text-gray-500">
              <span>Faqja {page}</span>
              <div className="flex gap-1">
                <button type="button" className={customerBtnGhostSm} disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  ←
                </button>
                <button type="button" className={customerBtnGhostSm} disabled={page * pageSize >= total} onClick={() => setPage((p) => p + 1)}>
                  →
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex max-h-[80vh] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
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
              <div className="shrink-0 border-b border-gray-200 px-4 py-3">
                <p className="text-sm font-semibold text-gray-900">{thread.subject}</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  #{thread.id} · {thread.userEmail} · {new Date(thread.createdAtUtc).toLocaleString('sq-AL')}
                </p>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-[10px] font-semibold uppercase text-gray-400">Mesazhi fillestar</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">{thread.initialBody}</p>
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
                  </div>
                ))}
              </div>
              <div className="shrink-0 border-t border-gray-200 p-3 space-y-2">
                {thread.status !== 3 ? (
                  <>
                    <textarea
                      value={replyDraft}
                      onChange={(e) => setReplyDraft(e.target.value)}
                      rows={2}
                      maxLength={4000}
                      placeholder="Shkruaj përgjigjen..."
                      className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-violet-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={replyBusy || !replyDraft.trim()}
                      className={customerBtnPrimary}
                      onClick={() => void sendReply()}
                    >
                      {replyBusy ? 'Duke dërguar...' : 'Dërgo përgjigjen'}
                    </button>
                  </>
                ) : (
                  <p className="text-sm text-gray-400">Tiketa e mbyllur.</p>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex max-h-[80vh] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {selectedId == null || !thread ? (
            <div className="flex flex-1 items-center justify-center p-6">
              <p className="text-xs text-gray-400">Detajet shfaqen kur zgjidhet tiketa.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Info</p>
                <InfoRow label="Klient" value={thread.userEmail} />
                {thread.orderNumber && <InfoRow label="Porosi" value={thread.orderNumber} />}
                {thread.restaurantName && <InfoRow label="Restorant" value={thread.restaurantName} />}
                {thread.driverName && <InfoRow label="Driver" value={thread.driverName} />}
                {thread.assignedToEmail && <InfoRow label="Caktuar te" value={thread.assignedToEmail} />}
                {thread.resolvedAtUtc && (
                  <InfoRow label="Zgjidhur" value={new Date(thread.resolvedAtUtc).toLocaleString('sq-AL')} />
                )}
                {thread.adminNote && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400">Shënimi</p>
                    <p className="text-xs text-gray-600">{thread.adminNote}</p>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Statusi</p>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(STATUS_LABELS).map(([v, l]) => {
                    const val = Number(v)
                    return (
                      <button
                        key={v} type="button" disabled={actionBusy || thread.status === val}
                        onClick={() => void doChangeStatus(val)}
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold transition ${
                          thread.status === val
                            ? STATUS_COLORS_LIGHT[val] ?? ''
                            : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {l}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Prioriteti</p>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(PRIORITY_LABELS).map(([v, l]) => {
                    const val = Number(v)
                    return (
                      <button
                        key={v} type="button" disabled={actionBusy || thread.priority === val}
                        onClick={() => void doChangePriority(val)}
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold transition ${
                          thread.priority === val
                            ? PRIORITY_COLORS_LIGHT[val] ?? ''
                            : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {l}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Kategoria</p>
                <span className="inline-block rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  {CATEGORY_LABELS[thread.category] ?? 'Tjetër'}
                </span>
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Cakto agjentin</p>
                <div className="flex gap-1.5">
                  <input
                    value={assignInput}
                    onChange={(e) => setAssignInput(e.target.value)}
                    placeholder="User ID"
                    className="w-24 rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-900"
                  />
                  <button type="button" disabled={actionBusy} className={customerBtnGhostSm}
                    onClick={() => void doAssign()}
                  >
                    Cakto
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Shënim admin</p>
                <AdminNoteEditor
                  current={thread.adminNote}
                  busy={actionBusy}
                  onSave={(val) => void doUpdateNote(val)}
                />
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Audit trail</p>
                {auditLoading ? (
                  <p className="text-xs text-gray-400">Duke ngarkuar...</p>
                ) : auditTrail.length === 0 ? (
                  <p className="text-xs text-gray-400">Asnjë veprim ende.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {auditTrail.map((a) => (
                      <li key={a.id} className="text-[11px] leading-snug text-gray-600">
                        <span className="text-gray-400">{new Date(a.createdAtUtc).toLocaleString('sq-AL')}</span>
                        {' — '}
                        <span>{a.action}</span>
                        {' — '}
                        <span className="text-gray-400">{a.actorEmail}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
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
        placeholder="Shënim i brendshëm"
      />
      <button
        type="button"
        disabled={busy || draft === (current ?? '')}
        className={customerBtnGhostSm}
        onClick={() => onSave(draft.trim() || null)}
      >
        Ruaj shënimin
      </button>
    </div>
  )
}