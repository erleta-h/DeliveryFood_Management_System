import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { AdminEmptyState } from '../components/admin/AdminEmptyState'
import { AdminTableSkeleton } from '../components/admin/AdminSkeleton'
import {
  approvePartnerApplication,
  fetchPartnerApplications,
  rejectPartnerApplication,
  resetPartnerStaffPassword,
  type ApprovePartnerResult,
  type PartnerApplicationRow,
  type ResetPartnerStaffPasswordResult,
} from '../lib/adminApi'
import {
  adminFilterBtn,
  adminSuccessBanner,
  customerBtnGhost,
  customerBtnPrimary,
  customerCardMuted,
  customerField,
} from '../lib/adminTheme'
import { useAuthStore } from '../store/authStore'

const S_PENDING = 0
const S_CONTACTED = 1
const S_APPROVED = 2
const S_REJECTED = 9

type PartnerFilter = 'all' | 'pending' | 'contacted' | 'approved' | 'rejected'

function statusLabel(s: number): string {
  switch (s) {
    case S_PENDING:
      return 'Në pritje'
    case S_CONTACTED:
      return 'Kontaktuar'
    case S_APPROVED:
      return 'Miratuar'
    case S_REJECTED:
      return 'Refuzuar'
    default:
      return `Status ${s}`
  }
}

function statusBadgeClass(s: number): string {
  switch (s) {
    case S_PENDING:
      return 'bg-amber-100 text-amber-800'
    case S_CONTACTED:
      return 'bg-sky-100 text-sky-800'
    case S_APPROVED:
      return 'bg-emerald-100 text-emerald-800'
    case S_REJECTED:
      return 'bg-red-100 text-red-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

function matchesFilter(r: PartnerApplicationRow, filter: PartnerFilter) {
  switch (filter) {
    case 'pending':
      return r.status === S_PENDING
    case 'contacted':
      return r.status === S_CONTACTED
    case 'approved':
      return r.status === S_APPROVED
    case 'rejected':
      return r.status === S_REJECTED
    default:
      return true
  }
}

export default function AdminPartnerApplicationsPage() {
  const token = useAuthStore((s) => s.token)
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [filter, setFilter] = useState<PartnerFilter>('all')
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<PartnerApplicationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [lastApprove, setLastApprove] = useState<ApprovePartnerResult | null>(null)
  const [lastReset, setLastReset] = useState<ResetPartnerStaffPasswordResult | null>(null)
  const [resetPwDraft, setResetPwDraft] = useState<Record<number, string>>({})
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [resetAcknowledged, setResetAcknowledged] = useState<Record<number, boolean>>({})

  const pageSize = 20

  useEffect(() => {
    const t = window.setTimeout(() => setSearchDebounced(search), 300)
    return () => window.clearTimeout(t)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [searchDebounced, filter])

  const load = useCallback(async () => {
    if (!token) return
    setError(null)
    const list = await fetchPartnerApplications(token, {
      search: searchDebounced || undefined,
    })
    setRows(list)
  }, [token, searchDebounced])

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    let c = false
    setLoading(true)
    void load()
      .catch((e: unknown) => {
        if (!c) setError(e instanceof Error ? e.message : 'Gabim.')
      })
      .finally(() => {
        if (!c) setLoading(false)
      })
    return () => {
      c = true
    }
  }, [token, load])

  const filtered = useMemo(() => rows.filter((r) => matchesFilter(r, filter)), [rows, filter])
  const total = filtered.length
  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page])

  async function onApprove(id: number) {
    if (!token) return
    setActionMsg(null)
    setLastApprove(null)
    setLastReset(null)
    setBusyId(id)
    const r = await approvePartnerApplication(token, id)
    setBusyId(null)
    if (r.ok) {
      setLastApprove(r.data)
      setActionMsg(
        'Restoranti u krijua. Dërgo kredencialet partnerit përmes kanalit të sigurt (jo chat publik).',
      )
      await load()
    } else setActionMsg(r.message)
  }

  async function onResetStaffPassword(id: number) {
    if (!token) return
    setActionMsg(null)
    setLastApprove(null)
    setLastReset(null)
    setBusyId(id)
    const custom = resetPwDraft[id]?.trim()
    const r = await resetPartnerStaffPassword(token, id, custom ? custom : null)
    setBusyId(null)
    if (r.ok) {
      setLastReset(r.data)
      setResetPwDraft((d) => {
        const next = { ...d }
        delete next[id]
        return next
      })
      setResetAcknowledged((a) => {
        const next = { ...a }
        delete next[id]
        return next
      })
      setExpandedId(null)
      setActionMsg(
        'Fjalëkalimi u rivendos. Dërgo vlerën e re te partneri — sesionet e vjetra u anuluan.',
      )
    } else setActionMsg(r.message)
  }

  async function onReject(id: number) {
    if (!token) return
    if (!window.confirm('Të refuzohet ky aplikim?')) return
    setActionMsg(null)
    setBusyId(id)
    const r = await rejectPartnerApplication(token, id)
    setBusyId(null)
    if (r.ok) {
      setActionMsg('Aplikimi u shënua si refuzuar.')
      await load()
    } else setActionMsg(r.message)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Aplikimet partner</h1>
        <p className="mt-1 text-sm text-gray-500">
          Mirato aplikimet pas kontratës; krijohen restoranti dhe kredencialet e stafit.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="min-w-[200px] flex-1">
          <span className="mb-1 block text-xs text-gray-500">Kërko sipas emrit, qytetit ose emailit</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Venue, qytet, email…"
            className={customerField}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['all', 'Të gjithë'],
              ['pending', 'Në pritje'],
              ['contacted', 'Kontaktuar'],
              ['approved', 'Miratuar'],
              ['rejected', 'Refuzuar'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={adminFilterBtn(filter === key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {actionMsg ? <p className={adminSuccessBanner}>{actionMsg}</p> : null}
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {lastApprove ? (
        <div className={`${customerCardMuted} space-y-2 border-emerald-200 font-mono text-sm`}>
          <p className="text-xs font-sans font-semibold uppercase tracking-wide text-emerald-700">
            Kredencialet e krijuara (kopjo një herë)
          </p>
          <p>
            <span className="text-gray-500">Email:</span> {lastApprove.staffEmail}
          </p>
          <p>
            <span className="text-gray-500">Fjalëkalim:</span> {lastApprove.temporaryPassword}
          </p>
          <p>
            <span className="text-gray-500">Restoranti:</span> {lastApprove.restaurantName} ({lastApprove.restaurantSlug})
          </p>
        </div>
      ) : null}

      {lastReset ? (
        <div className={`${customerCardMuted} space-y-2 border-sky-200 font-mono text-sm`}>
          <p className="text-xs font-sans font-semibold uppercase tracking-wide text-sky-700">
            Fjalëkalimi i ri (kopjo dhe dërgo te partneri)
          </p>
          <p>
            <span className="text-gray-500">Email:</span> {lastReset.staffEmail}
          </p>
          <p>
            <span className="text-gray-500">Fjalëkalim:</span> {lastReset.newPassword}
          </p>
        </div>
      ) : null}

      {loading ? (
        <>
          <p className="text-sm text-gray-500">Duke ngarkuar aplikimet…</p>
          <AdminTableSkeleton rows={6} />
        </>
      ) : null}

      {!loading && total === 0 ? (
        <AdminEmptyState
          icon="📝"
          title="Nuk ka aplikime për këtë filtër"
          description="Kur një restorant aplikon nga faqja publike, shfaqet këtu për miratim."
        />
      ) : null}

      {!loading && total > 0 ? (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Restoranti</th>
                  <th className="px-4 py-3">Kontakti</th>
                  <th className="px-4 py-3">Statusi</th>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3 text-right">Veprime</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((r) => {
                  const canAct = r.status !== S_APPROVED && r.status !== S_REJECTED
                  const busy = busyId === r.id
                  const expanded = expandedId === r.id
                  return (
                    <Fragment key={r.id}>
                      <tr className="border-b border-gray-100 transition hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-700">
                              {(r.venueName[0] ?? '?').toUpperCase()}
                            </span>
                            <div>
                              <div className="font-medium text-gray-900">{r.venueName}</div>
                              <div className="text-xs text-gray-500">{r.city}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-gray-800">
                            {r.contactFirstName} {r.contactLastName}
                          </div>
                          <div className="text-xs text-gray-500">{r.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(r.status)}`}
                          >
                            {statusLabel(r.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                          {new Date(r.createdAtUtc).toLocaleString('sq-AL')}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap justify-end gap-2">
                            {canAct ? (
                              <>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void onApprove(r.id)}
                                  className={`${customerBtnPrimary} px-3 py-1.5 text-xs`}
                                >
                                  {busy ? '…' : 'Mirato'}
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void onReject(r.id)}
                                  className={`${customerBtnGhost} px-3 py-1.5 text-xs text-red-600`}
                                >
                                  Refuzo
                                </button>
                              </>
                            ) : null}
                            {r.status === S_APPROVED ? (
                              <button
                                type="button"
                                className={customerBtnGhost}
                                onClick={() => setExpandedId(expanded ? null : r.id)}
                              >
                                {expanded ? 'Mbyll' : 'Mbështetje'}
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                      {expanded && r.status === S_APPROVED ? (
                        <tr key={`${r.id}-detail`} className="border-b border-gray-100 bg-gray-50">
                          <td colSpan={5} className="px-4 py-4">
                            <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4">
                              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                                Rivendosje fjalëkalimi (mbështetje)
                              </p>
                              <p className="mt-1 max-w-prose text-xs leading-relaxed text-gray-600">
                                Vetëm kur partneri nuk arrin të kyçet dhe ka kërkuar zyrtarisht rivendosje.
                              </p>
                              <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-md border border-amber-200 bg-white px-3 py-2.5">
                                <input
                                  type="checkbox"
                                  className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                                  checked={resetAcknowledged[r.id] ?? false}
                                  onChange={(e) =>
                                    setResetAcknowledged((a) => ({
                                      ...a,
                                      [r.id]: e.target.checked,
                                    }))
                                  }
                                />
                                <span className="text-xs text-gray-700">
                                  Konfirmoj kërkesën e dokumentuar për humbje aksesi.
                                </span>
                              </label>
                              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                                <div className="min-w-0 flex-1">
                                  <label
                                    htmlFor={`rpw-${r.id}`}
                                    className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-gray-500"
                                  >
                                    Fjalëkalim i ri (opsional)
                                  </label>
                                  <input
                                    id={`rpw-${r.id}`}
                                    type="password"
                                    autoComplete="new-password"
                                    value={resetPwDraft[r.id] ?? ''}
                                    onChange={(e) =>
                                      setResetPwDraft((d) => ({
                                        ...d,
                                        [r.id]: e.target.value,
                                      }))
                                    }
                                    disabled={!resetAcknowledged[r.id]}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 disabled:cursor-not-allowed disabled:opacity-45"
                                    placeholder="Bosh = gjenero automatikisht"
                                  />
                                </div>
                                <button
                                  type="button"
                                  disabled={busy || !resetAcknowledged[r.id]}
                                  onClick={() => void onResetStaffPassword(r.id)}
                                  className={`${customerBtnPrimary} shrink-0 px-3 py-2 text-xs disabled:opacity-40`}
                                >
                                  {busy ? '…' : 'Rivendos'}
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              Faqja {page} · {total} total
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className={customerBtnGhost}
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← Mëparshme
              </button>
              <button
                type="button"
                className={customerBtnGhost}
                disabled={page * pageSize >= total}
                onClick={() => setPage((p) => p + 1)}
              >
                Tjetër →
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
